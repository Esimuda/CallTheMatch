import React, { useEffect, useState } from "react";
import { ArrowLeft, Trophy, Crown, Users, Megaphone } from "lucide-react";
import { fetchGlobalLeaderboard } from "../lib/api.js";
import { flagUrl } from "../lib/flags.js";

export default function GlobalLeaderboard(props) {
  const match = props.match;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(function () {
    let active = true;
    const yourEntry = (props.yourAccuracy !== null && props.yourAccuracy !== undefined)
      ? { displayName: props.displayName, accuracyPct: props.yourAccuracy, predictionText: props.yourPredictionText }
      : null;

    fetchGlobalLeaderboard(match.id, yourEntry).then(function (res) {
      if (active) {
        setData(res);
        setLoading(false);
      }
    }).catch(function () {
      if (active) {
        setLoading(false);
      }
    });
    return function () { active = false; };
  }, [match.id, props.yourAccuracy]);

  if (loading) {
    return (
      <div className="pt-16 flex flex-col items-center text-center">
        <div className="w-10 h-10 rounded-full border-2 border-line border-t-gold animate-spin"></div>
        <p className="text-slate text-sm font-mono mt-4">Pulling the leaderboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pt-16 flex flex-col items-center text-center px-4">
        <p className="text-paper text-sm font-medium mb-2">Couldn't load the leaderboard.</p>
        <button onClick={props.onBack} className="flex items-center gap-1.5 text-slate hover:text-paper text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    );
  }

  const top3 = data.entries.slice(0, 3);
  const rest = data.entries.slice(3);
  const haveYou = data.yourRank !== null;

  return (
    <div className="pt-6 animate-screen-in pb-6">
      <button onClick={props.onBack} className="flex items-center gap-1.5 text-slate hover:text-paper text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-center gap-2 text-gold mb-2">
        <Trophy className="w-5 h-5" />
        <span className="font-mono text-xs uppercase tracking-wider">Global leaderboard</span>
      </div>

      <div className="flex items-center gap-3 mb-1">
        <img src={flagUrl(match.homeCode, 80)} alt={match.homeTeam} className="w-8 h-8 rounded-full object-cover shadow-md" />
        <h2 className="font-display font-bold text-2xl text-paper">
          {match.homeTeam} <span className="text-slate-faint font-body font-normal text-lg">vs</span> {match.awayTeam}
        </h2>
        <img src={flagUrl(match.awayCode, 80)} alt={match.awayTeam} className="w-8 h-8 rounded-full object-cover shadow-md" />
      </div>
      <p className="text-slate text-sm mb-6 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" />
        {data.totalPredictions.toLocaleString()} people called this match
      </p>

      {haveYou && (
        <div className="bg-gradient-to-br from-surface to-ink border border-gold/40 rounded-2xl p-5 mb-6 animate-glow-pulse">
          <p className="text-slate-faint text-[0.65rem] font-mono uppercase tracking-wider mb-1">Your standing</p>
          <p className="font-display font-black text-paper text-2xl leading-tight">
            Rank #{data.yourRank}
          </p>
          {data.beatPct !== null && (
            <p className="text-gold text-sm mt-1">
              Better than {data.beatPct}% of everyone who called this match
            </p>
          )}
        </div>
      )}

      {!haveYou && (
        <div className="bg-surface border border-dashed border-line rounded-2xl p-5 mb-6 flex items-start gap-3">
          <Megaphone className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-paper text-sm font-medium mb-1">You haven't called this one yet.</p>
            <p className="text-slate text-sm mb-3">Make your call and see where you'd land.</p>
            <button
              onClick={props.onCallMatch}
              className="bg-gold hover:bg-gold-bright text-ink text-sm font-display font-semibold rounded-lg px-4 py-2 transition-colors"
            >
              Make your call
            </button>
          </div>
        </div>
      )}

      <p className="text-slate text-xs font-mono uppercase tracking-wider mb-3">Top callers</p>
      <div className="grid grid-cols-3 gap-3 mb-4 items-end">
        {top3[1] && <PodiumCard entry={top3[1]} rank={2} height="h-28" />}
        {top3[0] && <PodiumCard entry={top3[0]} rank={1} height="h-36" />}
        {top3[2] && <PodiumCard entry={top3[2]} rank={3} height="h-24" />}
      </div>

      <div className="flex flex-col gap-2">
        {rest.map(function (m, i) {
          return <LeaderRow key={m.displayName + "-" + i} member={m} rank={i + 4} delayMs={i * 60} />;
        })}
      </div>
    </div>
  );
}

function PodiumCard(props) {
  const e = props.entry;
  const ringClass = props.rank === 1 ? "border-gold-bright" : (props.rank === 2 ? "border-gold" : "border-gold/50");
  return (
    <div className="flex flex-col items-center">
      <div className={"w-14 h-14 rounded-full bg-surface-alt border-2 " + ringClass + " flex items-center justify-center font-display font-bold text-paper text-lg mb-2 relative"}>
        {e.displayName.charAt(0).toUpperCase()}
        {props.rank === 1 && (
          <Crown className="w-5 h-5 text-gold absolute -top-3 left-1/2 -translate-x-1/2" />
        )}
      </div>
      <div className={"w-full rounded-t-xl bg-surface border border-line border-b-0 flex flex-col items-center justify-end pb-2 " + props.height}>
        <p className={"text-sm font-medium truncate max-w-full px-1 " + (e.isYou ? "text-gold" : "text-paper")}>
          {e.isYou ? "You" : e.displayName}
        </p>
        <p className="font-mono text-gold text-sm">{e.accuracyPct}%</p>
      </div>
    </div>
  );
}

function LeaderRow(props) {
  const m = props.member;
  return (
    <div
      className={
        "animate-row-in flex items-center gap-3 rounded-xl px-4 py-3 border " +
        (m.isYou ? "bg-gold/10 border-gold/40" : "bg-surface border-line")
      }
      style={{ animationDelay: props.delayMs + "ms" }}
    >
      <span className="w-6 text-center font-mono text-sm text-slate-faint shrink-0">{props.rank}</span>
      <div className="w-9 h-9 rounded-full bg-surface-alt border border-line flex items-center justify-center font-display font-semibold text-paper text-sm shrink-0">
        {m.displayName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className={"text-sm font-medium " + (m.isYou ? "text-gold" : "text-paper")}>
          {m.isYou ? "You" : m.displayName}
        </p>
        <p className="text-slate-faint text-xs truncate italic">"{m.predictionText}"</p>
      </div>
      <span className="font-mono text-paper text-sm shrink-0">{m.accuracyPct}%</span>
    </div>
  );
}