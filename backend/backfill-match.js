import "dotenv/config";
import axios from "axios";
import * as db from "./lib/db.js";
import { createInitialState, parseScoreUpdate } from "./lib/scores-parser.js";
import { isFinished } from "./lib/game-phase.js";
import { computeImpliedPct, isSignificantMove, buildMoveCaption } from "./lib/odds-detector.js";
import { finalizeMatch } from "./lib/match-finish.js";
import { apiBaseUrl, txlineHeaders } from "./lib/txline.js";

// --- Configure the finished match to backfill here ---
const FIXTURE_ID = 18193785; // USA vs Belgium, 8th Finals
const HOME_TEAM = "USA";
const AWAY_TEAM = "Belgium";
const KICKOFF_TS = 1783382400000;
const ODDS_SAMPLE_COUNT = 12; // how many points across the match to sample odds at
const MATCH_DURATION_MS = 105 * 60 * 1000; // ~105 min covers full time + stoppage, adjust if needed

async function fetchAllScores(fixtureId) {
  const res = await axios.get(`${apiBaseUrl}/scores/snapshot/${fixtureId}`, {
    headers: txlineHeaders(),
    params: { Ts: 0 },
  });
  return res.data;
}

async function fetchOddsAt(fixtureId, asOf) {
  try {
    const res = await axios.get(`${apiBaseUrl}/odds/snapshot/${fixtureId}`, {
      headers: txlineHeaders(),
      params: { asOf },
    });
    return res.data;
  } catch (err) {
    console.log(`  odds fetch failed at asOf=${asOf}:`, err.response?.status);
    return [];
  }
}

async function backfillOdds(fixtureId) {
  console.log(`\nSampling odds at ${ODDS_SAMPLE_COUNT} points across the match...`);
  const history = { fixtureId, snapshots: [], flaggedMoments: [] };

  const stepMs = MATCH_DURATION_MS / ODDS_SAMPLE_COUNT;

  for (let i = 0; i <= ODDS_SAMPLE_COUNT; i++) {
    const asOf = KICKOFF_TS + i * stepMs;
    const minute = Math.round((i * stepMs) / 60000);
    const oddsPayloads = await fetchOddsAt(fixtureId, asOf);
    const mainMarket = oddsPayloads.find((o) => o.SuperOddsType === "1X2_PARTICIPANT_RESULT");
    if (!mainMarket) continue;

    const current = computeImpliedPct(mainMarket);
    if (!current) continue;

    const previous = history.snapshots.length > 0
      ? history.snapshots[history.snapshots.length - 1]
      : null;

    history.snapshots.push(current);
    console.log(`  minute ~${minute}: home ${current.homeWinPct}% / draw ${current.drawPct}% / away ${current.awayWinPct}%`);

    const significant = isSignificantMove(previous, current);
    let caption = null;
    if (significant) {
      caption = buildMoveCaption(previous, current, HOME_TEAM, AWAY_TEAM);
      history.flaggedMoments.push({ ...current, minute, caption });
      console.log(`    -> FLAGGED: ${caption}`);
    }

    await db.saveOddsSnapshot({
      match_id: String(fixtureId),
      minute,
      home_win_pct: current.homeWinPct,
      draw_pct: current.drawPct,
      away_win_pct: current.awayWinPct,
      ts: current.ts ?? asOf,
      is_significant: significant,
      caption,
    });
  }

  return history;
}

async function backfillScores(fixtureId) {
  console.log(`Fetching full score history for fixture ${fixtureId}...`);
  const rawMessages = await fetchAllScores(fixtureId);
  console.log(`Retrieved ${rawMessages.length} raw messages.`);

  let state = createInitialState(fixtureId);
  state = parseScoreUpdate(state, rawMessages);

  console.log(`\nFinal state after replay:`);
  console.log(`  Phase: ${state.gamePhase} (${state.gamePhaseName})`);
  console.log(`  Score: ${HOME_TEAM} ${state.scoreHome} - ${state.scoreAway} ${AWAY_TEAM}`);
  console.log(`  Events captured: ${state.events.length}`);
  state.events.forEach((e) => console.log(`    - ${e.type}`, JSON.stringify(e)));

  return state;
}

async function main() {
  console.log(`=== Backfilling ${HOME_TEAM} vs ${AWAY_TEAM} (fixture ${FIXTURE_ID}) ===\n`);

  const finalState = await backfillScores(FIXTURE_ID);
  await backfillOdds(FIXTURE_ID);

  if (isFinished(finalState.gamePhase)) {
    console.log(`\n${"=".repeat(60)}`);
    // finalizeMatch persists final state, narratives, and prediction scores.
    await finalizeMatch(
      { id: String(FIXTURE_ID), home_team: HOME_TEAM, away_team: AWAY_TEAM },
      finalState
    );
  } else {
    await db.updateMatchState(String(FIXTURE_ID), {
      game_phase: finalState.gamePhase,
      score_home: finalState.scoreHome,
      score_away: finalState.scoreAway,
    });
    console.log(`\nMatch phase is "${finalState.gamePhase}" - not finished, skipping narrative generation.`);
    console.log("Pick a fixture that has actually concluded to test the full flow.");
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err.response?.data || err.message);
  process.exit(1);
});
