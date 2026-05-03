// Realtime in-game stats via ESPN's public (undocumented) site API.
// No key, no quota, CORS-open. Can break without notice — accept the risk.
//
// Strategy:
//   1. Map a Streamed match → an ESPN event by trying likely sport/league
//      paths and fuzzy-matching the two team names + the date.
//   2. Once mapped, poll the ESPN summary endpoint every 30s for stats /
//      events.
//   3. Cache: 60s for scoreboard listings, 30s for per-event summaries.
//
// Supported (with reasonable coverage):
//   soccer, basketball/NBA, football/NFL, baseball/MLB, hockey/NHL,
//   tennis (ATP/WTA), MMA/UFC, racing/F1.
// Out of scope: cricket (no free coverage), boxing (sparse).
//
// Public surface: window.STATS = { findMatch, fetchStats }.

(function () {

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

// Streamed `category` slug → ordered list of ESPN [sport, league] pairs to try.
// Slugs mirror what /api/sports returns:
//   basketball, football (soccer), american-football, hockey, baseball,
//   motor-sports, fight, tennis, rugby, golf, billiards, afl, darts,
//   cricket, other.
const SPORT_TRIES = {
  // Streamed's "football" === soccer globally.
  football: [
    ['soccer', 'usa.1'], ['soccer', 'eng.1'], ['soccer', 'esp.1'],
    ['soccer', 'ita.1'], ['soccer', 'ger.1'], ['soccer', 'fra.1'],
    ['soccer', 'uefa.champions'], ['soccer', 'uefa.europa'],
    ['soccer', 'usa.nwsl'], ['soccer', 'mex.1'], ['soccer', 'por.1'],
    ['soccer', 'ned.1'], ['soccer', 'fifa.world'],
  ],
  'american-football': [['football', 'nfl'], ['football', 'college-football']],
  basketball: [['basketball', 'nba'], ['basketball', 'wnba'], ['basketball', 'mens-college-basketball'], ['basketball', 'womens-college-basketball']],
  baseball: [['baseball', 'mlb'], ['baseball', 'college-baseball']],
  hockey: [['hockey', 'nhl']],
  tennis: [['tennis', 'atp'], ['tennis', 'wta']],
  // ESPN's public scoreboards exist for MMA but not boxing — boxing/top-rank
  // returns 400. Keep just the working endpoints.
  fight: [['mma', 'ufc'], ['mma', 'pfl']],
  'motor-sports': [['racing', 'f1'], ['racing', 'irl'], ['racing', 'nascar-premier']],
  // Rugby league IDs returned 400 against the public scoreboard endpoint.
  rugby: [],
  golf: [['golf', 'pga'], ['golf', 'lpga'], ['golf', 'eur']],
  // AFL ID 64 returns 400 on the public scoreboard endpoint.
  afl: [],
  // ESPN has no reliable public coverage for these.
  cricket: [],
  billiards: [],
  darts: [],
  other: [],
};

// 60s scoreboard / 30s summary cache. Per-request 5s hard timeout via
// AbortController so a stalled network can't freeze the whole findMatch sweep.
// Negative cache (failures) lives 10 min — long enough to stop the spam from
// known-dead endpoints (ESPN returns 400 for several of the league IDs we
// try), short enough that a transient outage will recover on its own.
const _cache = new Map();
const NEG_TTL = 10 * 60 * 1000;
async function getJSON(url, ttl, timeoutMs = 5000) {
  const hit = _cache.get(url);
  if (hit && Date.now() - hit.t < (hit.err ? NEG_TTL : ttl)) {
    if (hit.err) throw hit.err;
    return hit.v;
  }
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method: 'GET', signal: ctl.signal });
    if (!r.ok) {
      const err = new Error(`${r.status} ${url}`);
      _cache.set(url, { t: Date.now(), err });
      throw err;
    }
    const v = await r.json();
    _cache.set(url, { t: Date.now(), v });
    return v;
  } catch (e) {
    // Network/abort errors: cache as a soft failure too so we don't hammer.
    if (!_cache.has(url) || !_cache.get(url).err) {
      _cache.set(url, { t: Date.now(), err: e });
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// Strip noise to compare team names. "Inter Miami CF" ↔ "Inter Miami".
const STOP = /\b(fc|cf|sc|ac|sv|cd|cf|club|the|de|fútbol|futbol|football|soccer|w|men|women)\b/g;
function norm(s) {
  return (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s]/g, ' ').replace(STOP, ' ').replace(/\s+/g, ' ').trim();
}

function similarity(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const aw = new Set(na.split(' ').filter(Boolean));
  const bw = nb.split(' ').filter(Boolean);
  if (!aw.size || !bw.length) return 0;
  const overlap = bw.filter(w => aw.has(w)).length;
  return overlap / Math.max(aw.size, bw.length);
}

function pairScore(streamA, streamB, teamA, teamB) {
  const direct = (similarity(streamA, teamA) + similarity(streamB, teamB)) / 2;
  const swapped = (similarity(streamA, teamB) + similarity(streamB, teamA)) / 2;
  return Math.max(direct, swapped);
}

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

const STATS = {
  // Returns { provider, sport, league, eventId, score } or null.
  async findMatch(match) {
    if (!match || !match.a) return null;
    const tries = SPORT_TRIES[match.sport] || SPORT_TRIES[match.category] || [];
    if (tries.length === 0) return null;

    const baseDate = match.raw && match.raw.date ? new Date(match.raw.date) : new Date();
    const dates = [
      ymd(baseDate),
      ymd(new Date(baseDate.getTime() - 86400000)),
      ymd(new Date(baseDate.getTime() + 86400000)),
    ];

    // Build the full URL fan-out, but throttle to a small pool. Firing
    // every league × date in parallel exhausts Chrome's per-host connection
    // limit (typically 6), causing the back half of the requests to fail
    // with ERR_INSUFFICIENT_RESOURCES even when the network is healthy.
    const jobs = [];
    for (const [sport, league] of tries) {
      for (const d of dates) {
        const url = `${ESPN_BASE}/${sport}/${league}/scoreboard?dates=${d}&limit=200`;
        jobs.push({ sport, league, url });
      }
    }
    const POOL = 5;
    const results = new Array(jobs.length);
    let cursor = 0;
    async function worker() {
      while (true) {
        const i = cursor++;
        if (i >= jobs.length) return;
        const j = jobs[i];
        try {
          const data = await getJSON(j.url, 60000);
          results[i] = { sport: j.sport, league: j.league, data };
        } catch (e) {
          results[i] = null;
        }
      }
    }
    const workers = Array.from({ length: Math.min(POOL, jobs.length) }, worker);
    await Promise.all(workers);

    let best = null;
    for (const r of results) {
      if (!r) continue;
      const { sport, league, data } = r;
      for (const ev of (data.events || [])) {
        const comp = ev.competitions && ev.competitions[0];
        if (!comp || !comp.competitors || comp.competitors.length < 2) continue;
        const t0 = comp.competitors[0].team && comp.competitors[0].team.displayName;
        const t1 = comp.competitors[1].team && comp.competitors[1].team.displayName;
        const s = pairScore(match.a, match.b || '', t0, t1);
        if (s >= 0.55 && (!best || s > best.score)) {
          best = { provider: 'espn', sport, league, eventId: ev.id, score: s };
        }
      }
    }
    return best;
  },

  // Returns normalized stats: { status, clock, period, home, away, stats[], events[] } or null.
  async fetchStats(found) {
    if (!found || found.provider !== 'espn') return null;
    const url = `${ESPN_BASE}/${found.sport}/${found.league}/summary?event=${found.eventId}`;
    const data = await getJSON(url, 30000);
    return normalizeESPN(data, found.sport);
  },
};

// Stat-key → display label per sport family.
const STAT_LABELS = {
  soccer: {
    possessionPct: 'Possession',
    totalShots: 'Shots',
    shotsOnTarget: 'On target',
    wonCorners: 'Corners',
    foulsCommitted: 'Fouls',
    offsides: 'Offsides',
    yellowCards: 'Yellow cards',
    redCards: 'Red cards',
    saves: 'Saves',
    accuratePasses: 'Accurate passes',
    totalPasses: 'Total passes',
  },
  basketball: {
    fieldGoalsMade: 'Field goals',
    'fieldGoalPct': 'FG %',
    'threePointFieldGoalsMade': '3-PT made',
    'threePointFieldGoalPct': '3-PT %',
    'freeThrowsMade': 'Free throws',
    'freeThrowPct': 'FT %',
    rebounds: 'Rebounds',
    assists: 'Assists',
    steals: 'Steals',
    blocks: 'Blocks',
    turnovers: 'Turnovers',
    fouls: 'Fouls',
  },
  football: {
    totalYards: 'Total yards',
    netPassingYards: 'Passing yards',
    rushingYards: 'Rushing yards',
    firstDowns: 'First downs',
    thirdDownEff: '3rd down',
    fourthDownEff: '4th down',
    turnovers: 'Turnovers',
    possessionTime: 'Possession',
    sacksYardsLost: 'Sacks',
    penaltiesYards: 'Penalties',
  },
  baseball: {
    hits: 'Hits', errors: 'Errors', leftOnBase: 'LOB', runs: 'Runs',
  },
  hockey: {
    shotsTotal: 'Shots', powerPlays: 'Power plays', faceoffsWon: 'Faceoffs won', hits: 'Hits', blockedShots: 'Blocks', penaltyMinutes: 'PIM',
  },
};

function pickLogo(team) {
  if (!team) return null;
  if (team.logo) return team.logo;
  const arr = team.logos;
  if (Array.isArray(arr) && arr.length) {
    const byRel = (rel) => arr.find(l => l && l.rel && l.rel.includes(rel) && l.href);
    return (byRel('default') || byRel('full') || byRel('dark') || arr.find(l => l && l.href) || arr[0]).href || null;
  }
  return null;
}

function normalizeESPN(data, sport) {
  if (!data) return null;
  const labels = STAT_LABELS[sport] || {};
  const header = data.header && data.header.competitions && data.header.competitions[0];
  if (!header) return null;
  const competitors = header.competitors || [];
  const home = competitors.find(c => c.homeAway === 'home') || competitors[0] || {};
  const away = competitors.find(c => c.homeAway === 'away') || competitors[1] || {};
  const status = header.status && header.status.type;
  const state = status && status.state;

  const out = {
    status: !status ? 'pre' : status.completed ? 'final' : state === 'in' ? 'live' : 'pre',
    clock: header.status && header.status.displayClock,
    period: status && status.shortDetail,
    home: {
      name: home.team && home.team.displayName,
      shortName: home.team && (home.team.abbreviation || home.team.shortDisplayName),
      score: home.score != null ? home.score : '—',
      logo: pickLogo(home.team),
    },
    away: {
      name: away.team && away.team.displayName,
      shortName: away.team && (away.team.abbreviation || away.team.shortDisplayName),
      score: away.score != null ? away.score : '—',
      logo: pickLogo(away.team),
    },
    stats: [],
    events: [],
  };

  const boxscore = data.boxscore;
  if (boxscore && boxscore.teams && boxscore.teams.length === 2) {
    const ht = boxscore.teams.find(t => t.homeAway === 'home') || boxscore.teams[0];
    const at = boxscore.teams.find(t => t.homeAway === 'away') || boxscore.teams[1];
    const hs = (ht.statistics || []);
    const as = (at.statistics || []);
    hs.forEach(h => {
      const label = labels[h.name];
      if (!label) return;
      const a = as.find(s => s.name === h.name);
      out.stats.push({ label, home: h.displayValue, away: a ? a.displayValue : '—' });
    });
  }

  const keyEvents = data.keyEvents || data.scoringPlays || [];
  out.events = keyEvents.slice(0, 50).map(ev => {
    const team = ev.team && (ev.team.displayName || ev.team.abbreviation);
    const time = (ev.clock && ev.clock.displayValue) || ev.period && ev.period.displayValue || '';
    const text = ev.text || (ev.shortText) || (ev.scoringType && ev.scoringType.displayName) || '';
    const kind = (ev.type && (ev.type.text || ev.type.id)) || '';
    return { time, text, kind, team, scoringPlay: !!ev.scoringPlay };
  }).filter(e => e.text);

  return out;
}

// Per-match logo memo. ESPN summary lookups are expensive (findMatch fans out
// across leagues/dates), and grid views can render dozens of MatchCover at
// once — so cache the resolved {home,away} URLs by match id, and dedupe
// in-flight requests so N cards for the same match only trigger one lookup.
const _logoCache = new Map();      // matchId → { t, v: {home, away} | null }
const _logoInflight = new Map();   // matchId → Promise
const LOGO_TTL_OK = 30 * 60 * 1000;
const LOGO_TTL_MISS = 5 * 60 * 1000;

STATS.findLogos = function (match) {
  if (!match || !match.id) return Promise.resolve(null);
  const key = match.id;
  const cached = _logoCache.get(key);
  if (cached) {
    const age = Date.now() - cached.t;
    if (cached.v && age < LOGO_TTL_OK) return Promise.resolve(cached.v);
    if (!cached.v && age < LOGO_TTL_MISS) return Promise.resolve(null);
  }
  if (_logoInflight.has(key)) return _logoInflight.get(key);
  const p = (async () => {
    try {
      const found = await STATS.findMatch(match);
      if (!found) {
        _logoCache.set(key, { t: Date.now(), v: null });
        return null;
      }
      const url = `${ESPN_BASE}/${found.sport}/${found.league}/summary?event=${found.eventId}`;
      const data = await getJSON(url, 30000);
      const norm = normalizeESPN(data, found.sport);
      const home = norm && norm.home && norm.home.logo;
      const away = norm && norm.away && norm.away.logo;
      if (!home && !away) {
        _logoCache.set(key, { t: Date.now(), v: null });
        return null;
      }
      const logos = { home: home || null, away: away || null };
      _logoCache.set(key, { t: Date.now(), v: logos });
      return logos;
    } catch (e) {
      _logoCache.set(key, { t: Date.now(), v: null });
      return null;
    } finally {
      _logoInflight.delete(key);
    }
  })();
  _logoInflight.set(key, p);
  return p;
};

window.STATS = STATS;

})();
