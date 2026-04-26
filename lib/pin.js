// Hardcoded PIN gate. The owner sets ALLOWED_PIN_HASH below to a SHA-256
// hash of the chosen PIN. Anyone visiting the site must enter that PIN
// to unlock. No "set / change PIN" flow at runtime — the PIN lives in
// source.
//
// To set or change the PIN:
//   1. Open the browser console (F12).
//   2. Run:  await window.WSPin.hashPin('your-secret-pin')
//   3. Copy the printed hash.
//   4. Paste it into ALLOWED_PIN_HASH below and save this file.
//
// Leave ALLOWED_PIN_HASH as an empty string to disable the gate (open
// access). This is a soft guard — the hash and gate code ship in the
// browser, so anyone with devtools / source access can bypass it. Use
// real server-side auth (e.g. Vercel Password Protection, Cloudflare
// Access) for a hard access boundary.

(function () {

  // ─────────── EDIT THIS LINE TO SET YOUR PIN ───────────
  // SHA-256 hex of the allowed PIN. Empty string = no gate.
  const ALLOWED_PIN_HASH = 'f48280c0107726b99afcbd3cd0a46a2bac5f1ddb44e8768f232ac4da562eb166';
  // ──────────────────────────────────────────────────────

  const KEY_UNLOCK = 'ws.pin.unlocked';
  const KEY_FAILS = 'ws.pin.fails';
  const KEY_LOCKED_UNTIL = 'ws.pin.lockedUntil';
  const SESSION_MS = 12 * 60 * 60 * 1000; // 12 hours
  const MAX_FAILS = 5;
  const LOCKOUT_MS = 5 * 60 * 1000;       // 5 minutes after MAX_FAILS

  async function sha256(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function readPersistentUnlock() {
    try {
      const raw = localStorage.getItem(KEY_UNLOCK);
      if (!raw) return false;
      const ts = parseInt(raw, 10);
      if (!ts || Date.now() - ts > SESSION_MS) {
        localStorage.removeItem(KEY_UNLOCK);
        return false;
      }
      return true;
    } catch (e) { return false; }
  }

  function setUnlock(remember) {
    try {
      if (remember) localStorage.setItem(KEY_UNLOCK, String(Date.now()));
      else sessionStorage.setItem(KEY_UNLOCK, '1');
    } catch (e) {}
  }

  function unlocked() {
    if (!ALLOWED_PIN_HASH) return true; // gate disabled
    if (readPersistentUnlock()) return true;
    try { return sessionStorage.getItem(KEY_UNLOCK) === '1'; }
    catch (e) { return false; }
  }

  function lockoutRemainingMs() {
    try {
      const ts = parseInt(localStorage.getItem(KEY_LOCKED_UNTIL) || '0', 10);
      if (!ts) return 0;
      const left = ts - Date.now();
      return left > 0 ? left : 0;
    } catch (e) { return 0; }
  }

  function bumpFails() {
    try {
      const n = parseInt(localStorage.getItem(KEY_FAILS) || '0', 10) + 1;
      localStorage.setItem(KEY_FAILS, String(n));
      if (n >= MAX_FAILS) {
        localStorage.setItem(KEY_LOCKED_UNTIL, String(Date.now() + LOCKOUT_MS));
        localStorage.setItem(KEY_FAILS, '0');
      }
      return n;
    } catch (e) { return 0; }
  }

  function clearFails() {
    try {
      localStorage.removeItem(KEY_FAILS);
      localStorage.removeItem(KEY_LOCKED_UNTIL);
    } catch (e) {}
  }

  // Constant-time-ish hex comparison so timing doesn't leak which char
  // diverged. Hashes are fixed-length so this is defensive overkill, but
  // cheap.
  function hashesEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  const PIN = {
    isEnabled() { return !!ALLOWED_PIN_HASH; },
    isUnlocked: unlocked,
    lockoutRemainingMs,

    async verify(pin, remember) {
      if (!ALLOWED_PIN_HASH) return { ok: true };
      const wait = lockoutRemainingMs();
      if (wait > 0) return { ok: false, reason: 'locked', waitMs: wait };
      const h = await sha256(String(pin || ''));
      if (!hashesEqual(h, ALLOWED_PIN_HASH.toLowerCase())) {
        const n = bumpFails();
        const w = lockoutRemainingMs();
        return { ok: false, reason: 'wrong', fails: n, waitMs: w };
      }
      clearFails();
      setUnlock(!!remember);
      return { ok: true };
    },

    lock() {
      try {
        localStorage.removeItem(KEY_UNLOCK);
        sessionStorage.removeItem(KEY_UNLOCK);
      } catch (e) {}
    },

    // Owner helper: paste into the console to compute a hash for a chosen PIN.
    //   await WSPin.hashPin('1234')
    hashPin(pin) { return sha256(String(pin || '')); },
  };

  window.WSPin = PIN;

})();
