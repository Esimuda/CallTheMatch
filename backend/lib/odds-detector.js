// Compares two odds snapshots (implied win% for home/draw/away) and flags
// whether the move between them counts as "significant" per our threshold.
// Threshold: >15 percentage points of absolute swing on any outcome.
const SIGNIFICANT_SWING_THRESHOLD = 15;

export function computeImpliedPct(oddsPayload) {
  // oddsPayload.Pct is an array of strings like "61.125", aligned with PriceNames.
  // We only care about the 1X2 market for this.
  if (oddsPayload.SuperOddsType !== "1X2_PARTICIPANT_RESULT") return null;
  if (!oddsPayload.Pct || !oddsPayload.PriceNames) return null;

  const result = {};
  oddsPayload.PriceNames.forEach((name, i) => {
    const val = oddsPayload.Pct[i];
    result[name] = val === "NA" ? null : parseFloat(val);
  });
  // Expected keys: part1 (home), draw, part2 (away)
  return {
    homeWinPct: result.part1 ?? null,
    drawPct: result.draw ?? null,
    awayWinPct: result.part2 ?? null,
    ts: oddsPayload.Ts,
  };
}

export function isSignificantMove(previous, current) {
  if (!previous || !current) return false;
  const deltas = ["homeWinPct", "drawPct", "awayWinPct"].map((key) => {
    if (previous[key] === null || current[key] === null) return 0;
    return Math.abs(current[key] - previous[key]);
  });
  return Math.max(...deltas) >= SIGNIFICANT_SWING_THRESHOLD;
}

export function buildMoveCaption(previous, current, homeTeam, awayTeam) {
  const homeDelta = current.homeWinPct - previous.homeWinPct;
  if (homeDelta > 0) {
    return `Market shifted toward ${homeTeam} (${previous.homeWinPct.toFixed(1)}% -> ${current.homeWinPct.toFixed(1)}%)`;
  } else {
    return `Market shifted toward ${awayTeam} (${previous.awayWinPct.toFixed(1)}% -> ${current.awayWinPct.toFixed(1)}%)`;
  }
}
