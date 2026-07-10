import "dotenv/config";
import { generateNarrative } from "./lib/narrative.js";

const fakeMatchState = {
  scoreHome: 2,
  scoreAway: 1,
  events: [
    { type: "goal", participant: 2, minuteSeconds: 2340, scoreHome: 0, scoreAway: 1 },
    { type: "goal", participant: 1, minuteSeconds: 1620, scoreHome: 1, scoreAway: 1 },
    { type: "red_card", participant: 2, minuteSeconds: 1080, cardType: "StraightRed" },
    { type: "goal", participant: 1, minuteSeconds: 300, scoreHome: 2, scoreAway: 1 },
  ],
};

const fakeOddsHistory = {
  flaggedMoments: [
    { caption: "Market shifted toward Morocco (61.1% -> 38.0%) after the opener" },
    { caption: "Market shifted hard toward France (45.0% -> 78.5%) after the red card" },
  ],
};

async function main() {
  console.log("Generating test narrative...\n");
  const result = await generateNarrative(fakeMatchState, fakeOddsHistory, "France", "Morocco");
  console.log("=== NARRATIVE ===\n");
  console.log(result.narrativeText);
  console.log("\n=== METADATA ===");
  console.log("Generated at:", result.generatedAt);
  console.log("Model:", result.modelUsed);
}

main().catch((err) => {
  console.error("Error:", err.response?.data || err.message);
  process.exit(1);
});
