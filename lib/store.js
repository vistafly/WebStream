// Shared client-side store: subscribers + localStorage persistence for
// watchlist, recently-watched, settings, sport filter, and search query.

(function () {
  const KEY = 'webstreamer.v1';
  const DEFAULTS = {
    watchlist: [],          // array of match ids
    recently: [],           // array of {id, a, b, league, sport, hue, poster, ts}
    notifications: [],      // array of {id, match:{id,a,b,league,sport,hue,startMs}, fireAt, notified}
    sportFilter: 'all',
    search: '',
    settings: {
      defaultQuality: 'Auto',
      region: 'Auto',
      adShield: true,
      sourceVerify: true,
      autoSwitch: true,
      pipDefault: false,
      theme: 'Dark',
      notifyEnabled: false,        // requires browser permission grant
      notifyLeadMinutes: 30,       // notify N minutes before scheduled start
    },
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const parsed = JSON.parse(raw);
      return Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), parsed, {
        settings: Object.assign({}, DEFAULTS.settings, parsed.settings || {}),
      });
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULTS));
    }
  }

  let state = load();
  const subs = new Set();

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function notify() {
    subs.forEach(fn => { try { fn(state); } catch (e) {} });
  }

  const Store = {
    get() { return state; },

    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },

    // Watchlist
    isWatched(id) { return state.watchlist.includes(id); },
    toggleWatch(id) {
      if (!id) return;
      const i = state.watchlist.indexOf(id);
      if (i >= 0) state.watchlist.splice(i, 1);
      else state.watchlist.push(id);
      persist(); notify();
    },

    // Recently watched (cap at 12, dedup by id, latest first)
    pushRecent(m) {
      if (!m || !m.id) return;
      state.recently = [{
        id: m.id, a: m.a, b: m.b, league: m.league, sport: m.sport,
        hue: m.hue, poster: m.poster, ts: Date.now(),
      }].concat(state.recently.filter(r => r.id !== m.id)).slice(0, 12);
      persist(); notify();
    },

    // Sport filter
    setSport(s) { state.sportFilter = s || 'all'; persist(); notify(); },

    // Search
    setSearch(q) { state.search = q || ''; notify(); },

    // Settings
    setSetting(k, v) {
      state.settings = Object.assign({}, state.settings, { [k]: v });
      persist(); notify();
    },

    // Notifications (game-start reminders). Fired by lib/notifications.js
    // while the WebStreamer tab is open.
    isNotifyScheduled(id) {
      return !!state.notifications.find(n => n.id === id && !n.notified);
    },
    // Returns:
    //   { ok: true }                          → reminder scheduled
    //   { ok: false, reason: 'no-id' }        → bad input
    //   { ok: false, reason: 'no-start-time' } → match has no scheduled date
    //   { ok: false, reason: 'too-late', minutesUntilStart, leadMinutes }
    //                                         → lead window already past; nothing scheduled
    addNotification(match, leadMinutes) {
      if (!match || !match.id) return { ok: false, reason: 'no-id' };
      const startMs = match.raw && typeof match.raw.date === 'number' ? match.raw.date : 0;
      if (!startMs) return { ok: false, reason: 'no-start-time' };
      const lead = typeof leadMinutes === 'number' ? leadMinutes : (state.settings.notifyLeadMinutes || 0);
      const fireAt = startMs - lead * 60 * 1000;
      const now = Date.now();
      if (fireAt <= now) {
        return {
          ok: false, reason: 'too-late',
          minutesUntilStart: Math.max(0, Math.round((startMs - now) / 60000)),
          leadMinutes: lead,
        };
      }
      state.notifications = state.notifications.filter(n => n.id !== match.id);
      state.notifications.push({
        id: match.id,
        match: {
          id: match.id, a: match.a, b: match.b, league: match.league,
          sport: match.sport, hue: match.hue, startMs,
        },
        fireAt, notified: false, leadMinutes: lead,
      });
      persist(); notify();
      return { ok: true };
    },
    removeNotification(id) {
      if (!id) return;
      state.notifications = state.notifications.filter(n => n.id !== id);
      persist(); notify();
    },
    markNotified(id) {
      const n = state.notifications.find(x => x.id === id);
      if (!n) return;
      n.notified = true;
      persist(); notify();
    },
    clearNotified() {
      state.notifications = state.notifications.filter(n => !n.notified);
      persist(); notify();
    },
    pruneStaleNotifications() {
      // Drop notifications whose start time has passed by > 4 hours.
      const cutoff = Date.now() - 4 * 60 * 60 * 1000;
      const before = state.notifications.length;
      state.notifications = state.notifications.filter(n => n.match.startMs > cutoff);
      if (state.notifications.length !== before) { persist(); notify(); }
    },
  };

  // React hook (defined later, after React loads). We re-export via window.useWS.
  window.WSStore = Store;
})();

// React hook helper — works once React is on window. Re-renders subscriber
// component whenever the store changes.
window.useWSStore = function () {
  const [, bump] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => window.WSStore.subscribe(() => bump()), []);
  return window.WSStore;
};
