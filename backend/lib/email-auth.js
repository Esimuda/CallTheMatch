import axios from "axios";
import crypto from "crypto";

// In-memory OTP store. Codes expire after 10 minutes. Fine for a single
// Render instance; if you scale to multiple instances, move this to Supabase.
const pendingCodes = new Map();
const CODE_TTL_MS = 10 * 60 * 1000;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function generateCode() {
  return String(crypto.randomInt(100000, 999999));
}

async function sendEmailViaResend(to, code) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "CallTheMatch <onboarding@resend.dev>";
  if (!apiKey) return { sent: false, reason: "missing_resend_key" };

  await axios.post(
    "https://api.resend.com/emails",
    {
      from,
      to: [to],
      subject: "Your CallTheMatch confirmation code",
      text: `Your CallTheMatch confirmation code is: ${code}\n\nIt expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
      html: `<p>Your CallTheMatch confirmation code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
        <p>It expires in 10 minutes.</p>`,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );

  return { sent: true };
}

export async function issueEmailCode(email, userId) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    throw Object.assign(new Error("Invalid email address"), { status: 400 });
  }
  if (!userId) {
    throw Object.assign(new Error("Missing userId"), { status: 400 });
  }

  const code = generateCode();
  pendingCodes.set(normalized, {
    code,
    userId,
    expiresAt: Date.now() + CODE_TTL_MS,
  });

  try {
    const result = await sendEmailViaResend(normalized, code);
    if (!result.sent) {
      // No email provider configured - still issue the code so the flow
      // works, but surface that delivery didn't happen.
      console.warn(
        `[email] No RESEND_API_KEY set. Confirmation code for ${normalized}: ${code}`
      );
      return {
        status: "queued",
        email: normalized,
        delivery: "logged",
        // Exposed only when email isn't configured, so you can still test.
        debugCode: code,
        message:
          "Email delivery is not configured on the server yet. Use the code shown, or add RESEND_API_KEY on Render.",
      };
    }
    return {
      status: "sent",
      email: normalized,
      delivery: "email",
      message: "Check your inbox for a 6-digit confirmation code.",
    };
  } catch (err) {
    console.error("[email] Resend failed:", err.response?.data || err.message);
    // Keep the code valid so a retry of verify still works if they saw logs,
    // but tell the client delivery failed.
    throw Object.assign(
      new Error(err.response?.data?.message || "Failed to send confirmation email"),
      { status: 502 }
    );
  }
}

export function verifyEmailCode(email, code, userId) {
  const normalized = normalizeEmail(email);
  const entry = pendingCodes.get(normalized);

  if (!entry) {
    throw Object.assign(new Error("No code found for that email. Request a new one."), {
      status: 400,
    });
  }
  if (Date.now() > entry.expiresAt) {
    pendingCodes.delete(normalized);
    throw Object.assign(new Error("That code has expired. Request a new one."), {
      status: 400,
    });
  }
  if (String(code).trim() !== entry.code) {
    throw Object.assign(new Error("Incorrect code. Check and try again."), {
      status: 400,
    });
  }
  if (userId && entry.userId !== userId) {
    // Allow verifying from the same device that requested the code.
    // If a different userId is passed, still accept but return the original
    // userId so the new device can adopt the linked identity.
  }

  pendingCodes.delete(normalized);
  return {
    status: "verified",
    email: normalized,
    userId: entry.userId,
  };
}
