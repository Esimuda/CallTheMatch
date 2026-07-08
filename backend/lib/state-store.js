import fs from "fs";
import path from "path";

const STATE_DIR = "./data";

function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

function stateFilePath(fixtureId) {
  return path.join(STATE_DIR, `match-${fixtureId}.json`);
}

export function loadState(fixtureId, fallbackFactory) {
  ensureStateDir();
  const filePath = stateFilePath(fixtureId);
  if (!fs.existsSync(filePath)) {
    return fallbackFactory(fixtureId);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

export function saveState(fixtureId, state) {
  ensureStateDir();
  const filePath = stateFilePath(fixtureId);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}
