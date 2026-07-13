import React from "react";
import { Clock, Home } from "lucide-react";

export default function WaitingScreen(props) {
  const match = props.match;

  return (
    <div className="py-16 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
        <Clock className="w-8 h-8 text-gold" />
      </div>

      <div className="space-y-2">
        <h2 className="font-display font-bold text-2xl text-paper">
          Your call is locked in
        </h2>
        <p className="text-slate-faint max-w-sm mx-auto">
          {match.homeTeam} vs {match.awayTeam} hasn't kicked off yet. Come back
          once the match starts to watch the odds live, or after it ends to see
          how close you got.
        </p>
      </div>

      <div className="border border-line rounded-2xl p-4 max-w-sm mx-auto text-left bg-ink/40">
        <p className="text-xs uppercase tracking-wider text-slate-faint font-mono mb-1">
          Your prediction
        </p>
        <p className="text-paper text-sm">{props.predictionText}</p>
      </div>

      <button
        onClick={props.onDone}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gold text-ink font-semibold hover:bg-gold-bright transition-colors"
      >
        <Home className="w-4 h-4" />
        Back to matches
      </button>
    </div>
  );
}
