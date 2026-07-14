// Shared team-code -> flagcdn ISO mapping. Codes come from the backend's
// seed (TEAM_CODES in seed-matches.js, falling back to the first three
// letters of the team name uppercased), so include both FIFA-style codes
// and the 3-letter fallbacks (e.g. Switzerland -> "SWI", not "SUI").
const FLAG_ISO = {
  ARG: "ar", AUS: "au", AUT: "at", BEL: "be", BRA: "br", CAN: "ca",
  CHI: "cl", CIV: "ci", CMR: "cm", COL: "co", CRO: "hr", DEN: "dk",
  ECU: "ec", EGY: "eg", ENG: "gb-eng", ESP: "es", FRA: "fr", GER: "de",
  GHA: "gh", GRE: "gr", IRN: "ir", ITA: "it", JPN: "jp", JOR: "jo",
  KOR: "kr", KSA: "sa", MAR: "ma", MEX: "mx", NED: "nl", NET: "nl",
  NGA: "ng", NOR: "no", NZL: "nz", PAN: "pa", PAR: "py", PER: "pe",
  POL: "pl", POR: "pt", QAT: "qa", SCO: "gb-sct", SEN: "sn", SRB: "rs",
  SUI: "ch", SWI: "ch", SWE: "se", TUN: "tn", TUR: "tr", URU: "uy",
  USA: "us", UZB: "uz", WAL: "gb-wls",
};

export function flagUrl(code, width) {
  const iso = FLAG_ISO[code] || "un";
  return "https://flagcdn.com/w" + (width || 80) + "/" + iso + ".png";
}
