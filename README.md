# WebStreamer

A single-page React UI for browsing live sports streams. Aggregates match
listings from the public [streamed.pk](https://streamed.pk) API and overlays
real-time scores / box-score stats from ESPN's public site API.

The app runs entirely in the browser — no build step, no backend, no API
keys. Open `WebStreamer.html` through any HTTP server and it works.

## Run locally

The page must be served over `http(s)://` (not `file://`) so that the
streamed.pk and ESPN APIs respond to CORS.

Any static server works:

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

Then visit `http://localhost:8080/WebStreamer.html`.

## Architecture

```
WebStreamer.html        — entry point, routing, top-level data load
lib/
  store.js              — localStorage-backed client store (watchlist,
                          recently watched, settings, notifications)
  streamed.js           — streamed.pk API client + match shape mapper
  stats.js              — ESPN scoreboard / boxscore client + fuzzy match
                          mapper (Streamed match → ESPN event)
  notifications.js      — game-start reminder scheduler (Notification API)
tokens.jsx              — design tokens (colors, typography, spacing)
data.jsx                — fallback mock data (used when API/CORS fails)
chrome.jsx              — TopNav, SideNav, shared chrome
ios-frame.jsx           — iOS-style mobile chrome wrapper
screens-home.jsx        — home grid (desktop)
screens-detail.jsx      — match detail + player (desktop)
screens-other.jsx       — schedule / search / watchlist / settings
screens-mobile.jsx      — mobile home / detail / player
design-canvas.jsx       — design system reference canvas
```

React, ReactDOM, and Babel-standalone are loaded from unpkg. JSX is
transpiled in the browser. This is convenient for a prototype but is
**not optimal for production traffic** — for a real deployment, swap to
production React builds and pre-build the JSX.

## Data sources

Both APIs are **public, undocumented, and used without authentication**.
They can change or break without notice.

- `https://streamed.pk/api` — match listings, sources, embed URLs
- `https://site.api.espn.com/apis/site/v2/sports` — scoreboards, boxscores,
  team logos

If either API is unreachable (CORS, network, server down), the app
gracefully degrades to the mock data in `data.jsx` and shows an "API
offline" banner.

## Persistence

User state (watchlist, recently watched, sport filter, settings,
scheduled notifications) is stored in `localStorage` under the key
`webstreamer.v1`. There is no server-side persistence and no telemetry.

## Notes on stream content

Stream embed URLs are served by streamed.pk. WebStreamer only renders
the URLs the API returns — it does not host, transcode, or rebroadcast
any video content.

## License

No license has been declared. All rights reserved by the author until
one is added.
