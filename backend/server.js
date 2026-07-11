import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import axios from "axios";

import * as db from "./lib/db.js";
import { extractPrediction } from "./lib/prediction-extractor.js";
import { generateNarrative } from "./lib/narrative.js";
import { scorePrediction, buildComparisonSummary } from "./lib/scoring.js";
import { createInitialState, parseScoreUpdate } from "./lib/scores-parser.js";
import { isFinished } from "./lib/game-phase.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

const apiOrigin = "https://txline-dev.txodds.com";
const apiBaseUrl = `${apiOrigin}/api`;
const credentials = JSON.parse(fs.readFileSync("./txline-credentials.json", "utf8"));
const txlineHeaders = {
  Authorization: `Bearer ${credentials.jwt}`,
  "X-Api-Token": credentials.apiToken,
};

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
    const { userId, displayName, matchId, roomId, predictionText } = req.body;

    if (!userId || !displayName || !matchId || !predictionText) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await db.upsertUser(userId, displayName);

    const match = await db.getMatchById(matchId);
    const extracted = await extractPrediction(predictionText, match.home_team, match.away_team);

    const prediction = await db.createPrediction({
      user_id: userId,
      match_id: matchId,
      room_id: roomId || null,
      prediction_text: predictionText,
      extracted_winner: extracted.winner,
      extracted_score_home: extracted.scoreHome,
      extracted_score_away: extracted.scoreAway,
      extracted_players: extracted.mentionedPlayers,
      extracted_events: extracted.mentionedEvents,
      extraction_confidence: extracted.confidence,
    });

    res.json({
      predictionId: prediction.id,
      status: "submitted",
      extracted,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit prediction" });
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

    // If already scored, return cached result
    if (prediction.accuracy_pct !== null) {
      return res.json({
        originalPredictionText: prediction.prediction_text,
        accuracyPct: prediction.accuracy_pct,
        comparisonSummary: prediction.comparison_summary,
        scoreBreakdown: prediction.score_breakdown,
        finalScoreHome: match.score_home,
        finalScoreAway: match.score_away,
        shareCardImageUrl: null,
      });
    }

    // Score it fresh using stored match state (rebuilt from raw scores feed)
    const rawRes = await axios.get(`${apiBaseUrl}/scores/snapshot/${match.id}`, {
      headers: txlineHeaders,
      params: { Ts: 0 },
    });
    let matchState = createInitialState(match.id);
    matchState = parseScoreUpdate(matchState, rawRes.data);

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

// --- POST /api/rooms ---
app.post("/api/rooms", async (req, res) => {
  try {
    const { matchId, createdByUserId, createdByName } = req.body;
    if (!matchId || !createdByUserId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await db.upsertUser(createdByUserId, createdByName || "Anonymous");
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

    const joiningUserId = req.query.userId;
    const joiningName = req.query.displayName;
    if (joiningUserId && joiningName) {
      await db.upsertUser(joiningUserId, joiningName);
      await db.addRoomMember(room.id, joiningUserId);
    }

    const members = await db.getRoomMembersWithPredictions(room.id, room.match_id);

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
