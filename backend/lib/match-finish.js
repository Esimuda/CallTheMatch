import * as db from "./db.js";
import { generateNarratives } from "./narrative.js";
import { scorePrediction, buildComparisonSummary } from "./scoring.js";

// Everything that must happen exactly once when a match reaches a finished
// phase: persist the final state, generate + store the narratives, and score
// every prediction for the match. Scoring here (instead of lazily when each
// user opens their result screen) means room and global rankings are complete
// immediately, not just for users who happened to check first.
export async function finalizeMatch(match, state) {
  console.log(`\n=== MATCH FINISHED (${state.gamePhase}) ===`);
  console.log(`Final score: ${match.home_team} ${state.scoreHome} - ${state.scoreAway} ${match.away_team}`);

  await db.updateMatchState(match.id, {
    game_phase: state.gamePhase,
    score_home: state.scoreHome,
    score_away: state.scoreAway,
  });

  await generateAndSaveNarratives(match, state);
  await scoreAllPredictions(match.id, state);
}

async function generateAndSaveNarratives(match, state) {
  const existing = await db.getNarrative(match.id);
  if (existing) {
    console.log("Narrative already exists, skipping regeneration.");
    return;
  }

  const snapshots = await db.getOddsHistory(match.id);
  const flaggedMoments = snapshots
    .filter((s) => s.is_significant)
    .map((s) => ({ minute: s.minute, caption: s.caption }));

  console.log("Generating narratives...");
  try {
    const narratives = await generateNarratives(state, { flaggedMoments }, match.home_team, match.away_team);
    await db.saveNarrative(match.id, {
      fun_recap: narratives.funRecap,
      market_narrative: narratives.marketNarrative,
    });
    console.log("Narratives saved.");
  } catch (err) {
    // Don't let a narrative failure block prediction scoring - the result
    // screen degrades gracefully without a recap, but not without a score.
    console.error("Narrative generation failed:", err.response?.data || err.message);
  }
}

export async function scoreAllPredictions(matchId, state) {
  const predictions = await db.getUnscoredPredictionsByMatch(matchId);
  if (predictions.length === 0) {
    console.log("No unscored predictions for this match.");
    return;
  }

  console.log(`Scoring ${predictions.length} prediction(s)...`);
  for (const prediction of predictions) {
    const extracted = {
      winner: prediction.extracted_winner,
      scoreHome: prediction.extracted_score_home,
      scoreAway: prediction.extracted_score_away,
      mentionedEvents: prediction.extracted_events || [],
    };

    const scoreResult = scorePrediction(extracted, state);
    const comparisonSummary = buildComparisonSummary(extracted, state, scoreResult);

    await db.updatePredictionResult(prediction.id, {
      accuracy_pct: scoreResult.accuracyPct,
      comparison_summary: comparisonSummary,
      score_breakdown: scoreResult.scoreBreakdown,
    });
  }
  console.log("All predictions scored.");
}
