import { supabase } from "./supabase.js";

// --- Matches ---
export async function getMatches() {
  const { data, error } = await supabase.from("matches").select("*").order("kickoff_time");
  if (error) throw error;
  return data;
}

export async function getMatchById(id) {
  const { data, error } = await supabase.from("matches").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function upsertMatch(match) {
  const { data, error } = await supabase.from("matches").upsert(match).select();
  if (error) throw error;
  return data[0];
}

// --- Predictions ---
export async function createPrediction(prediction) {
  const { data, error } = await supabase.from("predictions").insert(prediction).select();
  if (error) throw error;
  return data[0];
}

export async function getPredictionById(id) {
  const { data, error } = await supabase.from("predictions").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function updatePredictionResult(id, updates) {
  const { data, error } = await supabase.from("predictions").update(updates).eq("id", id).select();
  if (error) throw error;
  return data[0];
}

// --- Odds ---
export async function saveOddsSnapshot(snapshot) {
  const { error } = await supabase.from("odds_snapshots").insert(snapshot);
  if (error) throw error;
}

export async function getOddsHistory(matchId) {
  const { data, error } = await supabase
    .from("odds_snapshots")
    .select("*")
    .eq("match_id", matchId)
    .order("ts", { ascending: true });
  if (error) throw error;
  return data;
}

// --- Narratives ---
export async function saveNarrative(matchId, narrative) {
  const { data, error } = await supabase
    .from("narratives")
    .upsert({ match_id: matchId, ...narrative })
    .select();
  if (error) throw error;
  return data[0];
}

export async function getNarrative(matchId) {
  const { data, error } = await supabase.from("narratives").select("*").eq("match_id", matchId).maybeSingle();
  if (error) throw error;
  return data;
}

// --- Rooms ---
function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createRoom(matchId, createdByUserId) {
  const inviteCode = generateInviteCode();
  const { data, error } = await supabase
    .from("rooms")
    .insert({ match_id: matchId, invite_code: inviteCode, created_by: createdByUserId })
    .select();
  if (error) throw error;
  return data[0];
}

export async function getRoomByCode(code) {
  const { data, error } = await supabase.from("rooms").select("*").eq("invite_code", code).maybeSingle();
  if (error) throw error;
  return data;
}

export async function addRoomMember(roomId, userId) {
  const { error } = await supabase
    .from("room_members")
    .upsert({ room_id: roomId, user_id: userId }, { onConflict: "room_id,user_id" });
  if (error) throw error;
}

export async function getRoomMembersWithPredictions(roomId, matchId) {
  const { data: members, error: membersError } = await supabase
    .from("room_members")
    .select("user_id, users(display_name)")
    .eq("room_id", roomId);
  if (membersError) throw membersError;

  const { data: predictions, error: predError } = await supabase
    .from("predictions")
    .select("user_id, prediction_text, accuracy_pct")
    .eq("room_id", roomId)
    .eq("match_id", matchId);
  if (predError) throw predError;

  const predMap = {};
  predictions.forEach((p) => { predMap[p.user_id] = p; });

  return members.map((m) => {
    const pred = predMap[m.user_id];
    return {
      displayName: m.users?.display_name || "Unknown",
      accuracyPct: pred ? pred.accuracy_pct : null,
      predictionText: pred ? pred.prediction_text : null,
    };
  });
}

// --- Users ---
export async function upsertUser(id, displayName) {
  const { data, error } = await supabase
    .from("users")
    .upsert({ id, display_name: displayName })
    .select();
  if (error) throw error;
  return data[0];
}

// --- Leaderboard (per-match, not truly global across matches) ---
export async function getMatchLeaderboard(matchId, requestingUserId) {
  const { data, error } = await supabase
    .from("predictions")
    .select("user_id, prediction_text, accuracy_pct, users(display_name)")
    .eq("match_id", matchId)
    .not("accuracy_pct", "is", null)
    .order("accuracy_pct", { ascending: false });

  if (error) throw error;

  const entries = data.map((p) => ({
    displayName: p.users?.display_name || "Unknown",
    accuracyPct: p.accuracy_pct,
    predictionText: p.prediction_text,
    isYou: requestingUserId ? p.user_id === requestingUserId : false,
  }));

  let yourRank = null;
  let beatPct = null;
  if (requestingUserId) {
    const idx = entries.findIndex((e) => e.isYou);
    if (idx !== -1) {
      yourRank = idx + 1;
      const total = entries.length;
      beatPct = total > 1 ? Math.round(((total - yourRank) / (total - 1)) * 100) : 100;
    }
  }

  return {
    matchId,
    totalPredictions: entries.length,
    entries,
    yourRank,
    beatPct,
  };
}

export async function updateMatchState(matchId, updates) {
  const { data, error } = await supabase
    .from("matches")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", matchId)
    .select();
  if (error) throw error;
  return data[0];
}
