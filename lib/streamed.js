// Streamed.pk public API client
// Docs: https://streamed.pk/docs
//
// Endpoints used:
//   GET /api/sports                           → [{id, name}]
//   GET /api/matches/all|live|all-today       → [Match]
//   GET /api/matches/{sport}                  → [Match]
//   GET /api/stream/{source}/{id}             → [Stream]
//   GET /api/images/badge/{id}.webp
//   GET /api/images/poster/{home}/{away}.webp
//   GET /api/images/proxy/{poster}.webp
//
// Match  : { id, title, category, date, poster?, popular,
//            teams:{home:{name,badge}, away:{name,badge}},
//            sources:[{source, id}] }
// Stream : { id, streamNo, language, hd, embedUrl, source }

const STREAMED_BASE = 'https://streamed.pk/api';

// Hash a string into a stable 0..360 hue so each match gets a consistent tile color.
function hashHue(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

function fmtClock(unixMs) {
  if (!unixMs) return '';
  const d = new Date(unixMs);
  const now = Date.now();
  const sameDay = new Date(now).toDateString() === d.toDateString();
  let h = d.getHours();
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const time = `${h}:${mm} ${ampm}`;
  if (sameDay) return time;
  return d.toLocaleDateString(undefined, { weekday: 'short' }) + ' ' + time;
}

// Map a Streamed match into the shape our existing screens expect.
// Existing shape: {id, sport, league, a, b, score, clock, live, viewers, hue, sources, poster, rawSources, raw}
function mapMatch(m, isLive) {
  const home = m.teams && m.teams.home;
  const away = m.teams && m.teams.away;
  // Some matches have no team objects (e.g. solo events) — fall back to title split.
  let a = home && home.name;
  let b = away && away.name;
  if (!a) {
    const parts = (m.title || '').split(/\s+vs?\.?\s+/i);
    a = parts[0] || m.title || 'Match';
    b = parts[1] || '';
  }
  // Coerce to strings so React never sees raw numbers (which would render as
  // literal "0" via the && short-circuit pattern in JSX).
  a = a == null ? '' : String(a);
  b = b == null ? '' : String(b);
  // Build a fallback chain. Streamed returns `poster` in two possible shapes:
  //   - a full path like "/api/images/proxy/{hash}.webp" (current; common for fights/wrestling)
  //   - a bare hash string (legacy) → wrap with the proxy URL
  // Prepend the host without double-stacking /api.
  const HOST = STREAMED_BASE.replace(/\/api\/?$/, '');
  const posterChain = [];
  if (m.poster) {
    if (typeof m.poster === 'string' && m.poster.startsWith('http')) {
      posterChain.push(m.poster);
    } else if (typeof m.poster === 'string' && m.poster.startsWith('/')) {
      posterChain.push(HOST + m.poster);
    } else {
      posterChain.push(`${STREAMED_BASE}/images/proxy/${m.poster}.webp`);
    }
  }
  // We deliberately DO NOT include Streamed's `/images/poster/{home}/{away}.webp`
  // composite. It's hit-or-miss: big leagues get polished art, smaller fixtures
  // get a full-size placeholder with diagonal stripes + medal icon. The
  // placeholder is large enough to bypass dimension-based detection, so the
  // only way to keep the look consistent is to skip the endpoint entirely
  // and let MatchCover render its own designed BadgeComposite.
  const posterUrl = posterChain[0] || null;
  // Live iff:
  //   - the API returned this from /matches/live (isLive flag), OR
  //   - the match has stream sources AND isn't scheduled for the future.
  // Streamed only attaches `sources` to matches with actual airing feeds,
  // so anything with sources that isn't more than 15 min from starting is
  // currently broadcasting. Covers both:
  //   - scheduled matches that started already / started a few min early
  //   - 24/7 channels like "Rally TV" / "Willow Cricket" with no date set
  const now = Date.now();
  const hasSources = Array.isArray(m.sources) && m.sources.length > 0;
  const date = typeof m.date === 'number' ? m.date : 0;
  const scheduledForFuture = date > 0 && date - now > 15 * 60 * 1000;
  const live = !!(isLive || (hasSources && !scheduledForFuture));
  const leagueRaw = m.category == null ? '' : String(m.category);
  const clockStr = live ? 'LIVE' : (fmtClock(m.date) || '');
  return {
    id: m.id,
    sport: leagueRaw,
    league: leagueRaw.toUpperCase(),
    a, b,
    score: '—',
    clock: clockStr,
    live,
    viewers: null,
    hue: hashHue(m.id || m.title || 'x'),
    sources: (m.sources || []).length,
    poster: posterUrl,
    posterChain,
    homeBadge: home && home.badge ? `${STREAMED_BASE}/images/badge/${home.badge}.webp` : null,
    awayBadge: away && away.badge ? `${STREAMED_BASE}/images/badge/${away.badge}.webp` : null,
    rawSources: m.sources || [],
    raw: m,
  };
}

// 30 second TTL cache to avoid rate hitting Streamed on repeated nav.
const _cache = new Map();
async function getJSON(path) {
  const now = Date.now();
  const hit = _cache.get(path);
  if (hit && now - hit.t < 30000) return hit.v;
  const r = await fetch(STREAMED_BASE + path, { method: 'GET' });
  if (!r.ok) throw new Error(`Streamed ${path} → HTTP ${r.status}`);
  const v = await r.json();
  _cache.set(path, { t: now, v });
  return v;
}

const STREAMED = {
  base: STREAMED_BASE,

  async sports() {
    const arr = await getJSON('/sports');
    return [{ id: 'all', label: 'All' }].concat(arr.map(s => ({ id: s.id, label: s.name })));
  },

  async matches({ filter = 'live', sport = null, popular = false } = {}) {
    let path;
    if (sport && sport !== 'all') {
      path = `/matches/${encodeURIComponent(sport)}` + (popular ? '/popular' : '');
    } else {
      // filter ∈ 'live' | 'all' | 'all-today'
      const f = ['live', 'all', 'all-today'].includes(filter) ? filter : 'live';
      path = `/matches/${f}` + (popular ? '/popular' : '');
    }
    const arr = await getJSON(path);
    const live = filter === 'live';
    return arr.map(m => mapMatch(m, live));
  },

  async streams(source, id) {
    if (!source || !id) return [];
    return getJSON(`/stream/${encodeURIComponent(source)}/${encodeURIComponent(id)}`);
  },

  // Fetch streams for every source on a match, in parallel. Failed sources are dropped.
  async allStreams(match) {
    if (!match || !match.rawSources || !match.rawSources.length) return [];
    const settled = await Promise.allSettled(
      match.rawSources.map(s => STREAMED.streams(s.source, s.id))
    );
    const out = [];
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        const src = match.rawSources[i].source;
        r.value.forEach(stream => out.push({ ...stream, source: stream.source || src }));
      }
    });
    return out;
  },
};

window.STREAMED = STREAMED;
