import { phaseFromStatusId, GAME_PHASE_MAP } from "./game-phase.js";

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

function extractScore(message) {
  if (!message.Score) return null;
  const p1Goals = message.Score.Participant1?.Total?.Goals;
  const p2Goals = message.Score.Participant2?.Total?.Goals;
  if (typeof p1Goals !== "number" || typeof p2Goals !== "number") return null;

  const participant1IsHome = message.Participant1IsHome !== false;
  return participant1IsHome
    ? { home: p1Goals, away: p2Goals }
    : { home: p2Goals, away: p1Goals };
}

// Processes a batch of raw scores/snapshot messages against existing state.
// Returns a NEW state object. Messages already processed (by Id) are skipped.
//
// Real feed messages carry top-level StatusId and Score fields on many action
// types, not just "status" and "goal". We read these defensively off every
// message. IMPORTANT GUARD: a StatusId that doesn't map to a known phase
// (GAME_PHASE_MAP) is ignored rather than overwriting a known phase with
// UNKNOWN - this happens on some late-arriving housekeeping/connection
// messages after a match ends, and should never clobber a confirmed "F".
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
    if (typeof msg.StatusId === "number" && GAME_PHASE_MAP[msg.StatusId]) {
      const phase = phaseFromStatusId(msg.StatusId);
      if (phase.code !== next.gamePhase) {
        next.gamePhase = phase.code;
        next.gamePhaseName = phase.name;
        next.events.push({
          type: "status",
          phase: phase.code,
          phaseName: phase.name,
          ts: msg.Ts,
        });
      }
    }
    // If StatusId is missing or unrecognized, we simply skip the phase
    // update for this message - the last known good phase is preserved.

    const scoreFromMsg = extractScore(msg);
    if (scoreFromMsg && (scoreFromMsg.home !== next.scoreHome || scoreFromMsg.away !== next.scoreAway)) {
      next.scoreHome = scoreFromMsg.home;
      next.scoreAway = scoreFromMsg.away;
    }

    switch (msg.Action) {
      case "goal": {
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
        next.events.push({
          type: "score_adjustment",
          scoreHome: next.scoreHome,
          scoreAway: next.scoreAway,
          ts: msg.Ts,
        });
        break;
      }

      case "kickoff": {
        next.events.push({ type: "kickoff", ts: msg.Ts });
        break;
      }

      case "action_amend": {
        next.events.push({
          type: "amend",
          amendedAction: msg.Data?.Action ?? null,
          ts: msg.Ts,
        });
        break;
      }

      default:
        break;
    }

    next.lastProcessedId = msg.Id;
  }

  return next;
}

export function getRedCardEvents(state) {
  return state.events.filter((e) => e.type === "red_card");
}
