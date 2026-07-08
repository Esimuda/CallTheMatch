import { phaseFromStatusId } from "./game-phase.js";

// Creates a fresh state object for a fixture, before any messages are processed.
export function createInitialState(fixtureId) {
  return {
    fixtureId,
    gamePhase: "NS",
    gamePhaseName: "Not Started",
    scoreHome: 0,
    scoreAway: 0,
    lastProcessedId: -1,
    events: [],
  };
}

// Pulls the current score out of a Score object, if present on a message.
// Score shape: { Participant1: { Total: { Goals, ... } }, Participant2: { Total: { Goals, ... } } }
// Participant1IsHome tells us which participant is home/away.
function extractScore(message) {
  if (!message.Score) return null;
  const p1Goals = message.Score.Participant1?.Total?.Goals ?? null;
  const p2Goals = message.Score.Participant2?.Total?.Goals ?? null;
  if (p1Goals === null || p2Goals === null) return null;

  const participant1IsHome = message.Participant1IsHome !== false; // default true
  return participant1IsHome
    ? { home: p1Goals, away: p2Goals }
    : { home: p2Goals, away: p1Goals };
}

// Processes a batch of raw scores/snapshot messages against existing state.
// Returns a NEW state object (does not mutate input). Messages already
// processed (by Id) are skipped, so this is safe to call repeatedly with
// overlapping message batches from polling.
export function parseScoreUpdate(state, rawMessages) {
  const newMessages = rawMessages
    .filter((m) => typeof m.Id === "number" && m.Id > state.lastProcessedId)
    .sort((a, b) => a.Id - b.Id);

  if (newMessages.length === 0) {
    return state;
  }

  let next = {
    ...state,
    events: [...state.events],
  };

  for (const msg of newMessages) {
    switch (msg.Action) {
      case "status": {
        const statusId = msg.Data?.StatusId;
        if (typeof statusId === "number") {
          const phase = phaseFromStatusId(statusId);
          next.gamePhase = phase.code;
          next.gamePhaseName = phase.name;
          next.events.push({
            type: "status",
            phase: phase.code,
            phaseName: phase.name,
            ts: msg.Ts,
          });
        }
        break;
      }

      case "goal": {
        const score = extractScore(msg);
        if (score) {
          next.scoreHome = score.home;
          next.scoreAway = score.away;
        }
        next.events.push({
          type: "goal",
          participant: msg.Participant,
          playerId: msg.Data?.PlayerId ?? null,
          goalType: msg.Data?.GoalType ?? null,
          scoreHome: next.scoreHome,
          scoreAway: next.scoreAway,
          minuteSeconds: msg.Clock?.Seconds ?? null,
          ts: msg.Ts,
        });
        break;
      }

      case "red_card": {
        next.events.push({
          type: "red_card",
          participant: msg.Participant,
          playerId: msg.Data?.PlayerId ?? null,
          cardType: msg.Data?.Type ?? null,
          minuteSeconds: msg.Clock?.Seconds ?? null,
          ts: msg.Ts,
        });
        break;
      }

      case "yellow_card": {
        next.events.push({
          type: "yellow_card",
          participant: msg.Participant,
          playerId: msg.Data?.PlayerId ?? null,
          minuteSeconds: msg.Clock?.Seconds ?? null,
          ts: msg.Ts,
        });
        break;
      }

      case "score_adjustment": {
        const score = extractScore(msg);
        if (score) {
          next.scoreHome = score.home;
          next.scoreAway = score.away;
          next.events.push({
            type: "score_adjustment",
            scoreHome: next.scoreHome,
            scoreAway: next.scoreAway,
            ts: msg.Ts,
          });
        }
        break;
      }

      case "kickoff": {
        next.events.push({ type: "kickoff", ts: msg.Ts });
        break;
      }

      default:
        // comment, coverage_update, possession, jersey, weather, etc.
        // Not relevant to phase/score/prediction tracking, ignored.
        break;
    }

    next.lastProcessedId = msg.Id;
  }

  return next;
}

// Convenience: pull just the red-card events with their minute, for
// checking against a user's "big moment" prediction.
export function getRedCardEvents(state) {
  return state.events.filter((e) => e.type === "red_card");
}
