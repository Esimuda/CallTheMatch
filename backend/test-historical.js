import axios from "axios";
import fs from "fs";

const apiOrigin = "https://txline-dev.txodds.com";
const apiBaseUrl = `${apiOrigin}/api`;

const credentials = JSON.parse(fs.readFileSync("./txline-credentials.json", "utf8"));
const { jwt, apiToken } = credentials;

const headers = {
  Authorization: `Bearer ${jwt}`,
  "X-Api-Token": apiToken,
};

// USA vs Belgium, 8th Finals, July 7 2026 00:00 UTC — should be finished by now
const testFixtureId = 18193785;

async function tryCall(label, url, params) {
  try {
    const res = await axios.get(url, { headers, params });
    console.log(`\n=== ${label} ===`);
    console.log(`Entries returned: ${Array.isArray(res.data) ? res.data.length : "N/A"}`);
    console.log(JSON.stringify(res.data, null, 2).slice(0, 3000));
  } catch (err) {
    console.log(`\n=== ${label} FAILED ===`);
    console.log(err.response?.status, err.response?.data || err.message);
  }
}

async function main() {
  await tryCall(
    "Scores, no params (default)",
    `${apiBaseUrl}/scores/snapshot/${testFixtureId}`
  );

  await tryCall(
    "Scores, Ts=0",
    `${apiBaseUrl}/scores/snapshot/${testFixtureId}`,
    { Ts: 0 }
  );

  await tryCall(
    "Odds, no asOf (latest only)",
    `${apiBaseUrl}/odds/snapshot/${testFixtureId}`
  );
}

main();
