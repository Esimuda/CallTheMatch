// Compares an extracted prediction against the real match outcome.
// Deterministic, rule-based - no AI call needed for scoring itself, which
// keeps this fast, free, and fully explainable (matches the original
// schematic design: scoring should be a rubric users can trust, not a
// black-box AI judgment call).

function actualWinner(scoreHome, scoreAway) {
  if (scoreHome > scoreAway) return "home";
  if (scoreAway > scoreHome) return "away";
  return "draw";
}

function actualEventTags(matchState) {
  const tags = new Set();
  if (matchState.events.some((e) => e.type === "red_card")) tags.add("red_card");
  if (["ET1", "HTET", "ET2", "WPE", "PE", "FET", "FPE"].includes(matchState.gamePhase)) {
    tags.add("extra_time");
  }
  return Array.from(tags);
}

export function scorePrediction(extracted, matchState) {
  const winner = actualWinner(matchState.scoreHome, matchState.scoreAway);
  const actualEvents = actualEventTags(matchState);

  let earnedPoints = 0;
  let maxPoints = 0;

  const winnerCorrect = extracted.winner !== null && extracted.winner === winner;
  if (extracted.winner !== null) {
    maxPoints += 40;
    if (winnerCorrect) earnedPoints += 40;
  }

  const hasScoreline = extracted.scoreHome !== null && extracted.scoreAway !== null;
  const scorelineCorrect =
    hasScoreline &&
    extracted.scoreHome === matchState.scoreHome &&
    extracted.scoreAway === matchState.scoreAway;

  if (hasScoreline) {
    maxPoints += 30;
    if (scorelineCorrect) {
      earnedPoints += 30;
    } else if (winnerCorrect) {
      // Partial credit for calling the right winner but wrong scoreline
      earnedPoints += 10;
    }
  }

  const mentionedEventsHit = [];
  const mentionedEventsMissed = [];
  if (extracted.mentionedEvents && extracted.mentionedEvents.length > 0) {
    maxPoints += 15;
    let hits = 0;
    extracted.mentionedEvents.forEach((tag) => {
      if (actualEvents.includes(tag)) {
        hits += 1;
        mentionedEventsHit.push(tag);
      } else {
        mentionedEventsMissed.push(tag);
      }
    });
    earnedPoints += 15 * (hits / extracted.mentionedEvents.length);
  }

  const accuracyPct = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

  return {
    accuracyPct,
    scoreBreakdown: {
      winnerCorrect,
      scorelineCorrect,
      mentionedEventsHit,
      mentionedEventsMissed,
    },
    actualWinner: winner,
  };
}

// Builds a short, templated (non-AI, deterministic) human-readable summary
// from the scoring breakdown - cheap, fast, and fully predictable.
export function buildComparisonSummary(extracted, matchState, scoreResult) {
  const b = scoreResult.scoreBreakdown;
  const parts = [];

  if (b.winnerCorrect) {
    parts.push("You called the winner right");
  } else if (extracted.winner !== null) {
    parts.push("You didn't call the right winner this time");
  }

  if (b.scorelineCorrect) {
    parts.push("and nailed the exact scoreline");
  } else if (extracted.scoreHome !== null && extracted.scoreAway !== null) {
    parts.push(
      `but the scoreline came in at ${matchState.scoreHome}-${matchState.scoreAway}, not ${extracted.scoreHome}-${extracted.scoreAway}`
    );
  }

  let summary = parts.length > 0 ? parts.join(", ") + "." : "Here's how your call stacked up.";

  if (b.mentionedEventsHit.length > 0) {
    summary += ` You also correctly called ${b.mentionedEventsHit.join(", ").replace(/_/g, " ")}.`;
  }
  if (b.mentionedEventsMissed.length > 0) {
    summary += ` You mentioned ${b.mentionedEventsMissed.join(", ").replace(/_/g, " ")}, but that didn't happen.`;
  }

  return summary;
}
