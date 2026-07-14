import "dotenv/config";
import { generateNarratives } from "./lib/narrative.js";
import { scorePrediction, buildComparisonSummary } from "./lib/scoring.js";

// Exercises the two pure pieces of the match-finish flow (narrative
// generation + prediction scoring) with fake data, without touching the
// database. finalizeMatch itself persists to Supabase, so it needs a
// real seeded match - this test stays fully isolated.

const fakeFinishedState = {
  fixtureId: 99999999,
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
  fixtureId: 99999999,
  snapshots: [],
  flaggedMoments: [
    { caption: "Market shifted toward Morocco (61.1% -> 38.0%) after the opener" },
    { caption: "Market shifted hard toward France (45.0% -> 78.5%) after the red card" },
  ],
};

const fakeExtractedPrediction = {
  winner: "home",
  scoreHome: 2,
  scoreAway: 0,
  mentionedEvents: ["red_card"],
};

async function main() {
  console.log("Simulating match-finish narrative + scoring with fake data...\n");

  const scoreResult = scorePrediction(fakeExtractedPrediction, fakeFinishedState);
  const summary = buildComparisonSummary(fakeExtractedPrediction, fakeFinishedState, scoreResult);
  console.log("=== SCORING ===");
  console.log(`Accuracy: ${scoreResult.accuracyPct}%`);
  console.log("Breakdown:", JSON.stringify(scoreResult.scoreBreakdown));
  console.log(`Summary: ${summary}\n`);

  const narratives = await generateNarratives(fakeFinishedState, fakeOddsHistory, "France", "Morocco");
  console.log("=== FUN RECAP ===\n");
  console.log(narratives.funRecap);
  console.log("\n=== MARKET NARRATIVE ===\n");
  console.log(narratives.marketNarrative);

  console.log("\n\n=== TEST COMPLETE ===");
  console.log("Generated:", narratives.modelUsed, narratives.generatedAt);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
