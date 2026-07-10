import fs from "fs";
import { generateNarrative } from "./narrative.js";

export async function handleMatchFinished(fixtureId, state, oddsHistory, homeTeam, awayTeam) {
  console.log(`\n=== MATCH FINISHED (${state.gamePhase}) ===`);
  console.log(`Final score: ${homeTeam} ${state.scoreHome} - ${state.scoreAway} ${awayTeam}`);

  console.log("\nGenerating narrative...");
  try {
    const narrative = await generateNarrative(state, oddsHistory, homeTeam, awayTeam);

    const narrativeRecord = {
      fixtureId,
      ...narrative,
    };

    fs.writeFileSync(
      `./data/narrative-${fixtureId}.json`,
      JSON.stringify(narrativeRecord, null, 2)
    );

    console.log("\n=== NARRATIVE ===\n");
    console.log(narrative.narrativeText);
    console.log(`\nSaved to data/narrative-${fixtureId}.json`);

    console.log("\n[TODO] Trigger prediction scoring here");

    return narrativeRecord;
  } catch (err) {
    console.error("Narrative generation failed:", err.response?.data || err.message);
    throw err;
  }
}
