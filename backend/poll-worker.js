import "dotenv/config";
import axios from "axios";
import { createInitialState, parseScoreUpdate } from "./lib/scores-parser.js";
import { isFinished, isDead } from "./lib/game-phase.js";
import { computeImpliedPct, isSignificantMove, buildMoveCaption } from "./lib/odds-detector.js";
import { finalizeMatch } from "./lib/match-finish.js";
import { syncFixturesFromFeed } from "./lib/fixture-sync.js";
import * as db from "./lib/db.js";
import { apiBaseUrl, txlineHeaders } from "./lib/txline.js";

const POLL_INTERVAL_MS = 30000; // 30 seconds - scores/odds for live matches
const FIXTURE_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes - discover new fixtures
// Don't poll fixtures that are still far from kickoff.
const PREMATCH_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Parser state per fixture, in memory only. We fetch the full score history
// (Ts: 0) every poll, so a restart just replays all messages and rebuilds
// identical state - no need to persist it.
const stateByFixture = new Map();

let lastFixtureSyncAt = 0;

async function maybeSyncFixtures(force = false) {
  if (!force && Date.now() - lastFixtureSyncAt < FIXTURE_SYNC_INTERVAL_MS) return;
  try {
    await syncFixturesFromFeed();
    lastFixtureSyncAt = Date.now();
  } catch (err) {
    console.error("[fixtures] Sync failed:", err.response?.status || err.message);
  }
}

async function fetchScores(fixtureId) {
  const res = await axios.get(`${apiBaseUrl}/scores/snapshot/${fixtureId}`, {
    headers: txlineHeaders(),
    params: { Ts: 0 },
  });
  return res.data;
}

async function fetchOdds(fixtureId) {
  const res = await axios.get(`${apiBaseUrl}/odds/snapshot/${fixtureId}`, {
    headers: txlineHeaders(),
  });
  return res.data;
}

function snapshotToImpliedPct(row) {
  if (!row) return null;
  return {
    homeWinPct: row.home_win_pct === null ? null : parseFloat(row.home_win_pct),
    drawPct: row.draw_pct === null ? null : parseFloat(row.draw_pct),
    awayWinPct: row.away_win_pct === null ? null : parseFloat(row.away_win_pct),
    ts: Number(row.ts),
  };
}

async function processOdds(match, state) {
  const oddsPayloads = await fetchOdds(match.id);
  const mainMarket = oddsPayloads.find((o) => o.SuperOddsType === "1X2_PARTICIPANT_RESULT");
  if (!mainMarket) return;

  const current = computeImpliedPct(mainMarket);
  if (!current) return;

  const previous = snapshotToImpliedPct(await db.getLatestOddsSnapshot(match.id));

  // The odds snapshot endpoint returns the latest prices on every poll; only
  // store a new row when the feed actually published an update.
  if (previous && previous.ts === current.ts) return;

  const significant = isSignificantMove(previous, current);
  const caption = significant
    ? buildMoveCaption(previous, current, match.home_team, match.away_team)
    : null;

  await db.saveOddsSnapshot({
    match_id: match.id,
    minute: state.clockSeconds !== null ? Math.round(state.clockSeconds / 60) : null,
    home_win_pct: current.homeWinPct,
    draw_pct: current.drawPct,
    away_win_pct: current.awayWinPct,
    ts: current.ts,
    is_significant: significant,
    caption,
  });

  if (significant) {
    console.log(`  [ODDS] Significant move flagged: ${caption}`);
  }
}

async function pollMatch(match) {
  let state = stateByFixture.get(match.id) || createInitialState(match.id);
  const previousPhase = state.gamePhase;

  try {
    const rawMessages = await fetchScores(match.id);
    state = parseScoreUpdate(state, rawMessages);
    stateByFixture.set(match.id, state);
  } catch (err) {
    console.error(`  [SCORES] Fetch failed for ${match.id}:`, err.response?.status || err.message);
    return;
  }

  console.log(`  ${match.home_team} vs ${match.away_team}: ${state.gamePhase} | ${state.scoreHome}-${state.scoreAway}`);

  if (state.gamePhase !== previousPhase) {
    console.log(`  [PHASE CHANGE] ${previousPhase} -> ${state.gamePhase}`);
  }

  if (isFinished(state.gamePhase)) {
    await finalizeMatch(match, state);
    return;
  }

  if (isDead(state.gamePhase)) {
    console.log(`  Match is ${state.gamePhase} - no scoring applicable.`);
    await db.updateMatchState(match.id, {
      game_phase: state.gamePhase,
      score_home: state.scoreHome,
      score_away: state.scoreAway,
    });
    return;
  }

  if (state.gamePhase !== match.game_phase ||
      state.scoreHome !== match.score_home ||
      state.scoreAway !== match.score_away) {
    await db.updateMatchState(match.id, {
      game_phase: state.gamePhase,
      score_home: state.scoreHome,
      score_away: state.scoreAway,
    });
  }

  try {
    await processOdds(match, state);
  } catch (err) {
    console.error(`  [ODDS] Fetch failed for ${match.id}:`, err.response?.status || err.message);
  }
}

function shouldPoll(match) {
  if (isFinished(match.game_phase) || isDead(match.game_phase)) return false;
  if (match.game_phase !== "NS") return true;
  return new Date(match.kickoff_time).getTime() - Date.now() <= PREMATCH_WINDOW_MS;
}

let polling = false;

async function pollOnce() {
  if (polling) return; // previous cycle still running
  polling = true;

  try {
    // Discover newly scheduled World Cup fixtures (and refresh kickoffs)
    // without clobbering live scores. Runs on startup + every 30 minutes.
    await maybeSyncFixtures();

    const matches = await db.getMatches();
    const active = matches.filter(shouldPoll);

    console.log(`\n--- Poll at ${new Date().toISOString()} (${active.length} active match(es)) ---`);

    for (const match of active) {
      await pollMatch(match);
    }
  } catch (err) {
    console.error("Poll cycle failed:", err.response?.data || err.message);
  } finally {
    polling = false;
  }
}

console.log(`Starting poll worker. Scores every ${POLL_INTERVAL_MS / 1000}s; fixtures every ${FIXTURE_SYNC_INTERVAL_MS / 60000}m.`);
maybeSyncFixtures(true).finally(function () {
  pollOnce();
  const pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);

  process.on("SIGINT", () => {
    console.log("\nReceived interrupt, stopping...");
    clearInterval(pollTimer);
    process.exit(0);
  });
});
