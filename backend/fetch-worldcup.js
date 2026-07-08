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

const todayEpochDay = Math.floor(Date.now() / 86400000);

async function main() {
  console.log("Today's epoch day:", todayEpochDay);

  console.log("\nFetching fixtures snapshot with explicit startEpochDay...");
  const res = await axios.get(`${apiBaseUrl}/fixtures/snapshot`, {
    headers,
    params: { startEpochDay: todayEpochDay },
  });

  console.log(`Total fixtures returned: ${res.data.length}`);
  console.log(JSON.stringify(res.data, null, 2));

  const worldCupMatches = res.data.filter(f => f.Competition.toLowerCase().includes("world cup"));
  console.log(`\nWorld Cup matches in response: ${worldCupMatches.length}`);
}

main().catch((err) => {
  console.error("Error:", err.response?.status, err.response?.data || err.message);
  process.exit(1);
});
