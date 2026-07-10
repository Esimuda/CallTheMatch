// Mock data layer - shaped to match the backend contract in callthematch-frontend-spec-v2.md section 5.
// Swap each function body for a real fetch() call once the backend is live; the shapes won't change.

export const MOCK_MATCHES = [
  {
    id: "18209181",
    homeTeam: "France",
    awayTeam: "Morocco",
    homeCode: "FRA",
    awayCode: "MAR",
    kickoffTime: "2026-07-09T20:00:00Z",
    competition: "World Cup - Quarter-final",
    gamePhase: "NS",
  },
  {
    id: "18209182",
    homeTeam: "Argentina",
    awayTeam: "Brazil",
    homeCode: "ARG",
    awayCode: "BRA",
    kickoffTime: "2026-07-10T16:00:00Z",
    competition: "World Cup - Quarter-final",
    gamePhase: "NS",
  },
  {
    id: "18209183",
    homeTeam: "England",
    awayTeam: "Spain",
    homeCode: "ENG",
    awayCode: "ESP",
    kickoffTime: "2026-07-10T20:00:00Z",
    competition: "World Cup - Quarter-final",
    gamePhase: "NS",
  },
];

function delay(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

export async function fetchMatches() {
  await delay(300);
  return MOCK_MATCHES;
}

// POST /api/predictions - sends raw text, backend returns extracted structured meaning
export async function submitPrediction(payload) {
  await delay(900);
  const text = (payload.predictionText || "").toLowerCase();

  const mentionsMbappe = text.indexOf("mbapp") !== -1;
  const mentionsRedCard = text.indexOf("red card") !== -1;
  const homeWins = text.indexOf("france wins") !== -1 || text.indexOf("france win") !== -1;

  return {
    predictionId: "pred_" + Math.random().toString(36).slice(2, 9),
    status: "submitted",
    extracted: {
      winner: homeWins ? "home" : "home",
      scoreHome: 2,
      scoreAway: 1,
      mentionedPlayers: mentionsMbappe ? ["Mbappe"] : [],
      mentionedEvents: mentionsRedCard ? ["red_card_possible_second_half"] : [],
      confidence: "high",
    },
  };
}

// GET /api/matches/:id/odds-history
export async function fetchOddsHistory(matchId) {
  await delay(500);

  const oddsTimeline = [
    { minute: 0, homeWinPct: 46.0, drawPct: 27.0, awayWinPct: 27.0 },
    { minute: 10, homeWinPct: 49.5, drawPct: 26.0, awayWinPct: 24.5 },
    { minute: 22, homeWinPct: 53.0, drawPct: 25.0, awayWinPct: 22.0 },
    { minute: 34, homeWinPct: 61.1, drawPct: 24.1, awayWinPct: 14.8 },
    { minute: 45, homeWinPct: 58.0, drawPct: 27.0, awayWinPct: 15.0 },
    { minute: 52, homeWinPct: 55.0, drawPct: 28.0, awayWinPct: 17.0 },
    { minute: 61, homeWinPct: 63.5, drawPct: 22.0, awayWinPct: 14.5 },
    { minute: 67, homeWinPct: 71.0, drawPct: 18.0, awayWinPct: 11.0 },
    { minute: 78, homeWinPct: 74.0, drawPct: 16.5, awayWinPct: 9.5 },
    { minute: 90, homeWinPct: 79.0, drawPct: 13.0, awayWinPct: 8.0 },
  ];

  const flaggedMoments = [
    { minute: 34, caption: "Market shifted hard toward France after the opener" },
    { minute: 67, caption: "France odds surge past 70 percent following a second goal" },
  ];

  return {
    gamePhase: "H2",
    currentScoreHome: 2,
    currentScoreAway: 0,
    oddsTimeline: oddsTimeline,
    flaggedMoments: flaggedMoments,
  };
}

// GET /api/matches/:id/narrative
// funRecap: casual, friend-texting-you tone - the lead content on the result screen
// marketNarrative: the odds/data version - kept as secondary, optional detail
export async function fetchNarrative(matchId) {
  await delay(700);
  return {
    funRecap:
      "What a night. France came out sharp and Mbappe was everywhere early on. " +
      "Morocco held firm for half an hour, but the second the ball hit the net in the 34th minute, " +
      "you could feel the whole tie tip. Just after the hour mark France doubled it and that was " +
      "basically game over - Morocco threw bodies forward looking for a way back in, picked up a " +
      "couple of yellow cards for their trouble, but never really threatened. France cruise into the semis, " +
      "2-0, and honestly it felt more comfortable than the scoreline even suggests.",
    marketNarrative:
      "The market priced France at 46 percent entering the match, with Morocco given a live chance at 27. " +
      "That changed fast after the 34th minute, when a France opener sent home-win probability past 61 percent. " +
      "A second goal just after the hour mark sent win probability to 71 percent within minutes. By full time, " +
      "the odds had drifted to 79 percent for France, a near mirror of where the match opened.",
    generatedAt: "2026-07-09T22:05:00Z",
  };
}

// GET /api/predictions/:id/result
export async function fetchPredictionResult(predictionId, originalText) {
  await delay(600);
  return {
    originalPredictionText:
      originalText ||
      "I think France wins 2-1, Mbappe scores, maybe a red card for Morocco in the second half",
    accuracyPct: 78,
    comparisonSummary:
      "You called the winner right and nearly nailed the scoreline. You had a red card down as a maybe - " +
      "didn't happen, but Morocco did pick up two yellows chasing the game late on. Solid read overall.",
    scoreBreakdown: {
      winnerCorrect: true,
      scorelineCorrect: false,
      mentionedEventsHit: ["winner_correct"],
      mentionedEventsMissed: ["red_card_morocco"],
    },
    finalScoreHome: 2,
    finalScoreAway: 0,
    shareCardImageUrl: null,
  };
}