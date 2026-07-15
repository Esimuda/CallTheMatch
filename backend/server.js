import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";

import * as db from "./lib/db.js";
import { extractPrediction } from "./lib/prediction-extractor.js";
import { scorePrediction, buildComparisonSummary, buildCelebrationLine } from "./lib/scoring.js";
import { createInitialState, parseScoreUpdate } from "./lib/scores-parser.js";
import { isFinished } from "./lib/game-phase.js";
import { apiBaseUrl, txlineHeaders } from "./lib/txline.js";
import { issueEmailCode, verifyEmailCode } from "./lib/email-auth.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// --- GET /api/matches ---
app.get("/api/matches", async (req, res) => {
  try {
    const matches = await db.getMatches();
    res.json(
      matches.map((m) => ({
        id: m.id,
        homeTeam: m.home_team,
        awayTeam: m.away_team,
        homeCode: m.home_code,
        awayCode: m.away_code,
        kickoffTime: m.kickoff_time,
        competition: m.competition,
        gamePhase: m.game_phase,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

// --- POST /api/predictions ---
app.post("/api/predictions", async (req, res) => {
  try {
    const { userId, displayName, matchId, roomId, inviteCode, predictionText } = req.body;

    if (!userId || !displayName || !matchId || !predictionText) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (String(predictionText).trim().length > 2000) {
      return res.status(400).json({ error: "Prediction text is too long (max 2000 characters)" });
    }

    const match = await db.getMatchById(matchId).catch(() => null);
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    try {
      await db.claimDisplayName(userId, displayName.trim());
    } catch (nameErr) {
      if (nameErr.status === 409) {
        return res.status(409).json({ error: nameErr.message });
      }
      throw nameErr;
    }

    const extracted = await extractPrediction(predictionText, match.home_team, match.away_team);

    const fields = {
      prediction_text: predictionText,
      extracted_winner: extracted.winner,
      extracted_score_home: extracted.scoreHome,
      extracted_score_away: extracted.scoreAway,
      extracted_players: extracted.mentionedPlayers,
      extracted_events: extracted.mentionedEvents,
      extraction_confidence: extracted.confidence,
    };

    // Resolve room: prefer real room UUID; fall back to looking up invite code
    // (older clients mistakenly sent the invite code as roomId).
    let resolvedRoomId = null;
    const roomLookupKey = roomId || inviteCode || null;
    if (roomLookupKey) {
      const looksLikeUuid = /^[0-9a-f-]{36}$/i.test(roomLookupKey);
      if (looksLikeUuid) {
        resolvedRoomId = roomLookupKey;
      } else {
        const room = await db.getRoomByCode(String(roomLookupKey).toUpperCase());
        resolvedRoomId = room?.id || null;
      }
    }

    const existing = await db.getUserPredictionForMatch(userId, matchId);
    let prediction;
    let status = "submitted";

    if (existing) {
      prediction = await db.updatePredictionContent(existing.id, {
        ...fields,
        room_id: resolvedRoomId || existing.room_id || null,
      });
      status = "updated";
    } else {
      prediction = await db.createPrediction({
        user_id: userId,
        match_id: matchId,
        room_id: resolvedRoomId,
        ...fields,
      });
    }

    const effectiveRoomId = resolvedRoomId || prediction.room_id;
    if (effectiveRoomId) {
      await db.addRoomMember(effectiveRoomId, userId);
    }

    res.json({
      predictionId: prediction.id,
      status,
      extracted,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to submit prediction" });
  }
});

// --- POST /api/auth/send-code ---
app.post("/api/auth/send-code", async (req, res) => {
  try {
    const { email, userId } = req.body;
    const result = await issueEmailCode(email, userId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || "Failed to send code" });
  }
});

// --- POST /api/auth/verify-code ---
app.post("/api/auth/verify-code", async (req, res) => {
  try {
    const { email, code, userId } = req.body;
    const result = verifyEmailCode(email, code, userId);
    await db.setUserRecoveryEmail(result.userId, result.email);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || "Failed to verify code" });
  }
});

// --- GET /api/auth/check-name ---
app.get("/api/auth/check-name", async (req, res) => {
  try {
    const name = req.query.name;
    const userId = req.query.userId || null;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Missing name" });
    }
    const existing = await db.findUserByDisplayName(name);
    const available = !existing || (userId && existing.id === userId);
    res.json({ available, name: String(name).trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check name" });
  }
});

function predictionToExtracted(row) {
  return {
    winner: row.extracted_winner,
    scoreHome: row.extracted_score_home,
    scoreAway: row.extracted_score_away,
    mentionedPlayers: row.extracted_players || [],
    mentionedEvents: row.extracted_events || [],
    confidence: row.extraction_confidence || "low",
  };
}

// --- GET /api/matches/:id/my-prediction ---
app.get("/api/matches/:id/my-prediction", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const prediction = await db.getUserPredictionForMatch(userId, req.params.id);
    if (!prediction) {
      return res.status(404).json({ error: "No prediction found for this match" });
    }

    res.json({
      predictionId: prediction.id,
      predictionText: prediction.prediction_text,
      roomId: prediction.room_id,
      extracted: predictionToExtracted(prediction),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch prediction" });
  }
});

// --- GET /api/matches/:id/odds-history ---
app.get("/api/matches/:id/odds-history", async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await db.getMatchById(matchId);
    const snapshots = await db.getOddsHistory(matchId);

    res.json({
      gamePhase: match.game_phase,
      currentScoreHome: match.score_home,
      currentScoreAway: match.score_away,
      oddsTimeline: snapshots.map((s) => ({
        minute: s.minute,
        homeWinPct: parseFloat(s.home_win_pct),
        drawPct: parseFloat(s.draw_pct),
        awayWinPct: parseFloat(s.away_win_pct),
        timestamp: Number(s.ts),
      })),
      flaggedMoments: snapshots
        .filter((s) => s.is_significant)
        .map((s) => ({ minute: s.minute, caption: s.caption })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch odds history" });
  }
});

// --- GET /api/matches/:id/narrative ---
app.get("/api/matches/:id/narrative", async (req, res) => {
  try {
    const matchId = req.params.id;
    const narrative = await db.getNarrative(matchId);

    if (!narrative) {
      return res.status(404).json({ error: "Narrative not available yet - match may not be finished" });
    }

    res.json({
      funRecap: narrative.fun_recap,
      marketNarrative: narrative.market_narrative,
      generatedAt: narrative.generated_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch narrative" });
  }
});

// --- GET /api/predictions/:id/result ---
app.get("/api/predictions/:id/result", async (req, res) => {
  try {
    const prediction = await db.getPredictionById(req.params.id);
    const match = await db.getMatchById(prediction.match_id);

    if (!isFinished(match.game_phase)) {
      return res.status(400).json({ error: "Match has not finished yet" });
    }

    if (prediction.accuracy_pct !== null) {
      return res.json({
        originalPredictionText: prediction.prediction_text,
        predictedWinner: prediction.extracted_winner,
        predictedScoreHome: prediction.extracted_score_home,
        predictedScoreAway: prediction.extracted_score_away,
        celebrationLine: buildCelebrationLine(prediction.accuracy_pct),
        accuracyPct: prediction.accuracy_pct,
        comparisonSummary: prediction.comparison_summary,
        scoreBreakdown: prediction.score_breakdown,
        finalScoreHome: match.score_home,
        finalScoreAway: match.score_away,
        shareCardImageUrl: null,
      });
    }

    // Fallback path: the poll worker normally scores every prediction at
    // full time (lib/match-finish.js), but if it wasn't running we score
    // this one on demand.
    let matchState;
    try {
      const rawRes = await axios.get(`${apiBaseUrl}/scores/snapshot/${match.id}`, {
        headers: txlineHeaders(),
        params: { Ts: 0 },
      });
      matchState = parseScoreUpdate(createInitialState(match.id), rawRes.data);
    } catch (feedErr) {
      // TxLINE unavailable (e.g. expired subscription) - fall back to the
      // final state already synced to the DB so past matches stay playable.
      // Events aren't stored there, so event mentions score as misses.
      if (match.score_home === null || match.score_away === null) throw feedErr;
      console.warn(`TxLINE fetch failed for ${match.id}, scoring from DB state:`, feedErr.response?.status || feedErr.message);
      matchState = {
        ...createInitialState(match.id),
        gamePhase: match.game_phase,
        scoreHome: match.score_home,
        scoreAway: match.score_away,
      };
    }

    const extracted = {
      winner: prediction.extracted_winner,
      scoreHome: prediction.extracted_score_home,
      scoreAway: prediction.extracted_score_away,
      mentionedEvents: prediction.extracted_events || [],
    };

    const scoreResult = scorePrediction(extracted, matchState);
    const comparisonSummary = buildComparisonSummary(extracted, matchState, scoreResult);

    const updated = await db.updatePredictionResult(prediction.id, {
      accuracy_pct: scoreResult.accuracyPct,
      comparison_summary: comparisonSummary,
      score_breakdown: scoreResult.scoreBreakdown,
    });

    res.json({
      originalPredictionText: updated.prediction_text,
      predictedWinner: updated.extracted_winner,
      predictedScoreHome: updated.extracted_score_home,
      predictedScoreAway: updated.extracted_score_away,
      celebrationLine: buildCelebrationLine(scoreResult.accuracyPct),
      accuracyPct: updated.accuracy_pct,
      comparisonSummary: updated.comparison_summary,
      scoreBreakdown: updated.score_breakdown,
      finalScoreHome: matchState.scoreHome,
      finalScoreAway: matchState.scoreAway,
      shareCardImageUrl: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch prediction result" });
  }
});

// --- GET /api/matches/:id/leaderboard ---
app.get("/api/matches/:id/leaderboard", async (req, res) => {
  try {
    const matchId = req.params.id;
    const userId = req.query.userId || null;
    const leaderboard = await db.getMatchLeaderboard(matchId, userId);
    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// --- POST /api/rooms ---
app.post("/api/rooms", async (req, res) => {
  try {
    const { matchId, createdByUserId, createdByName } = req.body;
    if (!matchId || !createdByUserId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      await db.claimDisplayName(createdByUserId, createdByName || "Anonymous");
    } catch (nameErr) {
      if (nameErr.status === 409) {
        return res.status(409).json({ error: nameErr.message });
      }
      throw nameErr;
    }
    const room = await db.createRoom(matchId, createdByUserId);
    await db.addRoomMember(room.id, createdByUserId);

    res.json({ roomId: room.id, inviteCode: room.invite_code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create room" });
  }
});

// --- GET /api/rooms/:code ---
app.get("/api/rooms/:code", async (req, res) => {
  try {
    const room = await db.getRoomByCode(req.params.code.toUpperCase());
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Optional userId marks the requesting user's own row (isYou) so the
    // frontend doesn't have to guess by display name or append a duplicate.
    const members = await db.getRoomMembersWithPredictions(room.id, room.match_id, req.query.userId || null);

    res.json({
      roomId: room.id,
      matchId: room.match_id,
      inviteCode: room.invite_code,
      members,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch room" });
  }
});

app.listen(PORT, () => {
  console.log(`CallTheMatch API server running on http://localhost:${PORT}`);
});