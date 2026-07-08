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

async function main() {
  console.log("Fetching fixtures snapshot...");
  const fixturesResponse = await axios.get(`${apiBaseUrl}/fixtures/snapshot`, { headers });
  console.log("Fixtures response (first 3):");
  console.log(JSON.stringify(fixturesResponse.data.slice(0, 3), null, 2));
  console.log(`Total fixtures returned: ${fixturesResponse.data.length}`);

  const testFixtureId = 18143850; // Vietnam vs Myanmar, from our own fixtures snapshot

  console.log(`\nFetching odds snapshot for fixture ${testFixtureId}...`);
  try {
    const oddsResponse = await axios.get(`${apiBaseUrl}/odds/snapshot/${testFixtureId}`, { headers });
    console.log("Odds response:");
    console.log(JSON.stringify(oddsResponse.data, null, 2));
  } catch (err) {
    console.log("Odds fetch failed:", err.response?.status, err.response?.data);
  }
}

main().catch((err) => {
  console.error("Error:", err.response?.status, err.response?.data || err.message);
  process.exit(1);
});
