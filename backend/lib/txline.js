import fs from "fs";

export const apiOrigin = "https://txline-dev.txodds.com";
export const apiBaseUrl = `${apiOrigin}/api`;

const CREDENTIALS_PATH = "./txline-credentials.json";

let cached = null;
let cachedMtimeMs = 0;

// Credential sources, in order:
// 1. txline-credentials.json (written by subscribe.js) - used locally.
//    Re-read whenever the file changes on disk, so re-running subscribe.js
//    after JWT expiry takes effect without restarting anything.
// 2. TXLINE_JWT + TXLINE_API_TOKEN env vars - used on hosts (Render etc.)
//    where the gitignored credentials file doesn't exist. Copy the "jwt"
//    and "apiToken" values out of your local txline-credentials.json.
export function txlineHeaders() {
  if (fs.existsSync(CREDENTIALS_PATH)) {
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

  if (process.env.TXLINE_JWT && process.env.TXLINE_API_TOKEN) {
    return {
      Authorization: `Bearer ${process.env.TXLINE_JWT}`,
      "X-Api-Token": process.env.TXLINE_API_TOKEN,
    };
  }

  throw new Error(
    "TxLINE credentials not found: provide txline-credentials.json (run subscribe.js) " +
    "or set TXLINE_JWT and TXLINE_API_TOKEN environment variables."
  );
}
