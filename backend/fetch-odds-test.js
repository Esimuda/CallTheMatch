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

async function main() {
  console.log(`Fetching odds snapshot for fixture ${testFixtureId} (France vs Morocco)...`);
  const res = await axios.get(`${apiBaseUrl}/odds/snapshot/${testFixtureId}`, { headers });
  console.log(`Odds entries returned: ${res.data.length}`);
  console.log(JSON.stringify(res.data, null, 2));
}

main().catch((err) => {
  console.error("Error:", err.response?.status, err.response?.data || err.message);
  process.exit(1);
});
