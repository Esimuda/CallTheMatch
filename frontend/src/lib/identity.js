// Anonymous local identity - no accounts, no login, no wallet.
// Matches callthematch-frontend-spec-v2.md section 6 exactly: a random userId
// generated on first use, stored in localStorage, paired with a display name
// typed once. Falls back to an in-memory object if localStorage is blocked
// (private browsing edge case) so the app never crashes over this.

const USER_ID_KEY = "callthematch_user_id";
const DISPLAY_NAME_KEY = "callthematch_display_name";
const RECOVERY_EMAIL_KEY = "callthematch_recovery_email";

const memoryFallback = {};

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    return memoryFallback[key] || null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    memoryFallback[key] = value;
  }
}

function safeRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (e) {
    delete memoryFallback[key];
  }
}

function generateId() {
  return "user_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function getUserId() {
  let id = safeGet(USER_ID_KEY);
  if (!id) {
    id = generateId();
    safeSet(USER_ID_KEY, id);
  }
  return id;
}

export function getDisplayName() {
  return safeGet(DISPLAY_NAME_KEY) || "";
}

export function setDisplayName(name) {
  safeSet(DISPLAY_NAME_KEY, name);
}

export function getRecoveryEmail() {
  return safeGet(RECOVERY_EMAIL_KEY) || "";
}

export function setRecoveryEmail(email) {
  safeSet(RECOVERY_EMAIL_KEY, email);
}

export function clearIdentity() {
  safeRemove(USER_ID_KEY);
  safeRemove(DISPLAY_NAME_KEY);
  safeRemove(RECOVERY_EMAIL_KEY);
}