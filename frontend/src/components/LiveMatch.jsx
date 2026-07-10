import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, TrendingUp, FastForward } from "lucide-react";
import { fetchOddsHistory } from "../lib/mockApi.js";

const FLAG_ISO = { FRA: "fr", MAR: "ma", ARG: "ar", BRA: "br", ENG: "gb-eng", ESP: "es" };
function flagUrl(code, width) {
  return "https://flagcdn.com/w" + (width || 80) + "/" + (FLAG_ISO[code] || "un") + ".png";
}

export default function LiveMatch(props) {
  const match = props.match;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(function () {
    let active = true;
    fetchOddsHistory(match.id).then(function (res) {
      if (active) {
        setData(res);
        setLoading(false);
      }
    });
    return function () { active = false; };
  }, [match.id]);

  useEffect(function () {
    const interval = setInterval(function () {
      fetchOddsHistory(match.id).then(function (res) {
        setData(res);
      });
    }, 45000);
    return function () { clearInterval(interval); };
  }, [match.id]);

  return (
    <div className="pt-6 animate-rise">
      <button onClick={props.onBack} className="flex items-center gap-1.5 text-slate hover:text-paper text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <ScoreHeader match={match} data={data} loading={loading} />

      <div className="mt-6 bg-surface border border-line rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4 text-slate text-xs font-mono uppercase tracking-wider">
          <TrendingUp className="w-3.5 h-3.5" />
          Win probability
        </div>
        {loading ? (
          <div className="h-52 flex items-center justify-center text-slate-faint text-sm font-mono">
            Loading odds...
          </div>
        ) : (
          <OddsChart oddsTimeline={data.oddsTimeline} />
        )}
      </div>

      {!loading && (
        <FlaggedMoments moments={data.flaggedMoments} />
      )}

      {props.predictionText && (
        <YourCallCard text={props.predictionText} />
      )}

      <div className="mt-10 border border-dashed border-line rounded-2xl p-4 text-center">
        <p className="text-slate-faint text-xs font-mono uppercase tracking-wider mb-2">Prototype control</p>
        <button
          onClick={props.onFinish}
          className="inline-flex items-center gap-2 text-gold hover:text-gold-bright text-sm font-body transition-colors"
        >
          <FastForward className="w-4 h-4" />
          Simulate full time
        </button>
      </div>
    </div>
  );
}

function ScoreHeader(props) {
  const m = props.match;
  const d = props.data;
  return (
    <div className="bg-surface border border-line rounded-2xl px-5 py-7 flex items-center justify-between">
      <TeamBlock code={m.homeCode} name={m.homeTeam} />

      <div className="text-center px-4">
        <div className="font-mono text-4xl font-bold text-paper tracking-wider">
          {props.loading ? "- : -" : d.currentScoreHome + " : " + d.currentScoreAway}
        </div>
        <div className="text-red text-[0.65rem] font-mono uppercase tracking-wider mt-2 flex items-center justify-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red animate-pulse-live"></span>
          {props.loading ? "..." : (d.gamePhase === "H2" ? "2nd half" : d.gamePhase)}
        </div>
      </div>

      <TeamBlock code={m.awayCode} name={m.awayTeam} />
    </div>
  );
}

function TeamBlock(props) {
  return (
    <div className="flex flex-col items-center gap-2 w-24">
      <img src={flagUrl(props.code, 160)} alt={props.name} className="w-14 h-14 rounded-full object-cover shadow-md" />
      <span className="text-paper text-xs font-body text-center leading-tight">{props.name}</span>
    </div>
  );
}

function OddsChart(props) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={props.oddsTimeline} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#1E2A3D" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="minute"
            tickFormatter={function (v) { return v + "'"; }}
            stroke="#4D5A72"
            tick={{ fontSize: 11, fontFamily: "Space Mono, monospace" }}
            axisLine={{ stroke: "#1E2A3D" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={function (v) { return v + "%"; }}
            stroke="#4D5A72"
            tick={{ fontSize: 11, fontFamily: "Space Mono, monospace" }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{ background: "#101827", border: "1px solid #1E2A3D", borderRadius: 10, fontFamily: "Space Mono, monospace", fontSize: 12 }}
            labelFormatter={function (v) { return "Minute " + v; }}
            formatter={function (value, name) { return [value + "%", name]; }}
          />
          <Line type="monotone" dataKey="homeWinPct" name="Home" stroke="#FFC533" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="drawPct" name="Draw" stroke="#4D5A72" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="awayWinPct" name="Away" stroke="#2ED573" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function FlaggedMoments(props) {
  if (!props.moments || props.moments.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-slate text-xs font-mono uppercase tracking-wider mb-3">Flagged moments</p>
      <div className="flex flex-col gap-2">
        {props.moments.map(function (mo, i) {
          return (
            <div key={i} className="flex items-start gap-3 bg-surface border border-line rounded-xl px-4 py-3">
              <span className="text-gold font-mono text-sm shrink-0">{mo.minute}'</span>
              <span className="text-slate text-sm leading-snug">{mo.caption}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YourCallCard(props) {
  return (
    <div className="mt-6 bg-pitch/10 border border-pitch/40 rounded-xl px-4 py-3">
      <p className="text-slate-faint text-[0.65rem] font-mono uppercase tracking-wider mb-1">You called</p>
      <p className="text-paper text-sm leading-snug italic">"{props.text}"</p>
    </div>
  );
}