import fs from "fs";

export const apiOrigin = "https://txline-dev.txodds.com";
export const apiBaseUrl = `${apiOrigin}/api`;

const CREDENTIALS_PATH = "./txline-credentials.json";

let cached = null;
let cachedMtimeMs = 0;

// Re-reads txline-credentials.json whenever it changes on disk, so re-running
// subscribe.js (e.g. after JWT expiry) takes effect without restarting the
// server or workers.
export function txlineHeaders() {
  const mtimeMs = fs.statSync(CREDENTIALS_PATH).mtimeMs;
  if (!cached || mtimeMs !== cachedMtimeMs) {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
    cached = {
      Authorization: `Bearer ${credentials.jwt}`,
      "X-Api-Token": credentials.apiToken,
    };
    cachedMtimeMs = mtimeMs;
  }
  return cached;
}
