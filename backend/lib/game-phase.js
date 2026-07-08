// Maps StatusId (from the Fusion feed spec) to phase code and human name.
export const GAME_PHASE_MAP = {
  1: { code: "NS", name: "Not Started" },
  2: { code: "H1", name: "1st Half" },
  3: { code: "HT", name: "Half Time" },
  4: { code: "H2", name: "2nd Half" },
  5: { code: "F", name: "Finished (Full-Time)" },
  6: { code: "WET", name: "Waiting for Extra Time" },
  7: { code: "ET1", name: "1st Half Extra Time" },
  8: { code: "HTET", name: "HT Extra Time" },
  9: { code: "ET2", name: "2nd Half Extra Time" },
  10: { code: "FET", name: "Finished After Extra Time" },
  11: { code: "WPE", name: "Waiting for Penalty Shootout" },
  12: { code: "PE", name: "Penalty Shootout" },
  13: { code: "FPE", name: "Finished After Penalty Shootout" },
  14: { code: "I", name: "Interrupted" },
  15: { code: "A", name: "Abandoned" },
  16: { code: "C", name: "Cancelled" },
  17: { code: "TXCC", name: "TX Coverage Cancelled" },
  18: { code: "TXCS", name: "TX Coverage Suspended" },
  19: { code: "P", name: "Postponed" },
};

const FINISHED_CODES = new Set(["F", "FET", "FPE"]);
const DEAD_CODES = new Set(["A", "C", "TXCC", "P"]);

export function phaseFromStatusId(statusId) {
  return GAME_PHASE_MAP[statusId] || { code: "UNKNOWN", name: "Unknown" };
}

export function isFinished(phaseCode) {
  return FINISHED_CODES.has(phaseCode);
}

export function isDead(phaseCode) {
  return DEAD_CODES.has(phaseCode);
}
