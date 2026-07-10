import "dotenv/config";
import { extractPrediction } from "./lib/prediction-extractor.js";

const testCases = [
  "I think France wins 2-1, Mbappe scores, maybe a red card for Morocco in the second half",
  "Morocco upset, 1-0, defensive masterclass",
  "Not sure honestly, could go either way, maybe a draw",
  "France dominates, 3-0, hat trick incoming",
  "Belgium wins comfortably",
];

async function main() {
  for (const text of testCases) {
    console.log(`\n--- Input: "${text}" ---`);
    try {
      const result = await extractPrediction(text, "France", "Morocco");
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error("FAILED:", err.message);
    }
  }
}

main();
