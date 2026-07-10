import React, { useState } from "react";
import { Radio } from "lucide-react";
import MatchList from "./components/MatchList.jsx";
import PredictionScreen from "./components/PredictionScreen.jsx";
import LiveMatch from "./components/LiveMatch.jsx";
import ResultScreen from "./components/ResultScreen.jsx";

export default function App() {
  const [view, setView] = useState("home"); // home | predict | live | result
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [predictionText, setPredictionText] = useState("");
  const [predictionId, setPredictionId] = useState(null);

  function goHome() {
    setView("home");
    setSelectedMatch(null);
    setPredictionText("");
    setPredictionId(null);
  }

  function selectMatch(match) {
    setSelectedMatch(match);
    setView("predict");
  }

  function onPredictionSubmitted(id, text) {
    setPredictionId(id);
    setPredictionText(text);
  }

  return (
    <div className="min-h-screen bg-ink text-paper font-body relative overflow-hidden">
      <TopBar view={view} onLogoClick={goHome} />

      <main className="relative z-10 max-w-2xl mx-auto px-5 pb-24">
        {view === "home" && (
          <MatchList onSelectMatch={selectMatch} />
        )}

        {view === "predict" && selectedMatch && (
          <PredictionScreen
            match={selectedMatch}
            displayName={displayName}
            setDisplayName={setDisplayName}
            onBack={goHome}
            onSubmitted={onPredictionSubmitted}
            onGoLive={function () { setView("live"); }}
          />
        )}

        {view === "live" && selectedMatch && (
          <LiveMatch
            match={selectedMatch}
            predictionText={predictionText}
            onBack={function () { setView("predict"); }}
            onFinish={function () { setView("result"); }}
          />
        )}

        {view === "result" && selectedMatch && (
          <ResultScreen
            match={selectedMatch}
            predictionId={predictionId}
            predictionText={predictionText}
            displayName={displayName}
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