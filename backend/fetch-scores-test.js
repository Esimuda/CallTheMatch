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

const testFixtureId = 18209181; // France vs Morocco, July 9 2026

async function tryEndpoint(path) {
  try {
    const res = await axios.get(`${apiBaseUrl}${path}`, { headers });
    console.log(`SUCCESS: ${path}`);
    console.log(JSON.stringify(res.data, null, 2));
    return true;
  } catch (err) {
    console.log(`FAILED: ${path} -> ${err.response?.status || err.message}`);
    return false;
  }
}

async function main() {
  const candidates = [
    `/scores/snapshot/${testFixtureId}`,
    `/scores/${testFixtureId}`,
    `/scores?FixtureId=${testFixtureId}`,
  ];

  for (const path of candidates) {
    const ok = await tryEndpoint(path);
    if (ok) break;
  }
}

main();
