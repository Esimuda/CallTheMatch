import React, { useState } from "react";
import { Mail, X, Check, ShieldQuestion } from "lucide-react";
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
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-surface border border-line rounded-2xl p-6 relative animate-screen-in">
        <button
          onClick={props.onClose}
          className="absolute top-4 right-4 text-slate-faint hover:text-paper transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-gold mb-2">
          <ShieldQuestion className="w-5 h-5" />
          <span className="font-mono text-xs uppercase tracking-wider">Optional</span>
        </div>
        <h2 className="font-display font-bold text-xl text-paper mb-1">
          Keep your calls if you switch devices.
        </h2>
        <p className="text-slate text-sm mb-5 leading-relaxed">
          CallTheMatch doesn't need an account - your calls live right here in this browser.
          If you'd like a way back in on a new device or after clearing your browser, leave
          an email and we'll send a recovery link. Totally optional.
        </p>

        {sent ? (
          <div className="flex items-center gap-2 bg-pitch/10 border border-pitch/40 rounded-xl px-4 py-3">
            <Check className="w-4 h-4 text-pitch-bright shrink-0" />
            <p className="text-paper text-sm">
              If a mailer's connected, a recovery link would land in your inbox now.
            </p>
          </div>
        ) : (
          <React.Fragment>
            <label className="block text-slate-faint text-[0.65rem] font-mono uppercase tracking-wider mb-1.5">
              Email
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
              {sending ? "Sending..." : "Send recovery link"}
            </button>
          </React.Fragment>
        )}

        <p className="text-slate-faint text-xs text-center mt-4">
          Skip this if you're fine staying on one device - nothing changes for you.
        </p>
      </div>
    </div>
  );
}