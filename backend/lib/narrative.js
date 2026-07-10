import axios from "axios";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

function secondsToMinute(seconds) {
  if (typeof seconds !== "number") return "?";
  return Math.round(seconds / 60);
}

function buildTimelinePrompt(matchState, oddsHistory, homeTeam, awayTeam) {
  const goalEvents = matchState.events.filter((e) => e.type === "goal");
  const redCardEvents = matchState.events.filter((e) => e.type === "red_card");
  const flaggedMoves = oddsHistory.flaggedMoments || [];

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
    lines.push(`Odds movement: ${m.caption}`);
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

// Heuristic check for likely word-merge artifacts: any unbroken run of 16+
// letters is almost certainly two words glued together (longest legitimate
// English words rarely exceed 15 letters in this kind of casual prose).
// This catches the more visible merges; short merges (e.g. "wasthe") are
// not reliably detectable without a dictionary and are left for a human
// proofread pass before using generated text publicly.
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
      max_tokens: 400,
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

export async function generateNarrative(matchState, oddsHistory, homeTeam, awayTeam) {
  const timeline = buildTimelinePrompt(matchState, oddsHistory, homeTeam, awayTeam);

  const systemPrompt = "You are writing a short post-match odds narrative for football fans. " +
    "Given a timeline of significant odds movements and match events, write 150-200 words " +
    "describing what the betting market knew and when, in a readable, engaging style. " +
    "Reference specific minutes and teams. Use ONLY plain ASCII characters - standard " +
    "keyboard punctuation only. Always put a normal space after every comma and always " +
    "put a normal space between any word and an adjacent number. Do not use em-dashes, " +
    "en-dashes, curly quotes, or special typographic characters. Do not mention betting " +
    "advice or encourage wagering - this is descriptive market journalism only.";

  const userPrompt = `Match: ${homeTeam} vs ${awayTeam}\nFinal score: ${matchState.scoreHome}-${matchState.scoreAway}\n\nTimeline:\n${timeline}`;

  let rawText = await callDeepSeek(systemPrompt, userPrompt);
  let narrativeText = cleanGeneratedText(rawText);
  let retried = false;

  if (hasSuspiciousMerge(narrativeText)) {
    console.log("[narrative] Suspicious word-merge detected, retrying generation once...");
    rawText = await callDeepSeek(systemPrompt, userPrompt);
    narrativeText = cleanGeneratedText(rawText);
    retried = true;
  }

  return {
    narrativeText,
    generatedAt: new Date().toISOString(),
    modelUsed: "deepseek-chat",
    retriedForQuality: retried,
  };
}
