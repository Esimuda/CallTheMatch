import React from "react";
import { Mail, Smartphone, ArrowRight, Check } from "lucide-react";

// Shown after a prediction locks in (and on the result screen) to explain
// how cross-device recovery works. Frontend-only - opens the existing email
// modal; no backend changes required.
export default function SaveCallsPrompt(props) {
  if (props.linked) return null;

  return (
    <div className="mt-6 bg-gradient-to-br from-surface to-ink border border-gold/40 rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gold/10 blur-2xl pointer-events-none"></div>

      <div className="flex items-center gap-2 text-gold mb-2">
        <Mail className="w-4 h-4" />
        <span className="font-mono text-xs uppercase tracking-wider">Take your calls anywhere</span>
      </div>

      <h3 className="font-display font-bold text-lg text-paper leading-snug mb-2">
        {props.compact
          ? "Switching phones later?"
          : "This phone remembers your call — want every phone to?"}
      </h3>

      <p className="text-slate text-sm leading-relaxed mb-4">
        {props.compact
          ? "Leave an email, confirm a code, and reclaim your calls on another device."
          : "Right now your prediction lives in this browser. Add an email, confirm a 6-digit code, and you can open your calls on a friend's phone or a new device."}
      </p>

      {!props.compact && (
        <ol className="flex flex-col gap-2.5 mb-5">
          <StepRow done icon={Check} text="Your call is locked in on this device" />
          <StepRow icon={Mail} text="Add your email — we send a 6-digit code" />
          <StepRow icon={Smartphone} text="Confirm the code — same calls on any phone" />
        </ol>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={props.onSave}
          className="flex-1 flex items-center justify-center gap-2 bg-gold hover:bg-gold-bright text-ink font-display font-semibold text-sm rounded-xl py-3 transition-colors"
        >
          <Mail className="w-4 h-4" />
          Save with email
          <ArrowRight className="w-4 h-4" />
        </button>
        {props.onDismiss && (
          <button
            onClick={props.onDismiss}
            className="flex-1 text-slate hover:text-paper text-sm font-mono py-3 transition-colors"
          >
            Maybe later
          </button>
        )}
      </div>
    </div>
  );
}

function StepRow(props) {
  const Icon = props.icon;
  return (
    <li className="flex items-start gap-3">
      <span
        className={
          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 " +
          (props.done ? "bg-pitch/20 text-pitch-bright" : "bg-ink border border-line text-gold")
        }
      >
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className={"text-sm pt-0.5 " + (props.done ? "text-slate" : "text-paper")}>{props.text}</span>
    </li>
  );
}
