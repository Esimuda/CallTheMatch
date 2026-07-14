import "dotenv/config";
import axios from "axios";
import { createInitialState, parseScoreUpdate } from "./lib/scores-parser.js";
import { isFinished } from "./lib/game-phase.js";
import { finalizeMatch } from "./lib/match-finish.js";
import * as db from "./lib/db.js";
import { apiBaseUrl, txlineHeaders } from "./lib/txline.js";

// One-shot sync: brings every seeded match's phase/score up to date with
// reality right now, regardless of whether poll-worker.js has ever been run
// against it. Safe to run anytime - existing narratives are not regenerated
// and already-scored predictions are left alone.
async function syncMatch(match) {
  console.log(`\nSyncing ${match.home_team} vs ${match.away_team} (${match.id})...`);

  let rawMessages;
  try {
    const res = await axios.get(`${apiBaseUrl}/scores/snapshot/${match.id}`, {
      headers: txlineHeaders(),
      params: { Ts: 0 },
    });
    rawMessages = res.data;
  } catch (err) {
    console.log(`  Fetch failed: ${err.response?.status || err.message}`);
    return;
  }

  if (!rawMessages || rawMessages.length === 0) {
    console.log(`  No data yet - match likely hasn't started.`);
    return;
  }

  let state = createInitialState(match.id);
  state = parseScoreUpdate(state, rawMessages);

  console.log(`  Phase: ${state.gamePhase} | Score: ${state.scoreHome}-${state.scoreAway}`);

  if (isFinished(state.gamePhase)) {
    await finalizeMatch(match, state);
    return;
  }

  await db.updateMatchState(match.id, {
    game_phase: state.gamePhase,
    score_home: state.scoreHome,
    score_away: state.scoreAway,
  });
}

async function main() {
  const matches = await db.getMatches();
  console.log(`Found ${matches.length} matches to sync.`);

  for (const match of matches) {
    await syncMatch(match);
  }

  console.log("\nSync complete.");
}

main().catch((err) => {
  console.error("Sync failed:", err.response?.data || err.message);
  process.exit(1);
});
