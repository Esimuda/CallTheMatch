import axios from "axios";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

// Extracts structured prediction data from a user's free-text prediction.
// Returns null fields where the user simply did not mention that aspect -
// we never invent information the user did not provide.
export async function extractPrediction(predictionText, homeTeam, awayTeam) {
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

  const userPrompt = `Prediction text: "${predictionText}"`;

  const response = await axios.post(
    DEEPSEEK_API_URL,
    {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 300,
      temperature: 0.1, // low temperature - this is extraction, not creative writing
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      responseType: "json",
      responseEncoding: "utf8",
    }
  );

  const rawContent = response.data.choices[0].message.content.trim();

  // Defensive: strip markdown code fences if the model adds them despite instructions
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

  // Validate shape defensively, fall back to safe defaults for any missing field
  return {
    winner: ["home", "away", "draw"].includes(extracted.winner) ? extracted.winner : null,
    scoreHome: typeof extracted.scoreHome === "number" ? extracted.scoreHome : null,
    scoreAway: typeof extracted.scoreAway === "number" ? extracted.scoreAway : null,
    mentionedPlayers: Array.isArray(extracted.mentionedPlayers) ? extracted.mentionedPlayers : [],
    mentionedEvents: Array.isArray(extracted.mentionedEvents) ? extracted.mentionedEvents : [],
    confidence: ["high", "medium", "low"].includes(extracted.confidence) ? extracted.confidence : "low",
  };
}
