import "dotenv/config";
import axios from "axios";
import fs from "fs";
import { createInitialState, parseScoreUpdate } from "./lib/scores-parser.js";
import { isFinished, isDead } from "./lib/game-phase.js";
import { computeImpliedPct, isSignificantMove, buildMoveCaption } from "./lib/odds-detector.js";
import { loadState, saveState } from "./lib/state-store.js";
import { loadOddsHistory, saveOddsHistory } from "./lib/odds-store.js";
import { generateNarrative } from "./lib/narrative.js";

const apiOrigin = "https://txline-dev.txodds.com";
const apiBaseUrl = `${apiOrigin}/api`;

const credentials = JSON.parse(fs.readFileSync("./txline-credentials.json", "utf8"));
const { jwt, apiToken } = credentials;

const headers = {
  Authorization: `Bearer ${jwt}`,
  "X-Api-Token": apiToken,
};

// --- Config ---
const FIXTURE_ID = 18209181; // France vs Morocco
const HOME_TEAM = "France";
const AWAY_TEAM = "Morocco";
const POLL_INTERVAL_MS = 30000; // 30 seconds

let pollTimer = null;

async function fetchScores(fixtureId) {
  const res = await axios.get(`${apiBaseUrl}/scores/snapshot/${fixtureId}`, { headers });
  return res.data;
}

async function fetchOdds(fixtureId) {
  const res = await axios.get(`${apiBaseUrl}/odds/snapshot/${fixtureId}`, { headers });
  return res.data;
}

function processOdds(fixtureId, oddsPayloads) {
  const history = loadOddsHistory(fixtureId);

  const mainMarket = oddsPayloads.find((o) => o.SuperOddsType === "1X2_PARTICIPANT_RESULT");
  if (!mainMarket) return history;

  const current = computeImpliedPct(mainMarket);
  if (!current) return history;

  const previous = history.snapshots.length > 0
    ? history.snapshots[history.snapshots.length - 1]
    : null;

  history.snapshots.push(current);

  if (isSignificantMove(previous, current)) {
    const caption = buildMoveCaption(previous, current, HOME_TEAM, AWAY_TEAM);
    history.flaggedMoments.push({ ...current, caption });
    console.log(`[ODDS] Significant move flagged: ${caption}`);
  }

  saveOddsHistory(fixtureId, history);
  return history;
}

async function handleMatchFinished(state) {
  console.log(`\n=== MATCH FINISHED (${state.gamePhase}) ===`);
  console.log(`Final score: ${HOME_TEAM} ${state.scoreHome} - ${state.scoreAway} ${AWAY_TEAM}`);

  const oddsHistory = loadOddsHistory(FIXTURE_ID);

  console.log("\nGenerating narrative...");
  try {
    const narrative = await generateNarrative(state, oddsHistory, HOME_TEAM, AWAY_TEAM);

    const narrativeRecord = {
      fixtureId: FIXTURE_ID,
      ...narrative,
    };

    fs.writeFileSync(
      `./data/narrative-${FIXTURE_ID}.json`,
      JSON.stringify(narrativeRecord, null, 2)
    );

    console.log("\n=== NARRATIVE ===\n");
    console.log(narrative.narrativeText);
    console.log(`\nSaved to data/narrative-${FIXTURE_ID}.json`);
  } catch (err) {
    console.error("Narrative generation failed:", err.response?.data || err.message);
  }

  // Scoring (prediction accuracy) plugs in here next, once we build that module.
  console.log("\n[TODO] Trigger prediction scoring here");
}

async function pollOnce() {
  const timestamp = new Date().toISOString();
  console.log(`\n--- Poll at ${timestamp} ---`);

  let state = loadState(FIXTURE_ID, createInitialState);
  const previousPhase = state.gamePhase;

  try {
    const rawMessages = await fetchScores(FIXTURE_ID);
    state = parseScoreUpdate(state, rawMessages);
    saveState(FIXTURE_ID, state);

    console.log(`[SCORES] Phase: ${state.gamePhase} (${state.gamePhaseName}) | Score: ${state.scoreHome}-${state.scoreAway} | Events: ${state.events.length}`);

    if (state.gamePhase !== previousPhase) {
      console.log(`[PHASE CHANGE] ${previousPhase} -> ${state.gamePhase}`);
    }
  } catch (err) {
    console.error("[SCORES] Fetch failed:", err.response?.status || err.message);
  }

  if (!isFinished(state.gamePhase) && !isDead(state.gamePhase)) {
    try {
      const oddsPayloads = await fetchOdds(FIXTURE_ID);
      processOdds(FIXTURE_ID, oddsPayloads);
    } catch (err) {
      console.error("[ODDS] Fetch failed:", err.response?.status || err.message);
    }
  }

  if (isFinished(state.gamePhase)) {
    stopPolling();
    await handleMatchFinished(state);
    return;
  }

  if (isDead(state.gamePhase)) {
    console.log(`\n=== MATCH ${state.gamePhase} — stopping poll, no scoring applicable ===`);
    stopPolling();
    return;
  }
}

function startPolling() {
  console.log(`Starting poll worker for fixture ${FIXTURE_ID} (${HOME_TEAM} vs ${AWAY_TEAM})`);
  console.log(`Polling every ${POLL_INTERVAL_MS / 1000}s. Press Ctrl+C to stop.\n`);
  pollOnce();
  pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  console.log("\nPolling stopped.");
}

process.on("SIGINT", () => {
  console.log("\nReceived interrupt, stopping...");
  stopPolling();
  process.exit(0);
});

startPolling();
