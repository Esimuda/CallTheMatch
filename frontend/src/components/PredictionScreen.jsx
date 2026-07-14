import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, ArrowLeft, Send, Check, Sparkles, Radio, Users, Brain } from "lucide-react";
import { submitPrediction } from "../lib/api.js";
import { getUserId } from "../lib/identity.js";
import { flagUrl } from "../lib/flags.js";

const FINISHED_PHASES = ["F", "FET", "FPE"];

export default function PredictionScreen(props) {
  const match = props.match;
  // Recall mode: the match has already been played, so the user is testing
  // their knowledge of what happened instead of predicting what will.
  const isRecall = FINISHED_PHASES.includes(match.gamePhase);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [nameInput, setNameInput] = useState(props.displayName || "");
  const [submitting, setSubmitting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [predictionId, setPredictionId] = useState(null);
  const [creatingRoom, setCreatingRoom] = useState(false);

  const isFirstTimeRef = useRef(!props.displayName);
  const recognitionRef = useRef(null);

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

    setExtracted(result.extracted);
    setPredictionId(result.predictionId);
    setSubmitting(false);
    props.onSubmitted(result.predictionId, text.trim());
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

  if (extracted) {
    return (
      <ConfirmationCard
        match={match}
        text={text}
        extracted={extracted}
        isRecall={isRecall}
        onGoLive={props.onGoLive}
        onPlayWithFriends={handlePlayWithFriends}
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

      {props.inviteCode && (
        <div className="mt-4 flex items-center gap-2 bg-pitch/10 border border-pitch/40 rounded-xl px-4 py-2.5">
          <Users className="w-4 h-4 text-pitch-bright" />
          <span className="text-paper text-sm">Joining room <span className="font-mono text-gold">{props.inviteCode}</span></span>
        </div>
      )}

      {isRecall && (
        <div className="mt-4 flex items-center gap-2 bg-gold/10 border border-gold/40 rounded-xl px-4 py-2.5">
          <Brain className="w-4 h-4 text-gold" />
          <span className="text-paper text-sm">This match has been played - call it from memory.</span>
        </div>
      )}

      <p className="text-gold font-mono text-xs uppercase tracking-[0.2em] mt-8 mb-2">
        {isRecall ? "Your recall" : "Your call"}
      </p>
      <h2 className="font-display font-bold text-2xl text-paper mb-5">
        {isRecall ? "Tell us what you think happened." : "Tell us what you think will happen."}
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
            {isRecall ? "Lock in my answer" : "Lock in my call"}
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

function ConfirmationCard(props) {
  const e = props.extracted;
  return (
    <div className="pt-6 animate-rise">
      <div className="flex items-center gap-2 text-pitch-bright mb-6">
        <Check className="w-5 h-5" />
        <span className="font-mono text-xs uppercase tracking-wider">Call locked in</span>
      </div>

      <h2 className="font-display font-bold text-2xl text-paper mb-1">
        Here's what we understood.
      </h2>
      <p className="text-slate text-sm mb-6">
        {props.isRecall
          ? "Take a look - we'll score this against what actually happened."
          : "Take a look - this is what we'll score you against once the match ends."}
      </p>

      <div className="bg-surface border border-gold/30 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gold/10 blur-2xl"></div>

        <p className="text-slate-faint text-xs font-mono uppercase tracking-wider mb-2">Your words</p>
        <p className="text-paper text-[1.05rem] leading-relaxed font-body italic mb-5">
          "{props.text}"
        </p>

        <div className="h-px bg-line mb-5"></div>

        <p className="text-slate-faint text-xs font-mono uppercase tracking-wider mb-3">What we extracted</p>
        <div className="grid grid-cols-2 gap-3">
          <ExtractedField label="Winner" value={e.winner === "home" ? props.match.homeTeam : (e.winner === "away" ? props.match.awayTeam : "Draw")} />
          <ExtractedField label="Scoreline" value={e.scoreHome + " - " + e.scoreAway} />
          {e.mentionedPlayers.length > 0 && (
            <ExtractedField label="Players called" value={e.mentionedPlayers.join(", ")} />
          )}
          <ExtractedField label="Confidence" value={e.confidence} />
        </div>

        {e.mentionedEvents.length > 0 && (
          <div className="mt-4 bg-pitch/10 border border-pitch/40 rounded-xl px-3 py-2.5">
            <p className="text-gold text-sm">Also flagged: possible red card, second half</p>
          </div>
        )}
      </div>

      <p className="text-slate-faint text-xs text-center mt-4">
        Didn't get it right? Just submit a new call - it replaces this one.
      </p>

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