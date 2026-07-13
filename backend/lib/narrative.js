import axios from "axios";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

function secondsToMinute(seconds) {
  if (typeof seconds !== "number") return "?";
  return Math.round(seconds / 60);
}

function buildTimelinePrompt(matchState, oddsHistory, homeTeam, awayTeam) {
  const goalEvents = matchState.events.filter((e) => e.type === "goal");
  const redCardEvents = matchState.events.filter((e) => e.type === "red_card");
  const flaggedMoves = oddsHistory.flaggedMoments || oddsHistory || [];

  const lines = [];

  goalEvents.forEach((g) => {
    const minute = secondsToMinute(g.minuteSeconds);
    const team = g.participant === 1 ? homeTeam : awayTeam;
    lines.push(`Minute ${minute}: GOAL for ${team}. Score becomes ${g.scoreHome}-${g.scoreAway}.`);
  });

  redCardEvents.forEach((r) => {
    const minute = secondsToMinute(r.minuteSeconds);
    const team = r.participant === 1 ? homeTeam : awayTeam;
    lines.push(`Minute ${minute}: RED CARD for ${team} (${r.cardType || "unknown type"}).`);
  });

  flaggedMoves.forEach((m) => {
    if (m.caption) lines.push(`Odds movement: ${m.caption}`);
  });

  if (lines.length === 0) {
    lines.push("No major odds swings or key events were flagged during this match.");
  }

  return lines.join("\n");
}

function cleanGeneratedText(text) {
  let result = text.normalize("NFKC");
  result = result.replace(/[\u2018\u2019\u201A\u201B]/g, "'");
  result = result.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
  result = result.replace(/[\u2013\u2014\u2015]/g, "-");
  result = result.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, " ");
  result = result.replace(/\u00A0/g, " ");
  result = result.replace(/,(?=[A-Za-z])/g, ", ");
  result = result.replace(/([a-z])(\d)/g, "$1 $2");
  result = result.replace(/[ \t]{2,}/g, " ");
  return result.trim();
}

function hasSuspiciousMerge(text) {
  return /[a-zA-Z]{16,}/.test(text);
}

async function callDeepSeek(systemPrompt, userPrompt) {
  const response = await axios.post(
    DEEPSEEK_API_URL,
    {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 700,
      temperature: 0.7,
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
  return response.data.choices[0].message.content;
}

function parseNarrativeJson(rawText) {
  const cleaned = rawText.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("[narrative] Failed to parse JSON response:", cleaned);
    throw new Error("Narrative generation returned invalid JSON");
  }

  return {
    funRecap: cleanGeneratedText(parsed.funRecap || ""),
    marketNarrative: cleanGeneratedText(parsed.marketNarrative || ""),
  };
}

export async function generateNarratives(matchState, oddsHistory, homeTeam, awayTeam) {
  const timeline = buildTimelinePrompt(matchState, oddsHistory, homeTeam, awayTeam);

  const systemPrompt = "You write two short recaps of a football match for a fan prediction app. " +
    "Respond ONLY with valid JSON, no other text, in exactly this shape: " +
    '{"funRecap": "...", "marketNarrative": "..."} ' +
    "funRecap: casual, excited, like texting a friend about the match, 60-100 words, plain language, " +
    "no odds jargon, focus on the drama and key moments. " +
    "marketNarrative: 150-200 words, describes what the betting market knew and when based on the odds " +
    "movements and events given, references specific minutes and percentages, descriptive market " +
    "journalism style, not betting advice. " +
    "Both fields: use ONLY plain ASCII characters, no em-dashes, no curly quotes, no special typographic " +
    "characters, always put a normal space after every comma and between words and numbers.";

  const userPrompt = `Match: ${homeTeam} vs ${awayTeam}\nFinal score: ${matchState.scoreHome}-${matchState.scoreAway}\n\nTimeline:\n${timeline}`;

  let rawText = await callDeepSeek(systemPrompt, userPrompt);
  let parsed = parseNarrativeJson(rawText);

  if (hasSuspiciousMerge(parsed.funRecap) || hasSuspiciousMerge(parsed.marketNarrative)) {
    console.log("[narrative] Suspicious word-merge detected, retrying generation once...");
    rawText = await callDeepSeek(systemPrompt, userPrompt);
    parsed = parseNarrativeJson(rawText);
  }

  return {
    funRecap: parsed.funRecap,
    marketNarrative: parsed.marketNarrative,
    generatedAt: new Date().toISOString(),
    modelUsed: "deepseek-chat",
  };
}
