import React, { useState } from "react";
import { Mail, X, Check, Smartphone, KeyRound } from "lucide-react";
import { sendEmailCode, verifyEmailCode } from "../lib/api.js";
import { getRecoveryEmail, setRecoveryEmail, getUserId, setUserId } from "../lib/identity.js";

export default function AccountRecovery(props) {
  const [email, setEmail] = useState(getRecoveryEmail());
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email"); // email | code | done
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [debugCode, setDebugCode] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  async function handleSend() {
    if (!email.trim() || sending) return;
    setSending(true);
    setError(null);
    setDebugCode(null);
    try {
      const result = await sendEmailCode(email.trim());
      setInfoMessage(result.message || "Code sent.");
      if (result.debugCode) setDebugCode(result.debugCode);
      setStep("code");
    } catch (err) {
      setError(err.message || "Could not send code.");
    }
    setSending(false);
  }

  async function handleVerify() {
    if (!code.trim() || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const result = await verifyEmailCode(email.trim(), code.trim());
      if (result.userId && result.userId !== getUserId()) {
        setUserId(result.userId);
      }
      setRecoveryEmail(email.trim());
      setStep("done");
      if (props.onEmailSaved) props.onEmailSaved(email.trim());
    } catch (err) {
      setError(err.message || "Could not verify code.");
    }
    setVerifying(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/80 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <div className="w-full max-w-md bg-surface border border-gold/30 rounded-2xl p-6 relative animate-screen-in shadow-2xl">
        <button
          onClick={props.onClose}
          className="absolute top-4 right-4 text-slate-faint hover:text-paper transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-gold mb-2">
          <Mail className="w-5 h-5" />
          <span className="font-mono text-xs uppercase tracking-wider">Confirm your email</span>
        </div>
        <h2 className="font-display font-bold text-xl text-paper mb-1 pr-6">
          {step === "done" ? "Email confirmed." : "One email. Every device."}
        </h2>
        <p className="text-slate text-sm mb-5 leading-relaxed">
          {step === "done"
            ? "Your email is linked to this device. Use the same email on another phone to reclaim your calls."
            : "We'll send a 6-digit code to confirm it's you. No password needed."}
        </p>

        {error && (
          <div className="mb-4 bg-red/10 border border-red/40 rounded-xl px-4 py-3 text-red text-sm">
            {error}
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-pitch/10 border border-pitch/40 rounded-xl px-4 py-3">
              <Check className="w-4 h-4 text-pitch-bright shrink-0 mt-0.5" />
              <p className="text-paper text-sm leading-relaxed">
                Confirmed: <span className="text-gold font-mono">{email}</span>
              </p>
            </div>
            <button
              onClick={props.onClose}
              className="w-full bg-gold hover:bg-gold-bright text-ink font-display font-semibold text-sm rounded-xl py-3 transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {step === "email" && (
          <React.Fragment>
            <div className="flex flex-col gap-2 mb-5 text-sm text-slate">
              <HowStep n={1} icon={Mail} text="Enter your email" />
              <HowStep n={2} icon={KeyRound} text="We send a 6-digit confirmation code" />
              <HowStep n={3} icon={Smartphone} text="Enter the code — email confirmed" />
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
              {sending ? "Sending code..." : "Send confirmation code"}
            </button>
          </React.Fragment>
        )}

        {step === "code" && (
          <React.Fragment>
            {infoMessage && (
              <p className="text-slate text-sm mb-3">{infoMessage}</p>
            )}
            {debugCode && (
              <div className="mb-4 bg-gold/10 border border-gold/40 rounded-xl px-4 py-3">
                <p className="text-slate-faint text-[0.65rem] font-mono uppercase tracking-wider mb-1">
                  Email not configured — use this code
                </p>
                <p className="text-gold font-mono text-2xl tracking-[0.3em]">{debugCode}</p>
              </div>
            )}

            <label className="block text-slate-faint text-[0.65rem] font-mono uppercase tracking-wider mb-1.5">
              6-digit code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={function (e) { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); }}
              placeholder="123456"
              className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-paper placeholder-slate-faint outline-none focus:border-gold transition-colors font-mono tracking-[0.3em] text-center text-xl mb-4"
            />
            <button
              onClick={handleVerify}
              disabled={code.length !== 6 || verifying}
              className="w-full bg-gold hover:bg-gold-bright disabled:bg-surface-alt disabled:text-slate-faint text-ink font-display font-semibold text-sm rounded-xl py-3 transition-colors"
            >
              {verifying ? "Confirming..." : "Confirm email"}
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full text-slate hover:text-gold text-xs text-center mt-3 transition-colors"
            >
              {sending ? "Resending..." : "Resend code"}
            </button>
          </React.Fragment>
        )}

        {step !== "done" && (
          <button
            onClick={props.onClose}
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
