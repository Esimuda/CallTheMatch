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
    predictedWinner: "home",
    predictedScoreHome: 2,
    predictedScoreAway: 1,
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

// POST /api/rooms - Phase 2
export async function createRoom(matchId, createdByUserId, createdByName) {
  await delay(500);
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  return {
    roomId: "room_" + Math.random().toString(36).slice(2, 9),
    inviteCode: code,
  };
}

// GET /api/rooms/:code - Phase 2
export async function fetchRoom(code, joiningDisplayName) {
  await delay(500);
  const members = [
    { displayName: "Dele", accuracyPct: 45, predictionText: "Morocco upset, 1-0 to them late on" },
    { displayName: "Chiamaka", accuracyPct: 62, predictionText: "France wins it 1-0, tight game all through" },
    { displayName: "Tunde", accuracyPct: 33, predictionText: "0-0 and penalties, Morocco through on spot kicks" },
  ];

  if (joiningDisplayName) {
    members.push({ displayName: joiningDisplayName, accuracyPct: null, predictionText: null });
  }

  return {
    roomId: "room_demo",
    matchId: "18209181",
    inviteCode: code_or_default(code),
    members: members,
  };
}

function code_or_default(code) {
  return code || "ABCD12";
}

// Global leaderboard - all callers for a match, not scoped to a room.
// GET /api/matches/:id/leaderboard (proposed endpoint - not yet in the written spec,
// but a natural sibling of /api/rooms/:code with roomId omitted)
const GLOBAL_SAMPLE = [
  { displayName: "Chiamaka", accuracyPct: 94, predictionText: "France 2-0, clean sheet, Mbappe brace" },
  { displayName: "Tunde", accuracyPct: 89, predictionText: "France to win comfortably, 2-1" },
  { displayName: "Ngozi", accuracyPct: 85, predictionText: "2-0 France, Morocco tired legs second half" },
  { displayName: "Yusuf", accuracyPct: 81, predictionText: "France by two goals, no drama" },
  { displayName: "Blessing", accuracyPct: 76, predictionText: "Tight one, 1-0 France" },
  { displayName: "Kelechi", accuracyPct: 70, predictionText: "France win, not sure on the exact score" },
  { displayName: "Fatima", accuracyPct: 64, predictionText: "2-1 France, red card for Morocco" },
  { displayName: "Obi", accuracyPct: 58, predictionText: "Morocco hold on for a draw" },
  { displayName: "Grace", accuracyPct: 51, predictionText: "3-1 France, goal fest" },
  { displayName: "Wale", accuracyPct: 44, predictionText: "Morocco sneak it 1-0" },
  { displayName: "Aisha", accuracyPct: 37, predictionText: "Goes to extra time, France eventually" },
  { displayName: "Emeka", accuracyPct: 22, predictionText: "Morocco win it outright, upset of the round" },
];

export async function fetchGlobalLeaderboard(matchId, yourEntry) {
  await delay(600);

  let combined = GLOBAL_SAMPLE.slice();
  if (yourEntry) {
    combined = combined.concat([{
      displayName: yourEntry.displayName || "You",
      accuracyPct: yourEntry.accuracyPct,
      predictionText: yourEntry.predictionText,
      isYou: true,
    }]);
  }

  combined.sort(function (a, b) { return b.accuracyPct - a.accuracyPct; });

  let yourRank = null;
  let beatPct = null;
  if (yourEntry) {
    const idx = combined.findIndex(function (m) { return m.isYou; });
    yourRank = idx + 1;
    const total = combined.length;
    beatPct = total > 1 ? Math.round(((total - yourRank) / (total - 1)) * 100) : 100;
  }

  return {
    matchId: matchId,
    totalPredictions: 1247,
    entries: combined,
    yourRank: yourRank,
    beatPct: beatPct,
  };
}

// ---- Stretch feature: optional email magic-link recovery ----
// Fully mocked - there is no real email-sending backend yet. This exists so
// the UI flow is built and ready; wire to a real endpoint (e.g. POST
// /api/auth/magic-link and GET /api/auth/magic-link/:token) whenever the
// backend adds it. Not required for judging - identity works fine without it
// via localStorage alone, per spec section 6.

export async function requestMagicLink(email) {
  await delay(700);
  return { status: "sent", email: email };
}

export async function verifyMagicLink(token) {
  await delay(500);
  return { status: "verified" };
}