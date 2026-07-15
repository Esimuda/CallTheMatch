import React, { useEffect, useState } from "react";
import { Users, Copy, Check, ArrowLeft, Play, Crown, LogIn, X, PlusCircle } from "lucide-react";
import { fetchRoom, checkDisplayName } from "../lib/api.js";
import { flagUrl } from "../lib/flags.js";

export function RoomLobby(props) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(function () {
    let active = true;
    fetchRoom(props.inviteCode).then(function (res) {
      if (!active) return;
      setMembers(res.members);
      setLoading(false);
    }).catch(function () {
      if (!active) return;
      setLoading(false);
    });
    return function () { active = false; };
  }, [props.inviteCode]);

  function handleCopy() {
    setCopied(true);
    setTimeout(function () { setCopied(false); }, 1800);
  }

  const sorted = members.slice().sort(function (a, b) {
    if (a.accuracyPct === null) return 1;
    if (b.accuracyPct === null) return -1;
    return b.accuracyPct - a.accuracyPct;
  });

  return (
    <div className="pt-6 animate-screen-in">
      <button onClick={props.onBack} className="flex items-center gap-1.5 text-slate hover:text-paper text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-center gap-2 text-gold mb-2">
        <Users className="w-5 h-5" />
        <span className="font-mono text-xs uppercase tracking-wider">Room lobby</span>
      </div>
      <h2 className="font-display font-bold text-2xl text-paper mb-6">
        Get your friends in on this.
      </h2>

      <div className="bg-gradient-to-br from-surface to-ink border border-gold/30 rounded-2xl p-6 text-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gold/10 blur-2xl"></div>
        <p className="text-slate text-xs font-mono uppercase tracking-wider mb-3">Invite code</p>
        <p className="font-display font-black text-paper text-4xl tracking-[0.15em] mb-5">
          {props.inviteCode}
        </p>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>

      <div className="mt-8">
        <p className="text-slate text-xs font-mono uppercase tracking-wider mb-3">Who's in</p>

        {loading && (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map(function (i) {
              return <div key={i} className="h-16 rounded-xl bg-surface border border-line animate-pulse-live"></div>;
            })}
          </div>
        )}

        {!loading && (
          <div className="flex flex-col gap-2">
            {sorted.map(function (m, i) {
              return <MemberRow key={m.displayName + "-" + i} member={m} rank={i + 1} delayMs={i * 80} />;
            })}
          </div>
        )}
      </div>

      <button
        onClick={props.onWatchLive}
        className="mt-8 w-full flex items-center justify-center gap-2 bg-pitch hover:bg-pitch-bright text-ink font-display font-semibold text-base rounded-xl py-3.5 transition-colors"
      >
        <Play className="w-4 h-4" />
        Watch the match live
      </button>
    </div>
  );
}

