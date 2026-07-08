import { createInitialState, parseScoreUpdate, getRedCardEvents } from "./lib/scores-parser.js";
import { computeImpliedPct, isSignificantMove, buildMoveCaption } from "./lib/odds-detector.js";

console.log("=== Testing scores parser ===\n");

let state = createInitialState(18209181);
console.log("Initial state:", state);

// Simulate: kickoff, then a status change to H1
const batch1 = [
  { Id: 1, Action: "kickoff", Ts: 1000, Data: {} },
  { Id: 2, Action: "status", Ts: 1001, Data: { StatusId: 2, StatusName: "H1" } },
];
state = parseScoreUpdate(state, batch1);
console.log("\nAfter kickoff + H1 status:", state);

// Simulate: a goal for participant 1 (home, France) at 34:00 (Clock counts down from 2700s)
const batch2 = [
  {
    Id: 3,
    Action: "goal",
    Ts: 2000,
    Participant: 1,
    Participant1IsHome: true,
    Clock: { Running: true, Seconds: 660 }, // 34th minute of a 45-min half
    Data: { GoalType: "Shot", PlayerId: 3290005 },
    Score: {
      Participant1: { Total: { Goals: 1, YellowCards: 0, RedCards: 0, Corners: 2 } },
      Participant2: { Total: { Goals: 0, YellowCards: 0, RedCards: 0, Corners: 1 } },
    },
  },
];
state = parseScoreUpdate(state, batch2);
console.log("\nAfter goal:", state);

// Simulate: a red card for participant 2 (away, Morocco) at minute 72
const batch3 = [
  {
    Id: 4,
    Action: "red_card",
    Ts: 3000,
    Participant: 2,
    Clock: { Running: true, Seconds: 1080 }, // ~72nd minute
    Data: { PlayerId: 5020305, Type: "StraightRed" },
  },
];
state = parseScoreUpdate(state, batch3);
console.log("\nAfter red card:", state);
console.log("\nRed card events for scoring check:", getRedCardEvents(state));

// Simulate: match ends
const batch4 = [
  { Id: 5, Action: "status", Ts: 4000, Data: { StatusId: 5, StatusName: "F" } },
];
state = parseScoreUpdate(state, batch4);
console.log("\nAfter full-time status:", state);

// Test idempotency: replaying the SAME batch should change nothing
const stateBeforeReplay = JSON.stringify(state);
state = parseScoreUpdate(state, batch4);
const stateAfterReplay = JSON.stringify(state);
console.log("\nIdempotency check (should be true):", stateBeforeReplay === stateAfterReplay);

console.log("\n\n=== Testing odds detector ===\n");

// Simulate the real odds payload shape from our actual fetch test
const oddsBefore = computeImpliedPct({
  SuperOddsType: "1X2_PARTICIPANT_RESULT",
  PriceNames: ["part1", "draw", "part2"],
  Pct: ["61.125", "24.079", "14.780"],
  Ts: 1000,
});
console.log("Odds before:", oddsBefore);

const oddsAfter = computeImpliedPct({
  SuperOddsType: "1X2_PARTICIPANT_RESULT",
  PriceNames: ["part1", "draw", "part2"],
  Pct: ["78.500", "14.200", "7.300"],
  Ts: 2000,
});
console.log("Odds after (post-goal):", oddsAfter);

const significant = isSignificantMove(oddsBefore, oddsAfter);
console.log("\nIs this a significant move?", significant);

if (significant) {
  console.log("Caption:", buildMoveCaption(oddsBefore, oddsAfter, "France", "Morocco"));
}

// Test a non-significant move
const oddsSmallMove = computeImpliedPct({
  SuperOddsType: "1X2_PARTICIPANT_RESULT",
  PriceNames: ["part1", "draw", "part2"],
  Pct: ["63.000", "23.000", "14.000"],
  Ts: 1500,
});
console.log("\nSmall move significant?", isSignificantMove(oddsBefore, oddsSmallMove));
