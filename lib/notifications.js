// Game-start notification scheduler.
//
// Uses the browser Notification API + setTimeout. Notifications only fire
// while the WebStreamer tab is open (or has been open recently — browsers
// keep timers alive in background tabs but throttle them). No service
// worker, no backend, no infrastructure cost.
//
// Subscribes to WSStore: whenever the notifications array changes, we
// rebuild the timer table to match. Stale notifications (start > 4h ago)
// are pruned on boot and on every store change.
//
// Public surface: window.WSNotify = { ensurePermission, fireTest }.

(function () {
  if (!window.WSStore) return;
  const Store = window.WSStore;

  const timers = new Map();   // notification.id → setTimeout handle

  function clearAll() {
    timers.forEach(h => clearTimeout(h));
    timers.clear();
  }

  function fire(notification) {
    const m = notification.match;
    const matchup = m.a + (m.b ? ' vs ' + m.b : '');
    const lead = notification.leadMinutes || 0;
    const body = lead > 0
      ? `Starts in ${lead} minute${lead === 1 ? '' : 's'}` + (m.league ? ' · ' + m.league : '')
      : `Starting now` + (m.league ? ' · ' + m.league : '');
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification(matchup, {
          body,
          tag: 'webstreamer:' + m.id,
          renotify: true,
          silent: false,
        });
        n.onclick = () => {
          window.focus();
          if (window.WS_GO) window.WS_GO('player', m);
          n.close();
        };
      }
    } catch (e) { /* swallow — notification failure shouldn't break the app */ }
    Store.markNotified(m.id);
  }

  function reschedule() {
    clearAll();
    Store.pruneStaleNotifications();
    const enabled = Store.get().settings.notifyEnabled;
    if (!enabled) return;
    const list = Store.get().notifications;
    const now = Date.now();
    list.forEach(n => {
      if (n.notified) return;
      const delay = n.fireAt - now;
      if (delay <= 0) {
        // Fire-time already passed — fire immediately if start hasn't passed too.
        if (n.match.startMs > now - 60 * 1000) fire(n);
        else Store.markNotified(n.id);
        return;
      }
      // setTimeout caps at ~24.8 days (int32 ms). For longer leads, schedule
      // a tick that will reschedule itself when closer.
      const MAX = 2 ** 31 - 1;
      const ms = Math.min(delay, MAX);
      const handle = setTimeout(() => {
        timers.delete(n.id);
        if (delay > MAX) reschedule();   // re-arm with a fresh window
        else fire(n);
      }, ms);
      timers.set(n.id, handle);
    });
  }

  Store.subscribe(reschedule);
  reschedule();

  window.WSNotify = {
    // Asks the user for permission. Returns the resulting permission string
    // ('granted' | 'denied' | 'default'). Call from a user gesture.
    async ensurePermission() {
      if (!('Notification' in window)) return 'unsupported';
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      try {
        const p = await Notification.requestPermission();
        return p;
      } catch (e) {
        return Notification.permission;
      }
    },
    fireTest() {
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('WebStreamer test', { body: 'Notifications are working.' });
        }
      } catch (e) {}
    },
  };
})();
