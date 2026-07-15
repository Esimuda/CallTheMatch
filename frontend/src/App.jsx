import React, { useState } from "react";
import { Radio, Mail, AlertTriangle, Home, Check } from "lucide-react";
import MatchList from "./components/MatchList.jsx";
import PredictionScreen from "./components/PredictionScreen.jsx";
import LiveMatch from "./components/LiveMatch.jsx";
import WaitingScreen from "./components/WaitingScreen.jsx";
import ResultScreen from "./components/ResultScreen.jsx";
import GlobalLeaderboard from "./components/GlobalLeaderboard.jsx";
import AccountRecovery from "./components/AccountRecovery.jsx";
import { RoomLobby } from "./components/RoomScreens.jsx";
import { createRoom } from "./lib/api.js";
import { getUserId, getDisplayName, setDisplayName as persistDisplayName, getRecoveryEmail } from "./lib/identity.js";

const FINISHED_PHASES = ["F", "FET", "FPE"];
const NOT_STARTED_PHASES = ["NS"];
// Genuinely live/in-progress phases only - anything not explicitly recognized
// (postponed, cancelled, abandoned, coverage suspended, or an unmapped code)
// must NOT fall through to the live view, or the user gets stuck watching a
// chart that will never update. See DEAD_PHASES below.
const LIVE_PHASES = ["H1", "HT", "H2", "WET", "ET1", "HTET", "ET2", "WPE", "PE"];
const DEAD_PHASES = ["A", "C", "TXCC", "TXCS", "P", "I"];

export default function App() {
  const [view, setView] = useState("home"); // home | predict | waiting | live | result | room | leaderboard
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [displayName, setDisplayNameState] = useState(getDisplayName());
  const [predictionText, setPredictionText] = useState("");
  const [predictionId, setPredictionId] = useState(null);
  const [inviteCode, setInviteCode] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [resultAccuracy, setResultAccuracy] = useState(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryLinked, setRecoveryLinked] = useState(!!getRecoveryEmail());

  const [leaderboardMatch, setLeaderboardMatch] = useState(null);
  const [leaderboardReturn, setLeaderboardReturn] = useState("home");

  function updateDisplayName(name) {
    setDisplayNameState(name);
    persistDisplayName(name);
  }

  function goHome() {
    setView("home");
    setSelectedMatch(null);
    setPredictionText("");
    setPredictionId(null);
    setInviteCode(null);
    setRoomId(null);
    setResultAccuracy(null);
  }

  function selectMatch(match) {
    setSelectedMatch(match);
    setView("predict");
  }

  function onPredictionSubmitted(id, text) {
    setPredictionId(id);
    setPredictionText(text);
  }

  // Decides where to go after "Watch Live" is tapped, based on the match's
  // ACTUAL current phase - not a blind jump to the live view every time.
  // NS (not started) -> waiting screen. Finished -> straight to results
  // (this is what makes testing against already-concluded matches work).
  // Recognized in-progress phases (H1/HT/H2/ET*/PE) -> the real live view.
  // Postponed/cancelled/abandoned/suspended, or any phase code we don't
  // recognize -> an explicit "unavailable" screen. Previously anything not
  // NS or finished fell through to "live" by default, which is what left
  // people stuck on a spinner for matches that were never going to go live.
  function goWatchOrWait() {
    if (!selectedMatch) return;
    const phase = selectedMatch.gamePhase;

    if (FINISHED_PHASES.includes(phase)) {
      setView("result");
    } else if (NOT_STARTED_PHASES.includes(phase)) {
      setView("waiting");
    } else if (LIVE_PHASES.includes(phase)) {
      setView("live");
    } else {
      setView("unavailable");
    }
  }

  async function handleCreateRoom() {
    const res = await createRoom(selectedMatch.id, getUserId(), displayName);
    setInviteCode(res.inviteCode);
    setRoomId(res.roomId);
    setView("room");
  }

  async function handleCreateRoomFromHome(match) {
    setSelectedMatch(match);
    const res = await createRoom(match.id, getUserId(), displayName);
    setInviteCode(res.inviteCode);
    setRoomId(res.roomId);
    setView("predict");
  }

  async function handleJoinRoom(code, name, match) {
    updateDisplayName(name);
    setInviteCode(code);
    setRoomId(null); // resolved from invite code on the server when submitting
    setSelectedMatch(match);
    setView("predict");
  }

  function handleViewLeaderboard(match, returnView) {
    setLeaderboardMatch(match);
    setLeaderboardReturn(returnView || "home");
    setView("leaderboard");
  }

  function openRecovery() {
    setShowRecovery(true);
  }

  function handleRecoveryClose() {
    setShowRecovery(false);
    setRecoveryLinked(!!getRecoveryEmail());
  }

  function handleEmailSaved() {
    setRecoveryLinked(true);
  }

  return (
    <div className="min-h-screen bg-ink text-paper font-body relative overflow-hidden">
      <TopBar
        view={view}
        recoveryLinked={recoveryLinked}
        onLogoClick={goHome}
        onOpenRecovery={openRecovery}
      />

      <main className="relative z-10 max-w-2xl mx-auto px-5 pb-24">
        {view === "home" && (
          <MatchList
            onSelectMatch={selectMatch}
            onJoinRoom={handleJoinRoom}
            onCreateRoomFromHome={handleCreateRoomFromHome}
            onViewLeaderboard={function (m) { handleViewLeaderboard(m, "home"); }}
            onOpenRecovery={openRecovery}
            recoveryLinked={recoveryLinked}
          />
        )}

        {view === "predict" && selectedMatch && (
          <PredictionScreen
            match={selectedMatch}
            displayName={displayName}
            setDisplayName={updateDisplayName}
            onBack={goHome}
            onSubmitted={onPredictionSubmitted}
            onGoLive={goWatchOrWait}
            onCreateRoom={handleCreateRoom}
            inviteCode={inviteCode}
            roomId={roomId}
            onGoToRoom={function () { setView("room"); }}
            onOpenRecovery={openRecovery}
            recoveryLinked={recoveryLinked}
          />
        )}

        {view === "room" && selectedMatch && inviteCode && (
          <RoomLobby
            inviteCode={inviteCode}
            onBack={function () { setView("predict"); }}
            onWatchLive={goWatchOrWait}
          />
        )}

        {view === "waiting" && selectedMatch && (
          <WaitingScreen
            match={selectedMatch}
            predictionText={predictionText}
            onDone={goHome}
          />
        )}

        {view === "unavailable" && selectedMatch && (
          <UnavailableScreen match={selectedMatch} onDone={goHome} />
        )}

        {view === "live" && selectedMatch && (
          <LiveMatch
            match={selectedMatch}
            predictionText={predictionText}
            onBack={function () { setView(inviteCode ? "room" : "predict"); }}
            onFinish={function () { setView("result"); }}
          />
        )}

        {view === "result" && selectedMatch && (
          <ResultScreen
            match={selectedMatch}
            predictionId={predictionId}
            predictionText={predictionText}
            displayName={displayName}
            inviteCode={inviteCode}
            onDone={goHome}
            onResultLoaded={function (pct) { setResultAccuracy(pct); }}
            onViewGlobalLeaderboard={function () { handleViewLeaderboard(selectedMatch, "result"); }}
            onOpenRecovery={openRecovery}
            recoveryLinked={recoveryLinked}
          />
        )}

        {view === "leaderboard" && leaderboardMatch && (
          <GlobalLeaderboard
            match={leaderboardMatch}
            displayName={displayName}
            yourAccuracy={leaderboardReturn === "result" ? resultAccuracy : null}
            yourPredictionText={leaderboardReturn === "result" ? predictionText : null}
            onBack={function () { setView(leaderboardReturn); }}
            onCallMatch={function () { selectMatch(leaderboardMatch); }}
          />
        )}
      </main>

      {showRecovery && (
        <AccountRecovery onClose={handleRecoveryClose} onEmailSaved={handleEmailSaved} />
      )}
    </div>
  );
}

