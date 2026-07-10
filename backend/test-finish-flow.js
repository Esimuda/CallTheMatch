import "dotenv/config";
import { handleMatchFinished } from "./lib/match-finish.js";
import { saveOddsHistory } from "./lib/odds-store.js";

const TEST_FIXTURE_ID = 99999999; // fake ID, isolated from real data

const fakeFinishedState = {
  fixtureId: TEST_FIXTURE_ID,
  gamePhase: "F",
  gamePhaseName: "Finished (Full-Time)",
  scoreHome: 2,
  scoreAway: 1,
  lastProcessedId: 10,
  events: [
    { type: "kickoff", ts: 1000 },
    { type: "status", phase: "H1", phaseName: "1st Half", ts: 1001 },
    { type: "goal", participant: 2, playerId: 111, minuteSeconds: 2340, scoreHome: 0, scoreAway: 1, ts: 2000 },
    { type: "goal", participant: 1, playerId: 222, minuteSeconds: 1620, scoreHome: 1, scoreAway: 1, ts: 3000 },
    { type: "red_card", participant: 2, playerId: 333, cardType: "StraightRed", minuteSeconds: 1080, ts: 4000 },
    { type: "goal", participant: 1, playerId: 444, minuteSeconds: 300, scoreHome: 2, scoreAway: 1, ts: 5000 },
    { type: "status", phase: "F", phaseName: "Finished (Full-Time)", ts: 6000 },
  ],
};

const fakeOddsHistory = {
  fixtureId: TEST_FIXTURE_ID,
  snapshots: [],
  flaggedMoments: [
    { caption: "Market shifted toward Morocco (61.1% -> 38.0%) after the opener" },
    { caption: "Market shifted hard toward France (45.0% -> 78.5%) after the red card" },
  ],
};

async function main() {
  saveOddsHistory(TEST_FIXTURE_ID, fakeOddsHistory);

  console.log("Simulating full match-finish flow with fake data...\n");
  const result = await handleMatchFinished(
    TEST_FIXTURE_ID,
    fakeFinishedState,
    fakeOddsHistory,
    "France",
    "Morocco"
  );

  console.log("\n\n=== TEST COMPLETE ===");
  console.log("Narrative record returned:", result.fixtureId, result.modelUsed, result.generatedAt);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
