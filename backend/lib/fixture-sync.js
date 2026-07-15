import axios from "axios";
import * as db from "./db.js";
import { apiBaseUrl, txlineHeaders } from "./txline.js";

const TEAM_CODES = {
  France: "FRA", Morocco: "MAR", Argentina: "ARG", Brazil: "BRA",
  England: "ENG", Spain: "ESP", Belgium: "BEL", USA: "USA",
  Germany: "GER", Portugal: "POR", Netherlands: "NED", Croatia: "CRO",
  Norway: "NOR", Switzerland: "SWI", Sweden: "SWE", Denmark: "DEN",
  Italy: "ITA", Uruguay: "URU", Mexico: "MEX", Japan: "JPN",
  Senegal: "SEN", Ghana: "GHA", Australia: "AUS", Canada: "CAN",
  Ecuador: "ECU", Qatar: "QAT", "Saudi Arabia": "KSA", "South Korea": "KOR",
  "Ivory Coast": "CIV", Cameroon: "CMR", Tunisia: "TUN", Poland: "POL",
  Serbia: "SRB", Wales: "WAL", Scotland: "SCO", "New Zealand": "NZL",
};

function codeFor(teamName) {
  return TEAM_CODES[teamName] || teamName.slice(0, 3).toUpperCase();
}

// Pulls World Cup fixtures from TxLINE and upserts them into Supabase.
// Existing matches keep their live phase/score - we only refresh identity
// fields (teams, kickoff). New fixtures are inserted as Not Started.
export async function syncFixturesFromFeed({ lookbackDays = 7, lookaheadDays = 21 } = {}) {
  const todayEpochDay = Math.floor(Date.now() / 86400000);
  const startEpochDay = todayEpochDay - lookbackDays;

  console.log(
    `[fixtures] Syncing World Cup fixtures from epoch day ${startEpochDay} (lookback ${lookbackDays}d, ahead ~${lookaheadDays}d)...`
  );

  const res = await axios.get(`${apiBaseUrl}/fixtures/snapshot`, {
    headers: txlineHeaders(),
    params: { startEpochDay },
    timeout: 30000,
  });

  const fixtures = (res.data || []).filter((f) => f.Competition === "World Cup");
  const maxKickoff = Date.now() + lookaheadDays * 24 * 60 * 60 * 1000;

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const f of fixtures) {
    const kickoffMs = new Date(f.StartTime).getTime();
    // Keep recently-past fixtures (for knowledge testing) and upcoming ones;
    // drop anything far in the future beyond lookahead.
    if (kickoffMs > maxKickoff) {
      skipped += 1;
      continue;
    }

    const id = String(f.FixtureId);
    const identity = {
      id,
      home_team: f.Participant1,
      away_team: f.Participant2,
      home_code: codeFor(f.Participant1),
      away_code: codeFor(f.Participant2),
      kickoff_time: new Date(f.StartTime).toISOString(),
      competition: "World Cup",
    };

    const existing = await db.getMatchById(id).catch(() => null);

    if (existing) {
      await db.upsertMatch({
        ...identity,
        // Preserve live state - never reset a finished/live match back to NS.
        game_phase: existing.game_phase,
        score_home: existing.score_home,
        score_away: existing.score_away,
      });
      updated += 1;
    } else {
      await db.upsertMatch({
        ...identity,
        game_phase: "NS",
        score_home: null,
        score_away: null,
      });
      inserted += 1;
      console.log(`  [fixtures] New: ${identity.home_team} vs ${identity.away_team} (${id})`);
    }
  }

  console.log(
    `[fixtures] Sync complete: ${inserted} new, ${updated} refreshed, ${skipped} beyond lookahead.`
  );

  return { inserted, updated, skipped, total: fixtures.length };
}
