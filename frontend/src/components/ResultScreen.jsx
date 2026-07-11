import React, { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ArrowLeft, Trophy, Share2, Check, X, Home, Download, ChevronDown, BarChart3, Users, Crown } from "lucide-react";
import { fetchNarrative, fetchPredictionResult, fetchRoom } from "../lib/mockApi.js";

const FLAG_ISO = { FRA: "fr", MAR: "ma", ARG: "ar", BRA: "br", ENG: "gb-eng", ESP: "es" };
function flagUrl(code, width) {
  return "https://flagcdn.com/w" + (width || 80) + "/" + (FLAG_ISO[code] || "un") + ".png";
}

export default function ResultScreen(props) {
  const match = props.match;
  const [narrative, setNarrative] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [groupDownloading, setGroupDownloading] = useState(false);
  const [count, setCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showData, setShowData] = useState(false);
  const [roomMembers, setRoomMembers] = useState(null);
  const shareCardRef = useRef(null);
  const groupCardRef = useRef(null);

  useEffect(function () {
    let active = true;
    Promise.all([
      fetchNarrative(match.id),
      fetchPredictionResult(props.predictionId, props.predictionText),
    ]).then(function (vals) {
      if (!active) return;
      setNarrative(vals[0]);
      setResult(vals[1]);
      setLoading(false);
      setShowConfetti(true);

      if (props.onResultLoaded) {
        props.onResultLoaded(vals[1].accuracyPct);
      }

      if (props.inviteCode) {
        fetchRoom(props.inviteCode, null).then(function (res) {
          if (!active) return;
          const you = { displayName: props.displayName || "You", accuracyPct: vals[1].accuracyPct, predictionText: props.predictionText, isYou: true };
          const combined = res.members.filter(function (m) { return m.accuracyPct !== null; }).concat([you]);
          combined.sort(function (a, b) { return b.accuracyPct - a.accuracyPct; });
          setRoomMembers(combined);
        });
      }
    });
    return function () { active = false; };
  }, [match.id, props.predictionId]);

  useEffect(function () {
    if (!result) return;
    let current = 0;
    const target = result.accuracyPct;
    const step = Math.max(1, Math.round(target / 30));
    const interval = setInterval(function () {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setCount(current);
    }, 24);
    return function () { clearInterval(interval); };
  }, [result]);

  function handleCopy() {
    setCopied(true);
    setTimeout(function () { setCopied(false); }, 1800);
  }

  async function downloadNode(node, filename, setBusy) {
    if (!node) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: "#070B14" });
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Could not generate image", err);
    }
    setBusy(false);
  }

  function handleDownload() {
    downloadNode(shareCardRef.current, "callthematch-" + match.homeCode + "-vs-" + match.awayCode + ".png", setDownloading);
  }

  function handleGroupDownload() {
    downloadNode(groupCardRef.current, "callthematch-room-" + (props.inviteCode || "group") + ".png", setGroupDownloading);
  }

  if (loading) {
    return (
      <div className="pt-16 flex flex-col items-center text-center">
        <div className="w-10 h-10 rounded-full border-2 border-line border-t-gold animate-spin"></div>
        <p className="text-slate text-sm font-mono mt-4">Scoring your call...</p>
      </div>
    );
  }

  return (
    <div className="pt-6 animate-rise pb-6 relative">
      {showConfetti && <Confetti />}

      <div className="flex items-center gap-3 mb-6">
        <img src={flagUrl(match.homeCode, 160)} alt={match.homeTeam} className="w-10 h-10 rounded-full object-cover shadow-md" />
        <span className="font-display font-semibold text-paper text-xl">
          {match.homeTeam} {result.finalScoreHome} - {result.finalScoreAway} {match.awayTeam}
        </span>
        <img src={flagUrl(match.awayCode, 160)} alt={match.awayTeam} className="w-10 h-10 rounded-full object-cover shadow-md" />
      </div>

      <AccuracyBadge count={count} />

      <div className="mt-8 bg-surface border border-gold/30 rounded-2xl p-5">
        <p className="text-gold text-xs font-mono uppercase tracking-wider mb-3">The story</p>
        <p className="text-paper text-[1.05rem] leading-relaxed">{narrative.funRecap}</p>
      </div>

      <ComparisonDiptych
        original={result.originalPredictionText}
        summary={result.comparisonSummary}
        breakdown={result.scoreBreakdown}
      />

      <GlobalLeaderboardTeaser onView={props.onViewGlobalLeaderboard} />

      {roomMembers && (
        <GroupResultCard
          groupCardRef={groupCardRef}
          match={match}
          members={roomMembers}
          inviteCode={props.inviteCode}
          onDownload={handleGroupDownload}
          downloading={groupDownloading}
        />
      )}

      <button
        onClick={function () { setShowData(!showData); }}
        className="mt-6 w-full flex items-center justify-between text-slate hover:text-paper text-sm font-mono uppercase tracking-wider px-1 transition-colors"
      >
        <span className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          For the data nerds
        </span>
        <ChevronDown className={"w-4 h-4 transition-transform " + (showData ? "rotate-180" : "")} />
      </button>

      {showData && (
        <div className="mt-3 bg-surface/50 border border-line rounded-2xl p-5 animate-rise">
          <p className="text-slate text-sm leading-relaxed">{narrative.marketNarrative}</p>
        </div>
      )}

      <ShareCard
        shareCardRef={shareCardRef}
        match={match}
        result={result}
        onCopy={handleCopy}
        copied={copied}
        onDownload={handleDownload}
        downloading={downloading}
      />

      <button
        onClick={props.onDone}
        className="mt-8 w-full flex items-center justify-center gap-2 bg-surface border border-line hover:border-pitch-bright text-paper font-display font-semibold text-base rounded-xl py-3.5 transition-colors"
      >
        <Home className="w-4 h-4" />
        Back to fixtures
      </button>
    </div>
  );
}

