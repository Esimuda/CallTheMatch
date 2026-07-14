import React, { useState } from "react";
import { Mail, X, Check, Smartphone, Link2 } from "lucide-react";
import { requestMagicLink } from "../lib/mockApi.js";
import { getRecoveryEmail, setRecoveryEmail } from "../lib/identity.js";

export default function AccountRecovery(props) {
  const [email, setEmail] = useState(getRecoveryEmail());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!email.trim() || sending) return;
    setSending(true);
    await requestMagicLink(email.trim());
    setRecoveryEmail(email.trim());
    setSending(false);
    setSent(true);
    if (props.onEmailSaved) {
      props.onEmailSaved(email.trim());
    }
  }

  function handleClose() {
    props.onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/80 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <div className="w-full max-w-md bg-surface border border-gold/30 rounded-2xl p-6 relative animate-screen-in shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-faint hover:text-paper transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-gold mb-2">
          <Mail className="w-5 h-5" />
          <span className="font-mono text-xs uppercase tracking-wider">Save your calls</span>
        </div>
        <h2 className="font-display font-bold text-xl text-paper mb-1 pr-6">
          One email. Every device.
        </h2>
        <p className="text-slate text-sm mb-5 leading-relaxed">
          No password, no full account. We email you a link — open it on any phone or browser and
          your locked-in calls come with you.
        </p>

        {sent ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-pitch/10 border border-pitch/40 rounded-xl px-4 py-3">
              <Check className="w-4 h-4 text-pitch-bright shrink-0 mt-0.5" />
              <p className="text-paper text-sm leading-relaxed">
                Check your inbox for a recovery link. Tap it on another device and your calls will
                appear there automatically.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full bg-gold hover:bg-gold-bright text-ink font-display font-semibold text-sm rounded-xl py-3 transition-colors"
            >
              Got it
            </button>
          </div>
        ) : (
          <React.Fragment>
            <div className="flex flex-col gap-2 mb-5 text-sm text-slate">
              <HowStep n={1} icon={Mail} text="Enter the email you want to use" />
              <HowStep n={2} icon={Link2} text="We send a magic link (no password)" />
              <HowStep n={3} icon={Smartphone} text="Open it on another phone — same predictions" />
            </div>

            <label className="block text-slate-faint text-[0.65rem] font-mono uppercase tracking-wider mb-1.5">
              Your email
            </label>
            <div className="relative mb-4">
              <Mail className="w-4 h-4 text-slate-faint absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={function (e) { setEmail(e.target.value); }}
                placeholder="you@example.com"
                className="w-full bg-ink border border-line rounded-xl pl-11 pr-4 py-3 text-paper placeholder-slate-faint outline-none focus:border-gold transition-colors"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!email.trim() || sending}
              className="w-full bg-gold hover:bg-gold-bright disabled:bg-surface-alt disabled:text-slate-faint text-ink font-display font-semibold text-sm rounded-xl py-3 transition-colors"
            >
              {sending ? "Sending link..." : "Email me my recovery link"}
            </button>
          </React.Fragment>
        )}

        {!sent && (
          <button
            onClick={handleClose}
            className="w-full text-slate-faint hover:text-slate text-xs text-center mt-4 transition-colors"
          >
            Stay on this device only
          </button>
        )}
      </div>
    </div>
  );
}

function HowStep(props) {
  const Icon = props.icon;
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 h-6 rounded-full bg-ink border border-line flex items-center justify-center font-mono text-[0.65rem] text-gold shrink-0">
        {props.n}
      </span>
      <Icon className="w-3.5 h-3.5 text-gold shrink-0" />
      <span>{props.text}</span>
    </div>
  );
}