const DEAD_PHASE_MESSAGES = {
  P: "This match has been postponed. Your call is still on file - check back once a new kickoff time is confirmed.",
  A: "This match was abandoned before it finished, so there's no final result to score your call against.",
  C: "This match was cancelled. Your call won't be scored - pick another fixture to play.",
  TXCC: "Live coverage for this match was cancelled on our data feed, so we can't show live odds or a result.",
  TXCS: "Live coverage for this match is temporarily suspended. Check back shortly.",
  I: "This match has been interrupted. We'll have an update once play resumes or the match is called off.",
};

function UnavailableScreen(props) {
  const match = props.match;
  const message =
    DEAD_PHASE_MESSAGES[match.gamePhase] ||
    "We don't have live data for this match right now. Your call is still saved - check back later.";

  return (
    <div className="py-16 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-red/10 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-8 h-8 text-red" />
      </div>

      <div className="space-y-2">
        <h2 className="font-display font-bold text-2xl text-paper">
          {match.homeTeam} vs {match.awayTeam}
        </h2>
        <p className="text-slate-faint max-w-sm mx-auto">{message}</p>
      </div>

      <button
        onClick={props.onDone}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gold text-ink font-semibold hover:bg-gold-bright transition-colors"
      >
        <Home className="w-4 h-4" />
        Back to matches
      </button>
    </div>
  );
}

function TopBar(props) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/90 backdrop-blur">
      <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
        <button
          onClick={props.onLogoClick}
          className="flex items-center gap-2 group"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-gold group-hover:bg-gold-bright transition-colors"></span>
          <span className="font-display font-bold text-lg tracking-tight text-paper">
            CallTheMatch
          </span>
        </button>

        <div className="flex items-center gap-4">
          {props.view === "live" && (
            <div className="flex items-center gap-1.5 text-red text-xs font-mono uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 animate-pulse-live" />
              Live
            </div>
          )}
          <button
            onClick={props.onOpenRecovery}
            className={
              props.recoveryLinked
                ? "flex items-center gap-1.5 px-3 py-2 rounded-full bg-pitch/15 border border-pitch/40 text-pitch-bright text-xs font-mono uppercase tracking-wide hover:border-pitch-bright transition-colors"
                : "flex items-center gap-2 px-3.5 py-2 rounded-full bg-gold/15 border border-gold/50 hover:bg-gold/25 hover:border-gold text-gold text-xs font-display font-semibold transition-colors shadow-sm shadow-gold/10"
            }
          >
            {props.recoveryLinked ? (
              <React.Fragment>
                <Check className="w-3.5 h-3.5" />
                <span>Calls linked</span>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <Mail className="w-4 h-4" />
                <span>Save your calls</span>
              </React.Fragment>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}