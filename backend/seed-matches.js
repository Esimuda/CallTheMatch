import "dotenv/config";
import axios from "axios";
import fs from "fs";
import { upsertMatch } from "./lib/db.js";

const apiOrigin = "https://txline-dev.txodds.com";
const apiBaseUrl = `${apiOrigin}/api`;

const credentials = JSON.parse(fs.readFileSync("./txline-credentials.json", "utf8"));
const { jwt, apiToken } = credentials;

const headers = {
  Authorization: `Bearer ${jwt}`,
  "X-Api-Token": apiToken,
};

const TEAM_CODES = {
  France: "FRA", Morocco: "MAR", Argentina: "ARG", Brazil: "BRA",
  England: "ENG", Spain: "ESP", Belgium: "BEL", USA: "USA",
  Germany: "GER", Portugal: "POR", Netherlands: "NED", Croatia: "CRO",
};

function codeFor(teamName) {
  return TEAM_CODES[teamName] || teamName.slice(0, 3).toUpperCase();
}

async function main() {
  const todayEpochDay = Math.floor(Date.now() / 86400000);

  console.log("Fetching fixtures from TxLINE...");
  const res = await axios.get(`${apiBaseUrl}/fixtures/snapshot`, {
    headers,
    params: { startEpochDay: todayEpochDay },
  });

  const worldCupFixtures = res.data.filter((f) => f.Competition === "World Cup");
  console.log(`Found ${worldCupFixtures.length} World Cup fixtures.\n`);

  for (const f of worldCupFixtures) {
    const match = {
      id: String(f.FixtureId),
      home_team: f.Participant1,
      away_team: f.Participant2,
      home_code: codeFor(f.Participant1),
      away_code: codeFor(f.Participant2),
      kickoff_time: new Date(f.StartTime).toISOString(),
      competition: "World Cup",
      game_phase: "NS",
    };
    await upsertMatch(match);
    console.log(`Seeded: ${match.home_team} vs ${match.away_team} (${match.id})`);
  }

  console.log("\nDone seeding matches.");
}

main().catch((err) => {
  console.error("Seed failed:", err.response?.data || err.message);
  process.exit(1);
});