function MemberRow(props) {
  const m = props.member;
  const hasScore = m.accuracyPct !== null && m.accuracyPct !== undefined;
  return (
    <div
      className="animate-row-in bg-surface border border-line rounded-xl px-4 py-3 flex items-center gap-3"
      style={{ animationDelay: props.delayMs + "ms" }}
    >
      <span className="w-6 text-center font-mono text-sm text-slate-faint shrink-0">
        {props.rank === 1 && hasScore ? <Crown className="w-4 h-4 text-gold inline" /> : props.rank}
      </span>
      <div className="w-9 h-9 rounded-full bg-surface-alt border border-line flex items-center justify-center font-display font-semibold text-paper text-sm shrink-0">
        {m.displayName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-paper text-sm font-medium">{m.displayName}</p>
        {m.predictionText && (
          <p className="text-slate-faint text-xs truncate italic">"{m.predictionText}"</p>
        )}
        {!m.predictionText && (
          <p className="text-slate-faint text-xs">Hasn't called it yet</p>
        )}
      </div>
      {hasScore ? (
        <span className="font-mono text-gold text-sm shrink-0">{m.accuracyPct}%</span>
      ) : (
        <span className="font-mono text-slate-faint text-xs shrink-0">-</span>
      )}
    </div>
  );
}

export function JoinRoomForm(props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [matchId, setMatchId] = useState(props.matches[0] ? props.matches[0].id : "");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);

  async function handleJoin() {
    if (!code.trim() || !name.trim() || joining) return;
    const match = props.matches.filter(function (m) { return m.id === matchId; })[0] || props.matches[0];
    setJoining(true);
    setJoinError(null);
    try {
      const check = await checkDisplayName(name.trim());
      if (!check.available) {
        setJoinError("That display name is already taken. Pick another.");
        setJoining(false);
        return;
      }
      await props.onJoin(code.trim().toUpperCase(), name.trim(), match);
    } catch (err) {
      setJoinError(err.message || "Could not join room.");
    }
    setJoining(false);
  }

  if (!open) {
    return (
      <button
        onClick={function () { setOpen(true); }}
        className="w-full flex items-center justify-center gap-2 text-slate hover:text-gold text-sm font-body transition-colors"
      >
        <LogIn className="w-4 h-4" />
        Have an invite code? Join a room
      </button>
    );
  }

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 animate-screen-in relative">
      <button
        onClick={function () { setOpen(false); }}
        className="absolute top-4 right-4 text-slate-faint hover:text-paper transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>

      <p className="text-gold font-mono text-xs uppercase tracking-wider mb-4">Join a room</p>

      <label className="block text-slate-faint text-[0.65rem] font-mono uppercase tracking-wider mb-1.5">Match</label>
      <select
        value={matchId}
        onChange={function (e) { setMatchId(e.target.value); }}
        className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-paper outline-none focus:border-gold transition-colors mb-3"
      >
        {props.matches.map(function (m) {
          return <option key={m.id} value={m.id}>{m.homeTeam} vs {m.awayTeam}</option>;
        })}
      </select>

      <input
        value={code}
        onChange={function (e) { setCode(e.target.value.toUpperCase()); }}
        placeholder="Invite code"
        maxLength={6}
        className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-paper placeholder-slate-faint outline-none focus:border-gold transition-colors font-mono tracking-widest mb-3"
      />
      <input
        value={name}
        onChange={function (e) {
          setName(e.target.value);
          setJoinError(null);
        }}
        placeholder="Your display name"
        className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-paper placeholder-slate-faint outline-none focus:border-gold transition-colors mb-2"
      />
      {joinError && <p className="text-red text-xs mb-3">{joinError}</p>}
      {!joinError && (
        <p className="text-slate-faint text-xs mb-4">Names are unique across CallTheMatch.</p>
      )}

      <button
        onClick={handleJoin}
        disabled={!code.trim() || !name.trim() || joining}
        className="w-full bg-gold hover:bg-gold-bright disabled:bg-surface-alt disabled:text-slate-faint text-ink font-display font-semibold text-sm rounded-xl py-3 transition-colors"
      >
        {joining ? "Joining..." : "Join room"}
      </button>
    </div>
  );
}

export function CreateRoomForm(props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handlePick(match) {
    if (creating) return;
    setCreating(true);
    await props.onCreate(match);
    setCreating(false);
  }

  if (!open) {
    return (
      <button
        onClick={function () { setOpen(true); }}
        className="w-full flex items-center justify-center gap-2 text-slate hover:text-gold text-sm font-body transition-colors"
      >
        <PlusCircle className="w-4 h-4" />
        Create a room for your friends
      </button>
    );
  }

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 animate-screen-in relative">
      <button
        onClick={function () { setOpen(false); }}
        className="absolute top-4 right-4 text-slate-faint hover:text-paper transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>

      <p className="text-gold font-mono text-xs uppercase tracking-wider mb-1">Create a room</p>
      <p className="text-slate text-sm mb-4">Pick the match you're calling with friends.</p>

      <div className="flex flex-col gap-2">
        {props.matches.map(function (m) {
          return (
            <button
              key={m.id}
              onClick={function () { handlePick(m); }}
              disabled={creating}
              className="flex items-center gap-3 bg-ink border border-line hover:border-gold rounded-xl px-4 py-3 text-left transition-colors disabled:opacity-60"
            >
              <div className="flex items-center -space-x-2 shrink-0">
                <img src={flagUrl(m.homeCode, 80)} alt={m.homeTeam} className="w-8 h-8 rounded-full object-cover border-2 border-ink" />
                <img src={flagUrl(m.awayCode, 80)} alt={m.awayTeam} className="w-8 h-8 rounded-full object-cover border-2 border-ink" />
              </div>
              <span className="text-paper text-sm font-medium">{m.homeTeam} vs {m.awayTeam}</span>
            </button>
          );
        })}
      </div>

      {creating && (
        <p className="text-gold text-xs font-mono mt-4 text-center animate-pulse-live">Setting up your room...</p>
      )}
    </div>
  );
}