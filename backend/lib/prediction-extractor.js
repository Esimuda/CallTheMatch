import axios from "axios";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const EXTRACT_TIMEOUT_MS = 12000;

function normalizeTeam(name) {
  return (name || "").toLowerCase().trim();
}

// Deterministic fallback when DeepSeek is slow, down, or returns bad JSON.
// Keeps the product usable - past-match recall must never hang forever.
export function heuristicExtract(predictionText, homeTeam, awayTeam) {
  const text = predictionText || "";
  const lower = text.toLowerCase();
  const home = normalizeTeam(homeTeam);
  const away = normalizeTeam(awayTeam);

  let winner = null;
  const mentionsHome = home && lower.includes(home);
  const mentionsAway = away && lower.includes(away);
  const saysDraw = /\b(draw|tie|stalemate)\b/.test(lower);
  const homeWins = /\b(win|wins|won|beat|beats|victory)\b/.test(lower) && mentionsHome && !mentionsAway;
  const awayWins = /\b(win|wins|won|beat|beats|victory)\b/.test(lower) && mentionsAway && !mentionsHome;

  if (saysDraw) winner = "draw";
  else if (homeWins) winner = "home";
  else if (awayWins) winner = "away";
  else if (mentionsHome && !mentionsAway && /\b(win|wins|won|to win)\b/.test(lower)) winner = "home";
  else if (mentionsAway && !mentionsHome && /\b(win|wins|won|to win)\b/.test(lower)) winner = "away";

  const scoreMatch = text.match(/(\d{1,2})\s*[-–:]\s*(\d{1,2})/);
  let scoreHome = null;
  let scoreAway = null;
  if (scoreMatch) {
    let a = parseInt(scoreMatch[1], 10);
    let b = parseInt(scoreMatch[2], 10);

    // If the user named a winner ("England won 2-1"), orient the score so
    // that team has the higher number in home/away terms.
    if (winner === "away" && a > b) {
      scoreHome = b;
      scoreAway = a;
    } else if (winner === "home" && b > a) {
      scoreHome = b;
      scoreAway = a;
    } else {
      scoreHome = a;
      scoreAway = b;
    }

    if (winner === null) {
      if (scoreHome > scoreAway) winner = "home";
      else if (scoreAway > scoreHome) winner = "away";
      else winner = "draw";
    }
  }

  const mentionedEvents = [];
  if (/\bred\s*cards?\b/.test(lower)) mentionedEvents.push("red_card");
  if (/\bpenalt(y|ies)\b/.test(lower)) mentionedEvents.push("penalty");
  if (/\bextra\s*time\b|\bET\b/.test(lower)) mentionedEvents.push("extra_time");
  if (/\bhat[\s-]?trick\b/.test(lower)) mentionedEvents.push("hat_trick");
  if (/\bcomeback\b/.test(lower)) mentionedEvents.push("comeback");

  const confidence =
    (winner !== null || scoreHome !== null) && mentionedEvents.length === 0
      ? "medium"
      : winner !== null || scoreHome !== null
      ? "high"
      : "low";

  return {
    winner,
    scoreHome,
    scoreAway,
    mentionedPlayers: [],
    mentionedEvents,
    confidence,
  };
}

async function extractWithDeepSeek(predictionText, homeTeam, awayTeam) {
  const systemPrompt = `You extract structured football predictions from free-form fan text.
The user is predicting the outcome of ${homeTeam} (home) vs ${awayTeam} (away).

Read their prediction text and extract ONLY what they actually said. Do not guess
or invent details they did not mention - use null for anything not stated.

Respond ONLY with valid JSON, no other text, in exactly this shape:
{
  "winner": "home" | "away" | "draw" | null,
  "scoreHome": number | null,
  "scoreAway": number | null,
  "mentionedPlayers": string[],
  "mentionedEvents": string[],
  "confidence": "high" | "medium" | "low"
}

Rules:
- "winner": which team they think wins, or "draw" if they predict a tie, or null if unclear/not stated.
- "scoreHome"/"scoreAway": exact scoreline numbers if given, otherwise null for both.
- "mentionedPlayers": any player names mentioned by the user, exactly as written.
- "mentionedEvents": short lowercase snake_case tags for notable things mentioned,
  e.g. "red_card", "penalty", "hat_trick", "extra_time", "comeback". Only include
  events the user actually referenced, do not infer ones they didn't mention.
- "confidence": "high" if the prediction is specific and clear, "medium" if somewhat
  vague, "low" if very uncertain/hedged language ("maybe", "not sure", "could go either way").
- Respond with ONLY the JSON object, no markdown formatting, no explanation text.`;

  const response = await axios.post(
    DEEPSEEK_API_URL,
    {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Prediction text: "${predictionText}"` },
      ],
      max_tokens: 300,
      temperature: 0.1,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      responseType: "json",
      responseEncoding: "utf8",
      timeout: EXTRACT_TIMEOUT_MS,
    }
  );

  const rawContent = response.data.choices[0].message.content.trim();
  const cleaned = rawContent
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let extracted;
  try {
    extracted = JSON.parse(cleaned);
  } catch (err) {
    console.error("[extractPrediction] Failed to parse JSON response:", cleaned);
    throw new Error("Prediction extraction returned invalid JSON");
  }

  return {
    winner: ["home", "away", "draw"].includes(extracted.winner) ? extracted.winner : null,
    scoreHome: typeof extracted.scoreHome === "number" ? extracted.scoreHome : null,
    scoreAway: typeof extracted.scoreAway === "number" ? extracted.scoreAway : null,
    mentionedPlayers: Array.isArray(extracted.mentionedPlayers) ? extracted.mentionedPlayers : [],
    mentionedEvents: Array.isArray(extracted.mentionedEvents) ? extracted.mentionedEvents : [],
    confidence: ["high", "medium", "low"].includes(extracted.confidence) ? extracted.confidence : "low",
  };
}

export async function extractPrediction(predictionText, homeTeam, awayTeam) {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.warn("[extractPrediction] No DEEPSEEK_API_KEY - using heuristic extractor");
    return heuristicExtract(predictionText, homeTeam, awayTeam);
  }

  try {
    return await extractWithDeepSeek(predictionText, homeTeam, awayTeam);
  } catch (err) {
    console.error(
      "[extractPrediction] DeepSeek failed, falling back to heuristics:",
      err.response?.status || err.code || err.message
    );
    return heuristicExtract(predictionText, homeTeam, awayTeam);
  }
}
