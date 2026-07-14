import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, ArrowLeft, Send, Check, Sparkles, Radio, Users, Brain, Pencil } from "lucide-react";
import { submitPrediction, fetchMyPrediction } from "../lib/api.js";
import { getUserId, savePredictionForMatch, getCachedPredictionForMatch } from "../lib/identity.js";
import { flagUrl } from "../lib/flags.js";

const FINISHED_PHASES = ["F", "FET", "FPE"];

export default function PredictionScreen(props) {
  const match = props.match;
  const isRecall = FINISHED_PHASES.includes(match.gamePhase);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [nameInput, setNameInput] = useState(props.displayName || "");
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [extracted, setExtracted] = useState(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [editing, setEditing] = useState(false);

  const isFirstTimeRef = useRef(!props.displayName);
  const recognitionRef = useRef(null);

  useEffect(function () {
    let active = true;
    setLoadingExisting(true);
    setEditing(false);
    setExtracted(null);

    fetchMyPrediction(match.id)
      .then(function (data) {
        if (!active) return;
        if (data) {
          applyExistingPrediction(data.predictionId, data.predictionText, data.extracted);
        } else {
          const cached = getCachedPredictionForMatch(match.id);
          if (cached) {
            setText(cached.predictionText || "");
            props.onSubmitted(cached.predictionId, cached.predictionText || "");
          }
        }
        setLoadingExisting(false);
      })
      .catch(function () {
        if (!active) return;
        const cached = getCachedPredictionForMatch(match.id);
        if (cached) {
          setText(cached.predictionText || "");
          props.onSubmitted(cached.predictionId, cached.predictionText || "");
        }
        setLoadingExisting(false);
      });

    return function () { active = false; };
  }, [match.id]);

  function applyExistingPrediction(id, predictionText, extractedData) {
    setText(predictionText);
    setExtracted(extractedData);
    props.onSubmitted(id, predictionText);
    savePredictionForMatch(match.id, { predictionId: id, predictionText });
  }

  useEffect(function () {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = function (event) {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setText(transcript);
      };

      recognition.onend = function () {
        setListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  function toggleListening() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  }

  const needsName = isFirstTimeRef.current && !nameInput.trim();

  async function handleSubmit() {
    if (!text.trim() || needsName || submitting) return;
    setSubmitting(true);
    props.setDisplayName(nameInput.trim());

    const result = await submitPrediction({
      userId: getUserId(),
      displayName: nameInput.trim(),
      matchId: match.id,
      roomId: props.inviteCode || null,
      predictionText: text.trim(),
    });

    applyExistingPrediction(result.predictionId, text.trim(), result.extracted);
    setEditing(false);
    setSubmitting(false);
  }

  async function handlePlayWithFriends() {
    if (props.inviteCode) {
      props.onGoToRoom();
      return;
    }
    setCreatingRoom(true);
    await props.onCreateRoom();
    setCreatingRoom(false);
  }

  if (loadingExisting) {
    return (
      <div className="pt-16 flex flex-col items-center text-center">
        <div className="w-10 h-10 rounded-full border-2 border-line border-t-gold animate-spin"></div>
        <p className="text-slate text-sm font-mono mt-4">Loading your call...</p>
      </div>
    );
  }

  if (extracted && !editing) {
    return (
      <ConfirmationCard
        match={match}
        text={text}
        extracted={extracted}
        isRecall={isRecall}
        onBack={props.onBack}
        onGoLive={props.onGoLive}
        onPlayWithFriends={handlePlayWithFriends}
        onEdit={function () { setEditing(true); }}
        creatingRoom={creatingRoom}
        alreadyInRoom={!!props.inviteCode}
      />
    );
  }

  return (
    <div className="pt-6 animate-rise">
      <button onClick={props.onBack} className="flex items-center gap-1.5 text-slate hover:text-paper text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        All fixtures
      </button>

      <MatchStrip match={match} />

      {editing && (
        <div className="mt-4 flex items-center justify-between gap-3 bg-gold/10 border border-gold/40 rounded-xl px-4 py-2.5">
          <span className="text-paper text-sm">Editing your locked-in call.</span>
          <button
            onClick={function () { setEditing(false); }}
            className="text-gold text-xs font-mono uppercase tracking-wider hover:text-gold-bright shrink-0"
          >
            Cancel
          </button>
        </div>
      )}

      {props.inviteCode && (
        <div className="mt-4 flex items-center gap-2 bg-pitch/10 border border-pitch/40 rounded-xl px-4 py-2.5">
          <Users className="w-4 h-4 text-pitch-bright" />
          <span className="text-paper text-sm">Joining room <span className="font-mono text-gold">{props.inviteCode}</span></span>
        </div>
      )}

      {isRecall && !editing && (
        <div className="mt-4 flex items-center gap-2 bg-gold/10 border border-gold/40 rounded-xl px-4 py-2.5">
          <Brain className="w-4 h-4 text-gold" />
          <span className="text-paper text-sm">This match has been played - call it from memory.</span>
        </div>
      )}

      <p className="text-gold font-mono text-xs uppercase tracking-[0.2em] mt-8 mb-2">
        {isRecall ? "Your recall" : "Your call"}
      </p>
      <h2 className="font-display font-bold text-2xl text-paper mb-5">
        {editing
          ? "Update what you think will happen."
          : isRecall
          ? "Tell us what you think happened."
          : "Tell us what you think will happen."}
      </h2>

      <div className="relative bg-surface border border-line rounded-2xl focus-within:border-gold transition-colors">
        <textarea
          value={text}
          onChange={function (e) { setText(e.target.value); }}
          placeholder={isRecall
            ? "I'm pretty sure it finished 2-1, they scored late, and someone got sent off..."
            : "I think France wins 2-1, Mbappe scores, maybe a red card for Morocco in the second half..."}
          rows={6}
          className="w-full bg-transparent resize-none px-5 py-4 pr-16 text-paper placeholder-slate-faint outline-none text-[1.05rem] leading-relaxed font-body"
        />

        {speechSupported && (
          <button
            onClick={toggleListening}
            aria-label={listening ? "Stop recording" : "Start recording"}
            className={
              "absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center transition-colors " +
              (listening ? "bg-red text-paper" : "bg-pitch text-ink hover:bg-pitch-bright")
            }
          >
            {listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
      </div>

      {listening && (
        <div className="flex items-center gap-2 mt-3 text-red text-xs font-mono uppercase tracking-wider">
          <Radio className="w-3.5 h-3.5 animate-pulse-live" />
          Listening
        </div>
      )}

      {isFirstTimeRef.current && (
        <div className="mt-5 animate-rise">
          <label className="block text-slate text-xs font-mono uppercase tracking-wider mb-2">
            What should we call you?
          </label>
          <input
            type="text"
            value={nameInput}
            onChange={function (e) { setNameInput(e.target.value); }}
            placeholder="Your display name"
            autoComplete="off"
            className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-paper placeholder-slate-faint outline-none focus:border-gold transition-colors"
          />
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!text.trim() || needsName || submitting}
        className="mt-6 w-full bg-gold hover:bg-gold-bright disabled:bg-surface-alt disabled:text-slate-faint text-ink font-display font-semibold text-base rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors"
      >
        {submitting ? (
          <React.Fragment>
            <Sparkles className="w-4 h-4 animate-pulse-live" />
            Reading your call...
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Send className="w-4 h-4" />
            {editing ? "Update my call" : isRecall ? "Lock in my answer" : "Lock in my call"}
          </React.Fragment>
        )}
      </button>
    </div>
  );
}

function MatchStrip(props) {
  const m = props.match;
  return (
    <div className="flex items-center gap-4 bg-surface border border-line rounded-2xl px-5 py-4">
      <img src={flagUrl(m.homeCode, 160)} alt={m.homeTeam} className="w-12 h-12 rounded-full object-cover shadow-md" />
      <div className="flex-1 text-center font-display font-semibold text-paper text-lg">
        {m.homeTeam} <span className="text-slate-faint font-body font-normal text-sm">vs</span> {m.awayTeam}
      </div>
      <img src={flagUrl(m.awayCode, 160)} alt={m.awayTeam} className="w-12 h-12 rounded-full object-cover shadow-md" />
    </div>
  );
}

function formatExtractedWinner(match, winner) {
  if (winner === "home") return match.homeTeam;
  if (winner === "away") return match.awayTeam;
  if (winner === "draw") return "Draw";
  return "Not clear";
}

function formatExtractedScore(scoreHome, scoreAway) {
  if (typeof scoreHome === "number" && typeof scoreAway === "number") {
    return scoreHome + " - " + scoreAway;
  }
  return "Not called";
}

function ConfirmationCard(props) {
  const e = props.extracted;
  return (
    <div className="pt-6 animate-rise">
      <button onClick={props.onBack} className="flex items-center gap-1.5 text-slate hover:text-paper text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        All fixtures
      </button>

      <div className="flex items-center gap-2 text-pitch-bright mb-6">
        <Check className="w-5 h-5" />
        <span className="font-mono text-xs uppercase tracking-wider">Call locked in</span>
      </div>

      <h2 className="font-display font-bold text-2xl text-paper mb-1">
        Your call is saved on this device.
      </h2>
      <p className="text-slate text-sm mb-6">
        {props.isRecall
          ? "We'll score this against what actually happened."
          : "Come back any time - we remember your call for this match."}
      </p>

      <div className="bg-surface border border-gold/30 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gold/10 blur-2xl"></div>

        <p className="text-slate-faint text-xs font-mono uppercase tracking-wider mb-3">What we understood</p>
        <div className="grid grid-cols-2 gap-3">
          <ExtractedField label="Winner" value={formatExtractedWinner(props.match, e.winner)} />
          <ExtractedField label="Scoreline" value={formatExtractedScore(e.scoreHome, e.scoreAway)} />
          {e.mentionedPlayers && e.mentionedPlayers.length > 0 && (
            <ExtractedField label="Players called" value={e.mentionedPlayers.join(", ")} />
          )}
          <ExtractedField label="Confidence" value={e.confidence} />
        </div>
      </div>

      <button
        onClick={props.onEdit}
        className="mt-4 w-full flex items-center justify-center gap-2 text-slate hover:text-gold text-sm font-mono uppercase tracking-wider transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        Edit my call
      </button>

      <div className="flex gap-3 mt-6">
        <button
          onClick={props.onPlayWithFriends}
          disabled={props.creatingRoom}
          className="flex-1 flex items-center justify-center gap-2 bg-surface border border-gold/40 hover:border-gold disabled:opacity-60 text-gold font-display font-semibold text-sm rounded-xl py-3.5 transition-colors"
        >
          <Users className="w-4 h-4" />
          {props.creatingRoom ? "Setting up..." : (props.alreadyInRoom ? "Go to room" : "Play with friends")}
        </button>
        <button
          onClick={props.onGoLive}
          className="flex-1 bg-pitch hover:bg-pitch-bright text-ink font-display font-semibold text-sm rounded-xl py-3.5 transition-colors"
        >
          {props.isRecall ? "See how I did" : "Watch live"}
        </button>
      </div>
    </div>
  );
}

function ExtractedField(props) {
  return (
    <div className="bg-ink/40 rounded-lg px-3 py-2">
      <p className="text-slate-faint text-[0.65rem] font-mono uppercase tracking-wider">{props.label}</p>
      <p className="text-paper font-mono text-sm mt-0.5 capitalize">{props.value}</p>
    </div>
  );
}
