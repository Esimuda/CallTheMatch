// Real API layer - same function names/signatures as mockApi.js, so every
// component only needs a one-line import swap to go from mock to live.
import { getUserId } from "./identity.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function get(path) {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// GET /api/matches
export async function fetchMatches() {
  return get("/api/matches");
}

// POST /api/predictions
export async function submitPrediction(payload) {
  return post("/api/predictions", payload);
}

// GET /api/matches/:id/odds-history
export async function fetchOddsHistory(matchId) {
  return get(`/api/matches/${matchId}/odds-history`);
}

// GET /api/matches/:id/narrative
export async function fetchNarrative(matchId) {
  return get(`/api/matches/${matchId}/narrative`);
}

// GET /api/predictions/:id/result
export async function fetchPredictionResult(predictionId) {
  return get(`/api/predictions/${predictionId}/result`);
}

// POST /api/rooms
export async function createRoom(matchId, createdByUserId, createdByName) {
  return post("/api/rooms", { matchId, createdByUserId, createdByName });
}

// GET /api/rooms/:code
export async function fetchRoom(code) {
  return get(`/api/rooms/${code}`);
}

// GET /api/matches/:id/leaderboard
// Pulls the real userId internally via identity.js, so callers don't need
// to pass it explicitly - matches GlobalLeaderboard.jsx's existing call shape.
export async function fetchGlobalLeaderboard(matchId) {
  const userId = getUserId();
  return get(`/api/matches/${matchId}/leaderboard?userId=${encodeURIComponent(userId)}`);
}
