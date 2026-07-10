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

const testFixtureId = 18193785; // USA vs Belgium
const kickoffTs = 1783382400000;

async function main() {
  // Sample odds at kickoff, +15min, +45min, +75min (rough guesses across the match)
  const offsets = [0, 15 * 60 * 1000, 45 * 60 * 1000, 75 * 60 * 1000];

  for (const offset of offsets) {
    const asOf = kickoffTs + offset;
    try {
      const res = await axios.get(`${apiBaseUrl}/odds/snapshot/${testFixtureId}`, {
        headers,
        params: { asOf },
      });
      console.log(`\nasOf=${asOf} (kickoff+${offset / 60000}min): ${res.data.length} entries`);
      const main1x2 = res.data.find(o => o.SuperOddsType === "1X2_PARTICIPANT_RESULT");
      if (main1x2) {
        console.log("1X2 Pct:", main1x2.Pct);
      }
    } catch (err) {
      console.log(`\nasOf=${asOf} FAILED:`, err.response?.status, err.response?.data);
    }
  }
}

main();
