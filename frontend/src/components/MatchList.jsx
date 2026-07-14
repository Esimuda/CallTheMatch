import React, { useEffect, useState } from "react";
import { ChevronRight, Calendar, Trophy } from "lucide-react";
import { fetchMatches } from "../lib/api.js";
import { JoinRoomForm, CreateRoomForm } from "./RoomScreens.jsx";

const FLAG_ISO = {
  FRA: "fr",
  MAR: "ma",
  ARG: "ar",
  BRA: "br",
  ENG: "gb-eng",
  ESP: "es",
};

function flagUrl(code, width) {
  const iso = FLAG_ISO[code] || "un";
  return "https://flagcdn.com/w" + (width || 160) + "/" + iso + ".png";
}

function formatKickoff(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FINISHED_PHASES = ["F", "FET", "FPE"];

export default function MatchList(props) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(function () {
    let active = true;
    fetchMatches().then(function (data) {
      if (active) {
        setMatches(data);
        setLoading(false);
      }
    });
    return function () { active = false; };
  }, []);

  // The backend returns every match sorted only by kickoff time, with no
  // phase filtering - so matches from days ago that have already finished
  // were showing up above (and mixed into) "Upcoming fixtures". Split them
  // here instead: upcoming/live matches stay soonest-first, finished
  // matches move to their own section, most recent first.
  const upcoming = matches
    .filter(function (m) { return !FINISHED_PHASES.includes(m.gamePhase); })
    .sort(function (a, b) { return new Date(a.kickoffTime) - new Date(b.kickoffTime); });

  const finished = matches
    .filter(function (m) { return FINISHED_PHASES.includes(m.gamePhase); })
    .sort(function (a, b) { return new Date(b.kickoffTime) - new Date(a.kickoffTime); });

  const featured = upcoming[0] || matches[0];

  return (
    <div>
      <Hero featured={featured} />

      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4 text-slate text-xs font-mono uppercase tracking-wider">
          <Calendar className="w-3.5 h-3.5" />
          Upcoming fixtures
        </div>

        {loading && <FixtureListSkeleton />}

        {!loading && upcoming.length === 0 && (
          <p className="text-slate-faint text-sm px-1">No upcoming fixtures right now - check back soon.</p>
        )}

        {!loading && (
          <div className="flex flex-col gap-3">
            {upcoming.map(function (m, i) {
              return (
                <FixtureCard
                  key={m.id}
                  match={m}
                  delayMs={i * 90}
                  onClick={function () { props.onSelectMatch(m); }}
                  onViewLeaderboard={function () { props.onViewLeaderboard(m); }}
                />
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="mt-6 flex flex-col gap-3">
            <CreateRoomForm matches={matches} onCreate={props.onCreateRoomFromHome} />
            <JoinRoomForm matches={matches} onJoin={props.onJoinRoom} />
          </div>
        )}
      </div>

      {!loading && finished.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4 text-slate text-xs font-mono uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            Recent results
          </div>

          <div className="flex flex-col gap-3">
            {finished.map(function (m, i) {
              return (
                <FinishedFixtureCard
                  key={m.id}
                  match={m}
                  delayMs={i * 90}
                  onViewLeaderboard={function () { props.onViewLeaderboard(m); }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Hero(props) {
  return (
    <div className="relative pt-16 pb-14 pitch-lines floodlight-glow rounded-b-[2.5rem] -mx-5 px-5 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-gold/10 to-transparent animate-sweep"></div>
      </div>

      <p className="text-gold font-mono text-xs uppercase tracking-[0.25em] mb-4 animate-rise relative z-10">
        World Cup - Quarter-finals
      </p>
      <h1
        className="font-display font-black text-paper leading-[1.02] animate-rise relative z-10"
        style={{ fontSize: "3.1rem", animationDelay: "80ms" }}
      >
        Call it before
        <br />
        the final whistle.
      </h1>
      <p
        className="mt-5 text-slate text-lg leading-relaxed max-w-md animate-rise relative z-10"
        style={{ animationDelay: "160ms" }}
      >
        Say what you think will happen, in your own words. Watch it live.
        Find out how good a caller you really are.
      </p>

      {props.featured && (
        <div className="mt-8 flex items-center gap-4 animate-rise relative z-10" style={{ animationDelay: "240ms" }}>
          <img
            src={flagUrl(props.featured.homeCode, 320)}
            alt={props.featured.homeTeam}
            className="w-16 h-16 rounded-full object-cover border-2 border-gold/40 shadow-lg animate-float"
          />
          <span className="font-display text-2xl text-slate-faint">vs</span>
          <img
            src={flagUrl(props.featured.awayCode, 320)}
            alt={props.featured.awayTeam}
            className="w-16 h-16 rounded-full object-cover border-2 border-gold/40 shadow-lg animate-float"
            style={{ animationDelay: "0.6s" }}
          />
        </div>
      )}

      <div className="absolute left-0 right-0 bottom-8 h-10 overflow-hidden pointer-events-none">
        <BallWithTrail />
      </div>
    </div>
  );
}

function BallWithTrail() {
  return (
    <div className="relative w-full h-full">
      <div className="absolute bottom-1 h-1.5 rounded-full bg-gradient-to-r from-transparent via-pitch-bright/30 to-transparent w-40 animate-roll" style={{ animationDelay: "0.05s" }}></div>
      <div className="animate-roll absolute bottom-0" style={{ width: 30, height: 30 }}>
        <svg viewBox="0 0 44 44" width="30" height="30">
          <circle cx="22" cy="22" r="20" fill="#F6F8FB" stroke="#1E2A3D" strokeWidth="1.5" />
          <polygon points="22,10 29,16 26,24 18,24 15,16" fill="#070B14" />
          <path d="M22,10 L22,2 M29,16 L36,12 M26,24 L30,32 M18,24 L14,32 M15,16 L8,12"
            stroke="#070B14" strokeWidth="1.4" fill="none" />
        </svg>
      </div>
    </div>
  );
}

function FixtureCard(props) {
  const m = props.match;
  return (
    <div
      className="animate-rise bg-surface border border-line rounded-2xl overflow-hidden hover:border-gold transition-colors group"
      style={{ animationDelay: props.delayMs + "ms" }}
    >
      <button onClick={props.onClick} className="w-full text-left px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center -space-x-3">
            <img
              src={flagUrl(m.homeCode, 160)}
              alt={m.homeTeam}
              className="w-14 h-14 rounded-full object-cover border-2 border-surface shadow-md"
            />
            <img
              src={flagUrl(m.awayCode, 160)}
              alt={m.awayTeam}
              className="w-14 h-14 rounded-full object-cover border-2 border-surface shadow-md"
            />
          </div>
          <div>
            <div className="font-display font-semibold text-paper text-xl leading-tight">
              {m.homeTeam} <span className="text-slate-faint font-body font-normal text-base">vs</span> {m.awayTeam}
            </div>
            <div className="text-slate text-xs mt-1 font-mono">
              {formatKickoff(m.kickoffTime)} - {m.competition}
            </div>
          </div>
        </div>
        <ChevronRight className="w-6 h-6 text-slate-faint group-hover:text-gold group-hover:translate-x-1 transition-all" />
      </button>

      <button
        onClick={props.onViewLeaderboard}
        className="w-full flex items-center justify-center gap-1.5 border-t border-line/60 py-2.5 text-slate hover:text-gold hover:bg-surface-alt text-xs font-mono uppercase tracking-wider transition-colors"
      >
        <Trophy className="w-3.5 h-3.5" />
        View leaderboard
      </button>
    </div>
  );
}

function FinishedFixtureCard(props) {
  const m = props.match;
  return (
    <button
      onClick={props.onViewLeaderboard}
      className="animate-rise w-full text-left bg-surface/60 border border-line rounded-2xl px-5 py-4 flex items-center justify-between hover:border-gold transition-colors group"
      style={{ animationDelay: props.delayMs + "ms" }}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center -space-x-3">
          <img
            src={flagUrl(m.homeCode, 160)}
            alt={m.homeTeam}
            className="w-11 h-11 rounded-full object-cover border-2 border-surface shadow-md opacity-80"
          />
          <img
            src={flagUrl(m.awayCode, 160)}
            alt={m.awayTeam}
            className="w-11 h-11 rounded-full object-cover border-2 border-surface shadow-md opacity-80"
          />
        </div>
        <div>
          <div className="font-display font-semibold text-paper text-base leading-tight">
            {m.homeTeam} <span className="text-slate-faint font-body font-normal text-sm">vs</span> {m.awayTeam}
          </div>
          <div className="text-slate-faint text-xs mt-1 font-mono uppercase tracking-wider">
            Full-time - {formatKickoff(m.kickoffTime)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-slate-faint group-hover:text-gold text-xs font-mono uppercase tracking-wider transition-colors">
        <Trophy className="w-3.5 h-3.5" />
        Leaderboard
      </div>
    </button>
  );
}

function FixtureListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map(function (i) {
        return (
          <div
            key={i}
            className="h-[90px] rounded-2xl bg-surface border border-line animate-pulse-live"
          ></div>
        );
      })}
    </div>
  );
}