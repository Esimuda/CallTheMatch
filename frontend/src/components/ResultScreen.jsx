import React, { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ArrowLeft, Trophy, Share2, Check, X, Home, Download, ChevronDown, BarChart3, Users, Crown, AlertTriangle, RotateCw } from "lucide-react";
import { fetchNarrative, fetchPredictionResult, fetchRoom } from "../lib/api.js";
import { getUserId } from "../lib/identity.js";
import { flagUrl } from "../lib/flags.js";

export default function ResultScreen(props) {
  const match = props.match;
  const [narrative, setNarrative] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
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
    setLoading(true);
    setError(null);

    Promise.all([
      // The narrative is a nice-to-have: if it isn't generated yet, show the
      // result without the story instead of failing the whole screen.
      fetchNarrative(match.id).catch(function () { return null; }),
      fetchPredictionResult(props.predictionId),
    ]).then(function (vals) {
      if (!active) return;
      setNarrative(vals[0]);
      setResult(vals[1]);
      setLoading(false);
      setShowConfetti(vals[1].accuracyPct >= 50);

      if (props.onResultLoaded) {
        props.onResultLoaded(vals[1].accuracyPct);
      }

      if (props.inviteCode) {
        // The server marks your own row (isYou) - your prediction was just
        // scored by the result fetch above, so it's included in members.
        fetchRoom(props.inviteCode, getUserId()).then(function (res) {
          if (!active) return;
          const scored = res.members.filter(function (m) { return m.accuracyPct !== null; });
          scored.sort(function (a, b) { return b.accuracyPct - a.accuracyPct; });
          if (scored.length > 0) setRoomMembers(scored);
        }).catch(function () {
          // Room card is optional - the rest of the result screen still works.
        });
      }
    }).catch(function (err) {
      if (!active) return;
      setError(err.message || "Could not load your result.");
      setLoading(false);
    });
    return function () { active = false; };
  }, [match.id, props.predictionId, retryKey]);

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
      // Pin width/height explicitly to the node's full scroll size. Without
      // this, html-to-image can clip the export to whatever was in the
      // viewport at capture time instead of the card's actual full height -
      // this is what was producing PNGs with the bottom of the card missing.
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: "#070B14",
        width: node.scrollWidth,
        height: node.scrollHeight,
        cacheBust: true,
      });
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

  if (error) {
    return (
      <div className="pt-16 flex flex-col items-center text-center px-4">
        <div className="w-16 h-16 rounded-full bg-red/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red" />
        </div>
        <h2 className="font-display font-bold text-xl text-paper mb-2">Couldn't score your call</h2>
        <p className="text-slate text-sm max-w-sm mb-6">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={function () { setRetryKey(retryKey + 1); }}
            className="flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink text-sm font-semibold rounded-xl px-5 py-3 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            Try again
          </button>
          <button
            onClick={props.onDone}
            className="flex items-center gap-2 bg-surface border border-line hover:border-pitch-bright text-paper text-sm rounded-xl px-5 py-3 transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to fixtures
          </button>
        </div>
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

      <AccuracyBadge count={count} accuracyPct={result.accuracyPct} />

      {narrative && narrative.funRecap && (
        <div className="mt-8 bg-surface border border-gold/30 rounded-2xl p-5">
          <p className="text-gold text-xs font-mono uppercase tracking-wider mb-3">The story</p>
          <p className="text-paper text-[1.05rem] leading-relaxed">{narrative.funRecap}</p>
        </div>
      )}

      <p className="text-center text-gold font-display font-semibold text-base mt-4 px-4">{result.celebrationLine}</p>

      <ComparisonDiptych
        original={result.originalPredictionText}
        summary={result.comparisonSummary}
        breakdown={result.scoreBreakdown}
        match={match}
        predictedWinner={result.predictedWinner}
        predictedScoreHome={result.predictedScoreHome}
        predictedScoreAway={result.predictedScoreAway}
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

      {narrative && narrative.marketNarrative && (
        <React.Fragment>
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
        </React.Fragment>
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

function badgeTier(accuracyPct) {
  if (accuracyPct >= 70) return { label: "Well called", showTrophy: true, ring: "border-gold animate-glow-pulse", text: "text-gold" };
  if (accuracyPct >= 40) return { label: "Half right", showTrophy: false, ring: "border-gold/50", text: "text-gold" };
  return { label: "Tough one", showTrophy: false, ring: "border-line", text: "text-slate" };
}

function AccuracyBadge(props) {
  const tier = badgeTier(props.accuracyPct);
  return (
    <div className="flex flex-col items-center py-6">
      <div className={"relative w-44 h-44 rounded-full flex items-center justify-center border-4 " + tier.ring}>
        <div className="absolute inset-0 rounded-full bg-gold/5"></div>
        <div className="text-center">
          <div className={"font-display font-black text-6xl leading-none " + tier.text}>
            {props.count}
            <span className="text-3xl align-top">%</span>
          </div>
          <div className="text-slate text-[0.7rem] font-mono uppercase tracking-wider mt-1">
            Call accuracy
          </div>
        </div>
      </div>
      <div className={"flex items-center gap-1.5 mt-4 text-sm font-mono uppercase tracking-wider " + tier.text}>
        {tier.showTrophy && <Trophy className="w-4 h-4" />}
        {tier.label}
      </div>
    </div>
  );
}

function formatEventTag(tag) {
  const words = tag.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function ComparisonDiptych(props) {
  const b = props.breakdown;
  return (
    <div className="mt-8">
      <p className="text-slate text-xs font-mono uppercase tracking-wider mb-3 text-center">
        What you called vs what happened
      </p>

      <div className="relative bg-surface border border-line rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div className="p-5 border-b sm:border-b-0 sm:border-r border-line border-dashed">
            <p className="text-slate-faint text-[0.65rem] font-mono uppercase tracking-wider mb-2">You called</p>
            <p className="text-paper text-base font-semibold leading-snug">{formatPredictedCall(props.match, props.predictedWinner, props.predictedScoreHome, props.predictedScoreAway)}</p>
          </div>
          <div className="p-5">
            <p className="text-slate-faint text-[0.65rem] font-mono uppercase tracking-wider mb-2">What happened</p>
            <div className="flex flex-col gap-2">
              <BreakdownRow label="Winner" hit={b.winnerCorrect} />
              <BreakdownRow label="Scoreline" hit={b.scorelineCorrect} />
              {(b.mentionedEventsHit || []).map(function (tag) {
                return <BreakdownRow key={tag} label={formatEventTag(tag) + " called"} hit={true} />;
              })}
              {(b.mentionedEventsMissed || []).map(function (tag) {
                return <BreakdownRow key={tag} label={formatEventTag(tag) + " called"} hit={false} />;
              })}
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
  const haveYou = youIndex !== -1;
  const yourRank = youIndex + 1;
  const beatenCount = haveYou ? members.length - youIndex - 1 : 0;
  const totalOthers = members.length - 1;
  const isTop = haveYou && yourRank === 1;

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
          {!haveYou
            ? "How the room called it."
            : isTop
            ? "Top of the room."
            : "You beat " + beatenCount + " of " + totalOthers + " friends."}
        </p>
        {haveYou && (
          <p className="text-slate text-sm mb-5">
            Ranked #{yourRank} of {members.length} on {props.match.homeTeam} vs {props.match.awayTeam}
          </p>
        )}
        {!haveYou && (
          <p className="text-slate text-sm mb-5">
            {props.match.homeTeam} vs {props.match.awayTeam}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {members.map(function (m, i) {
            return <GroupRow key={m.displayName + "-" + i} member={m} rank={i + 1} />;
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

function formatPredictedCall(match, winner, scoreHome, scoreAway) {
  const winnerText =
    winner === "home" ? match.homeTeam + " to win"
    : winner === "away" ? match.awayTeam + " to win"
    : winner === "draw" ? "A draw"
    : null;

  const hasScore = typeof scoreHome === "number" && typeof scoreAway === "number";

  if (winnerText && hasScore) return winnerText + ", " + scoreHome + "-" + scoreAway;
  if (winnerText) return winnerText;
  if (hasScore) return scoreHome + "-" + scoreAway;
  return "No clear call extracted";
}

function ShareCard(props) {
  const m = props.match;
  const r = props.result;

  const yourCall = formatPredictedCall(m, r.predictedWinner, r.predictedScoreHome, r.predictedScoreAway);
  const actualResult = m.homeTeam + " " + r.finalScoreHome + " - " + r.finalScoreAway + " " + m.awayTeam;

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

        <div className="grid grid-cols-1 gap-4">
          <div>
            <p className="text-slate-faint text-[0.6rem] font-mono uppercase tracking-wider mb-1">You called</p>
            <p className="text-paper text-sm font-semibold leading-snug">{yourCall}</p>
          </div>
          <div>
            <p className="text-slate-faint text-[0.6rem] font-mono uppercase tracking-wider mb-1">What happened</p>
            <p className="text-paper text-sm font-semibold leading-snug">{actualResult}</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="font-display font-black text-5xl text-gold leading-none">{r.accuracyPct}%</p>
          <p className="text-slate-faint text-[0.65rem] font-mono uppercase tracking-wider mt-2">Call accuracy</p>
        </div>

        <div className="h-px bg-line my-5"></div>

        <p className="text-slate-faint text-xs text-center">Call it before the final whistle - CallTheMatch</p>
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