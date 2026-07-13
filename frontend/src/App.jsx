import React, { useState } from "react";
import { Radio, Mail } from "lucide-react";
import MatchList from "./components/MatchList.jsx";
import PredictionScreen from "./components/PredictionScreen.jsx";
import LiveMatch from "./components/LiveMatch.jsx";
import WaitingScreen from "./components/WaitingScreen.jsx";
import ResultScreen from "./components/ResultScreen.jsx";
import GlobalLeaderboard from "./components/GlobalLeaderboard.jsx";
import AccountRecovery from "./components/AccountRecovery.jsx";
import { RoomLobby } from "./components/RoomScreens.jsx";
import { createRoom } from "./lib/api.js";
import { getUserId, getDisplayName, setDisplayName as persistDisplayName } from "./lib/identity.js";

const FINISHED_PHASES = ["F", "FET", "FPE"];
const NOT_STARTED_PHASES = ["NS"];

export default function App() {
  const [view, setView] = useState("home"); // home | predict | waiting | live | result | room | leaderboard
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [displayName, setDisplayNameState] = useState(getDisplayName());
  const [predictionText, setPredictionText] = useState("");
  const [predictionId, setPredictionId] = useState(null);
  const [inviteCode, setInviteCode] = useState(null);
  const [resultAccuracy, setResultAccuracy] = useState(null);
  const [showRecovery, setShowRecovery] = useState(false);

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
  // Anything else (H1/HT/H2/ET*/PE) -> the real live view.
  function goWatchOrWait() {
    if (!selectedMatch) return;
    const phase = selectedMatch.gamePhase;

    if (FINISHED_PHASES.includes(phase)) {
      setView("result");
    } else if (NOT_STARTED_PHASES.includes(phase)) {
      setView("waiting");
    } else {
      setView("live");
    }
  }

  async function handleCreateRoom() {
    const res = await createRoom(selectedMatch.id, getUserId(), displayName);
    setInviteCode(res.inviteCode);
    setView("room");
  }

  async function handleCreateRoomFromHome(match) {
    setSelectedMatch(match);
    const res = await createRoom(match.id, getUserId(), displayName);
    setInviteCode(res.inviteCode);
    setView("predict");
  }

  async function handleJoinRoom(code, name, match) {
    updateDisplayName(name);
    setInviteCode(code);
    setSelectedMatch(match);
    setView("predict");
  }

  function handleViewLeaderboard(match, returnView) {
    setLeaderboardMatch(match);
    setLeaderboardReturn(returnView || "home");
    setView("leaderboard");
  }

  return (
    <div className="min-h-screen bg-ink text-paper font-body relative overflow-hidden">
      <TopBar
        view={view}
        onLogoClick={goHome}
        onOpenRecovery={function () { setShowRecovery(true); }}
      />

      <main className="relative z-10 max-w-2xl mx-auto px-5 pb-24">
        {view === "home" && (
          <MatchList
            onSelectMatch={selectMatch}
            onJoinRoom={handleJoinRoom}
            onCreateRoomFromHome={handleCreateRoomFromHome}
            onViewLeaderboard={function (m) { handleViewLeaderboard(m, "home"); }}
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
            onGoToRoom={function () { setView("room"); }}
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
        <AccountRecovery onClose={function () { setShowRecovery(false); }} />
      )}
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
            aria-label="Recover your calls"
            className="text-slate-faint hover:text-gold transition-colors"
          >
            <Mail className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
