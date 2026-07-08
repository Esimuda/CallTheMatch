import fs from "fs";
import path from "path";

const STATE_DIR = "./data";

function oddsFilePath(fixtureId) {
  return path.join(STATE_DIR, `odds-${fixtureId}.json`);
}

export function loadOddsHistory(fixtureId) {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  const filePath = oddsFilePath(fixtureId);
  if (!fs.existsSync(filePath)) {
    return { fixtureId, snapshots: [], flaggedMoments: [] };
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function saveOddsHistory(fixtureId, history) {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(oddsFilePath(fixtureId), JSON.stringify(history, null, 2));
}