function AccuracyBadge(props) {
  return (
    <div className="flex flex-col items-center py-6">
      <div className="relative w-44 h-44 rounded-full flex items-center justify-center border-4 border-gold animate-glow-pulse">
        <div className="absolute inset-0 rounded-full bg-gold/5"></div>
        <div className="text-center">
          <div className="font-display font-black text-6xl text-gold leading-none">
            {props.count}
            <span className="text-3xl align-top">%</span>
          </div>
          <div className="text-slate text-[0.7rem] font-mono uppercase tracking-wider mt-1">
            Call accuracy
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-4 text-gold text-sm font-mono uppercase tracking-wider">
        <Trophy className="w-4 h-4" />
        Well called
      </div>
    </div>
  );
}

function ComparisonDiptych(props) {
  const b = props.breakdown;
  return (
    <div className="mt-8">
      <p className="text-slate text-xs font-mono uppercase tracking-wider mb-3 text-center">
        What you said vs what happened
      </p>

      <div className="relative bg-surface border border-line rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div className="p-5 border-b sm:border-b-0 sm:border-r border-line border-dashed">
            <p className="text-slate-faint text-[0.65rem] font-mono uppercase tracking-wider mb-2">You said</p>
            <p className="text-paper text-[0.95rem] leading-relaxed italic">"{props.original}"</p>
          </div>
          <div className="p-5">
            <p className="text-slate-faint text-[0.65rem] font-mono uppercase tracking-wider mb-2">What happened</p>
            <div className="flex flex-col gap-2">
              <BreakdownRow label="Winner" hit={b.winnerCorrect} />
              <BreakdownRow label="Scoreline" hit={b.scorelineCorrect} />
              {b.mentionedEventsMissed.length > 0 && (
                <BreakdownRow label="Red card called" hit={false} />
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-paper text-sm leading-relaxed mt-4 px-1">{props.summary}</p>
    </div>
  );
}

function BreakdownRow(props) {
  return (
    <div className="flex items-center gap-2">
      {props.hit ? (
        <Check className="w-4 h-4 text-pitch-bright shrink-0" />
      ) : (
        <X className="w-4 h-4 text-red shrink-0" />
      )}
      <span className="text-slate text-sm">{props.label}</span>
    </div>
  );
}

function GlobalLeaderboardTeaser(props) {
  return (
    <button
      onClick={props.onView}
      className="mt-6 w-full flex items-center justify-between bg-surface border border-line hover:border-gold rounded-2xl px-5 py-4 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <Trophy className="w-5 h-5 text-gold" />
        <div className="text-left">
          <p className="text-paper text-sm font-medium">See the global leaderboard</p>
          <p className="text-slate-faint text-xs">Where does your call rank against everyone else's</p>
        </div>
      </div>
      <span className="text-slate-faint group-hover:text-gold text-lg transition-colors">-{">"}</span>
    </button>
  );
}

function GroupResultCard(props) {
  const members = props.members;
  const youIndex = members.findIndex(function (m) { return m.isYou; });
  const yourRank = youIndex + 1;
  const beatenCount = members.length - 1 - youIndex >= 0 ? members.length - youIndex - 1 : 0;
  const totalOthers = members.length - 1;
  const isTop = yourRank === 1;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-gold" />
        <p className="text-slate text-xs font-mono uppercase tracking-wider">Group result</p>
      </div>

      <div ref={props.groupCardRef} className="bg-gradient-to-br from-surface to-ink border border-gold/30 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-pitch-bright/10 blur-2xl"></div>

        <div className="flex items-center justify-between mb-4">
          <span className="font-display font-bold text-paper text-base">CallTheMatch</span>
          <span className="text-slate-faint font-mono text-xs">Room {props.inviteCode}</span>
        </div>

        <p className="font-display font-black text-paper text-2xl leading-tight mb-1">
          {isTop
            ? "Top of the room."
            : "You beat " + beatenCount + " of " + totalOthers + " friends."}
        </p>
        <p className="text-slate text-sm mb-5">
          Ranked #{yourRank} of {members.length} on {props.match.homeTeam} vs {props.match.awayTeam}
        </p>

        <div className="flex flex-col gap-2">
          {members.map(function (m, i) {
            return <GroupRow key={m.displayName} member={m} rank={i + 1} />;
          })}
        </div>
      </div>

      <button
        onClick={props.onDownload}
        disabled={props.downloading}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-bright disabled:opacity-60 text-ink text-sm font-body font-semibold rounded-xl py-3 transition-colors"
      >
        <Download className="w-4 h-4" />
        {props.downloading ? "Rendering..." : "Download group card"}
      </button>
    </div>
  );
}

function GroupRow(props) {
  const m = props.member;
  return (
    <div
      className={
        "flex items-center gap-3 rounded-xl px-3 py-2.5 " +
        (m.isYou ? "bg-gold/10 border border-gold/40" : "bg-ink/40")
      }
    >
      <span className="w-5 text-center font-mono text-xs text-slate-faint shrink-0">
        {props.rank === 1 ? <Crown className="w-3.5 h-3.5 text-gold inline" /> : props.rank}
      </span>
      <span className={"flex-1 text-sm " + (m.isYou ? "text-gold font-semibold" : "text-paper")}>
        {m.isYou ? "You" : m.displayName}
      </span>
      <span className="font-mono text-sm text-paper">{m.accuracyPct}%</span>
    </div>
  );
}

function ShareCard(props) {
  const m = props.match;
  const r = props.result;
  const b = r.scoreBreakdown;

  return (
    <div className="mt-8">
      <p className="text-slate text-xs font-mono uppercase tracking-wider mb-3">Share card</p>

      <div ref={props.shareCardRef} className="bg-gradient-to-br from-surface to-ink border border-gold/30 rounded-2xl p-7 relative overflow-hidden">
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-pitch-bright/10 blur-2xl"></div>

        <div className="flex items-center justify-between mb-5">
          <span className="font-display font-bold text-paper text-base">CallTheMatch</span>
          <span className="text-gold font-mono text-sm">{r.accuracyPct}% accurate</span>
        </div>

        <div className="flex items-center justify-center gap-5 my-6">
          <img src={flagUrl(m.homeCode, 160)} alt={m.homeTeam} className="w-14 h-14 rounded-full object-cover shadow-md" crossOrigin="anonymous" />
          <span className="font-mono text-3xl text-paper font-bold">{r.finalScoreHome} - {r.finalScoreAway}</span>
          <img src={flagUrl(m.awayCode, 160)} alt={m.awayTeam} className="w-14 h-14 rounded-full object-cover shadow-md" crossOrigin="anonymous" />
        </div>

        <div className="h-px bg-line my-5"></div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <p className="text-slate-faint text-[0.6rem] font-mono uppercase tracking-wider mb-1">You said</p>
            <p className="text-paper text-sm italic leading-snug">"{r.originalPredictionText}"</p>
          </div>
          <div>
            <p className="text-slate-faint text-[0.6rem] font-mono uppercase tracking-wider mb-1">What actually happened</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <ShareStat label="Winner" hit={b.winnerCorrect} />
              <ShareStat label="Scoreline" hit={b.scorelineCorrect} />
              {b.mentionedEventsMissed.length > 0 && (
                <ShareStat label="Red card" hit={false} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-3">
        <button
          onClick={props.onCopy}
          className="flex-1 flex items-center justify-center gap-2 bg-surface border border-line hover:border-gold text-paper text-sm font-body rounded-xl py-3 transition-colors"
        >
          <Share2 className="w-4 h-4 text-gold" />
          {props.copied ? "Link copied" : "Copy link"}
        </button>
        <button
          onClick={props.onDownload}
          disabled={props.downloading}
          className="flex-1 flex items-center justify-center gap-2 bg-gold hover:bg-gold-bright disabled:opacity-60 text-ink text-sm font-body font-semibold rounded-xl py-3 transition-colors"
        >
          <Download className="w-4 h-4" />
          {props.downloading ? "Rendering..." : "Download PNG"}
        </button>
      </div>
    </div>
  );
}

function ShareStat(props) {
  return (
    <span className="text-xs font-mono flex items-center gap-1">
      {props.hit ? (
        <Check className="w-3 h-3 text-pitch-bright" />
      ) : (
        <X className="w-3 h-3 text-red" />
      )}
      <span className="text-slate">{props.label}</span>
    </span>
  );
}

function Confetti() {
  const pieces = [];
  const colors = ["#FFC533", "#2ED573", "#FF6B6B", "#F6F8FB"];
  for (let i = 0; i < 24; i++) {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.6;
    const color = colors[i % colors.length];
    pieces.push(
      <span
        key={i}
        className="absolute top-0 w-2 h-2 rounded-sm animate-confetti-fall"
        style={{ left: left + "%", backgroundColor: color, animationDelay: delay + "s" }}
      ></span>
    );
  }
  return <div className="absolute top-0 left-0 right-0 h-40 overflow-hidden pointer-events-none z-20">{pieces}</div>;
}