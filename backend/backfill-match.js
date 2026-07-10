import "dotenv/config";
import axios from "axios";
import fs from "fs";
import { createInitialState, parseScoreUpdate } from "./lib/scores-parser.js";
import { isFinished } from "./lib/game-phase.js";
import { computeImpliedPct, isSignificantMove, buildMoveCaption } from "./lib/odds-detector.js";
import { saveState } from "./lib/state-store.js";
import { saveOddsHistory } from "./lib/odds-store.js";
import { handleMatchFinished } from "./lib/match-finish.js";

const apiOrigin = "https://txline-dev.txodds.com";
const apiBaseUrl = `${apiOrigin}/api`;

const credentials = JSON.parse(fs.readFileSync("./txline-credentials.json", "utf8"));
const { jwt, apiToken } = credentials;

const headers = {
  Authorization: `Bearer ${jwt}`,
  "X-Api-Token": apiToken,
};

// --- Configure the finished match to backfill here ---
const FIXTURE_ID = 18193785; // USA vs Belgium, 8th Finals
const HOME_TEAM = "USA";
const AWAY_TEAM = "Belgium";
const KICKOFF_TS = 1783382400000;
const ODDS_SAMPLE_COUNT = 12; // how many points across the match to sample odds at
const MATCH_DURATION_MS = 105 * 60 * 1000; // ~105 min covers full time + stoppage, adjust if needed

async function fetchAllScores(fixtureId) {
  const res = await axios.get(`${apiBaseUrl}/scores/snapshot/${fixtureId}`, {
    headers,
    params: { Ts: 0 },
  });
  return res.data;
}

async function fetchOddsAt(fixtureId, asOf) {
  try {
    const res = await axios.get(`${apiBaseUrl}/odds/snapshot/${fixtureId}`, {
      headers,
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
    const oddsPayloads = await fetchOddsAt(fixtureId, asOf);
    const mainMarket = oddsPayloads.find((o) => o.SuperOddsType === "1X2_PARTICIPANT_RESULT");
    if (!mainMarket) continue;

    const current = computeImpliedPct(mainMarket);
    if (!current) continue;

    const previous = history.snapshots.length > 0
      ? history.snapshots[history.snapshots.length - 1]
      : null;

    history.snapshots.push(current);
    console.log(`  minute ~${Math.round((i * stepMs) / 60000)}: home ${current.homeWinPct}% / draw ${current.drawPct}% / away ${current.awayWinPct}%`);

    if (isSignificantMove(previous, current)) {
      const caption = buildMoveCaption(previous, current, HOME_TEAM, AWAY_TEAM);
      history.flaggedMoments.push({ ...current, caption });
      console.log(`    -> FLAGGED: ${caption}`);
    }
  }

  saveOddsHistory(fixtureId, history);
  return history;
}

async function backfillScores(fixtureId) {
  console.log(`Fetching full score history for fixture ${fixtureId}...`);
  const rawMessages = await fetchAllScores(fixtureId);
  console.log(`Retrieved ${rawMessages.length} raw messages.`);

  let state = createInitialState(fixtureId);
  state = parseScoreUpdate(state, rawMessages);
  saveState(fixtureId, state);

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
  const oddsHistory = await backfillOdds(FIXTURE_ID);

  if (isFinished(finalState.gamePhase)) {
    console.log(`\n${"=".repeat(60)}`);
    await handleMatchFinished(FIXTURE_ID, finalState, oddsHistory, HOME_TEAM, AWAY_TEAM);
  } else {
    console.log(`\nMatch phase is "${finalState.gamePhase}" - not finished, skipping narrative generation.`);
    console.log("Pick a fixture that has actually concluded to test the full flow.");
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err.response?.data || err.message);
  process.exit(1);
});
