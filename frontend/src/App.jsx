import React, { useState } from "react";
import { Radio } from "lucide-react";
import MatchList from "./components/MatchList.jsx";
import PredictionScreen from "./components/PredictionScreen.jsx";
import LiveMatch from "./components/LiveMatch.jsx";
import ResultScreen from "./components/ResultScreen.jsx";
import { RoomLobby } from "./components/RoomScreens.jsx";
import { createRoom } from "./lib/mockApi.js";

export default function App() {
  const [view, setView] = useState("home"); // home | predict | live | result | room
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [predictionText, setPredictionText] = useState("");
  const [predictionId, setPredictionId] = useState(null);
  const [inviteCode, setInviteCode] = useState(null);

  function goHome() {
    setView("home");
    setSelectedMatch(null);
    setPredictionText("");
    setPredictionId(null);
    setInviteCode(null);
  }

  function selectMatch(match) {
    setSelectedMatch(match);
    setView("predict");
  }

  function onPredictionSubmitted(id, text) {
    setPredictionId(id);
    setPredictionText(text);
  }

  async function handleCreateRoom() {
    const res = await createRoom(selectedMatch.id, "local-demo-user", displayName);
    setInviteCode(res.inviteCode);
    setView("room");
  }

  // Create a room directly from Home, before any prediction exists yet.
  // Sets the match, creates the room, and drops the user into the prediction
  // screen with the invite code already attached.
  async function handleCreateRoomFromHome(match) {
    setSelectedMatch(match);
    const res = await createRoom(match.id, "local-demo-user", displayName);
    setInviteCode(res.inviteCode);
    setView("predict");
  }

  async function handleJoinRoom(code, name, match) {
    setDisplayName(name);
    setInviteCode(code);
    setSelectedMatch(match);
    setView("predict");
  }

  return (
    <div className="min-h-screen bg-ink text-paper font-body relative overflow-hidden">
      <TopBar view={view} onLogoClick={goHome} />

      <main className="relative z-10 max-w-2xl mx-auto px-5 pb-24">
        {view === "home" && (
          <MatchList
            onSelectMatch={selectMatch}
            onJoinRoom={handleJoinRoom}
            onCreateRoomFromHome={handleCreateRoomFromHome}
          />
        )}

        {view === "predict" && selectedMatch && (
          <PredictionScreen
            match={selectedMatch}
            displayName={displayName}
            setDisplayName={setDisplayName}
            onBack={goHome}
            onSubmitted={onPredictionSubmitted}
            onGoLive={function () { setView("live"); }}
            onCreateRoom={handleCreateRoom}
            inviteCode={inviteCode}
            onGoToRoom={function () { setView("room"); }}
          />
        )}

        {view === "room" && selectedMatch && inviteCode && (
          <RoomLobby
            inviteCode={inviteCode}
            onBack={function () { setView("predict"); }}
            onWatchLive={function () { setView("live"); }}
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
          />
        )}
      </main>
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

        {props.view === "live" && (
          <div className="flex items-center gap-1.5 text-red text-xs font-mono uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse-live" />
            Live
          </div>
        )}
      </div>
    </header>
  );
}