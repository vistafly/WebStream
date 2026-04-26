// Mock data for WebStreamer

// Mirrors streamed.pk's category slugs. Replaced at runtime with whatever
// /api/sports returns, but kept here as fallback for offline / mock mode.
const SPORTS = [
  { id: 'all', label: 'All' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'football', label: 'Football' },
  { id: 'american-football', label: 'American Football' },
  { id: 'hockey', label: 'Hockey' },
  { id: 'baseball', label: 'Baseball' },
  { id: 'motor-sports', label: 'Motor Sports' },
  { id: 'fight', label: 'Fight (UFC, Boxing)' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'rugby', label: 'Rugby' },
  { id: 'golf', label: 'Golf' },
  { id: 'billiards', label: 'Billiards' },
  { id: 'afl', label: 'AFL' },
  { id: 'darts', label: 'Darts' },
  { id: 'cricket', label: 'Cricket' },
  { id: 'other', label: 'Other' },
];

const MATCHES = [
  { id: 'm1', sport: 'soccer', league: 'UCL · Quarter-final', a: 'Arsenal', b: 'Real Madrid', score: '1—1', clock: "63'", live: true, viewers: '482K', hue: 220, sources: 7 },
  { id: 'm2', sport: 'basketball', league: 'NBA · Conf. Finals', a: 'Boston', b: 'Denver', score: '88—84', clock: 'Q3 4:12', live: true, viewers: '317K', hue: 30, sources: 5 },
  { id: 'm3', sport: 'football', league: 'NFL · Sunday Night', a: 'Chiefs', b: 'Eagles', score: '21—17', clock: 'Q3 11:08', live: true, viewers: '901K', hue: 10, sources: 9 },
  { id: 'm4', sport: 'tennis', league: 'ATP Madrid · SF', a: 'Alcaraz', b: 'Sinner', score: '6-4 · 3-2', clock: 'Set 2', live: true, viewers: '124K', hue: 100, sources: 4 },
  { id: 'm5', sport: 'f1', league: 'Miami GP · Race', a: 'Verstappen', b: 'Norris', score: 'L42 / 57', clock: '+1.8s', live: true, viewers: '256K', hue: 280, sources: 6 },
  { id: 'm6', sport: 'mma', league: 'UFC 312 · Main', a: 'du Plessis', b: 'Adesanya', score: 'R3', clock: '2:40', live: true, viewers: '198K', hue: 0, sources: 5 },
  { id: 'm7', sport: 'soccer', league: 'Premier League', a: 'Liverpool', b: 'Man City', score: '—', clock: '19:30', live: false, viewers: null, hue: 350, sources: 0 },
  { id: 'm8', sport: 'cricket', league: 'IPL · Final', a: 'CSK', b: 'MI', score: '184/4', clock: 'Ov 18.2', live: true, viewers: '2.1M', hue: 60, sources: 8 },
  { id: 'm9', sport: 'basketball', league: 'EuroLeague', a: 'Olympiacos', b: 'Real Madrid', score: '72—68', clock: 'Q4 3:00', live: true, viewers: '88K', hue: 200, sources: 3 },
  { id: 'm10', sport: 'football', league: 'NCAAF', a: 'Michigan', b: 'Ohio St.', score: '—', clock: 'Sat 15:30', live: false, viewers: null, hue: 50, sources: 0 },
  { id: 'm11', sport: 'tv', league: 'Live TV · News', a: 'BBC News', b: '', score: '', clock: 'LIVE', live: true, viewers: '44K', hue: 240, sources: 2 },
  { id: 'm12', sport: 'events', league: 'Coachella · Main', a: 'Main Stage', b: '', score: '', clock: 'LIVE', live: true, viewers: '612K', hue: 320, sources: 4 },
];

const SERVERS = [
  { id: 'alpha', name: 'Alpha', region: 'EU‑West', latency: 42, quality: ['1080p60', '720p', '480p'], rec: true },
  { id: 'bravo', name: 'Bravo', region: 'US‑East', latency: 88, quality: ['1080p', '720p'], rec: false },
  { id: 'charlie', name: 'Charlie', region: 'US‑West', latency: 124, quality: ['720p', '480p'], rec: false },
  { id: 'delta', name: 'Delta', region: 'Asia', latency: 210, quality: ['1080p', '720p', '480p'], rec: false },
  { id: 'echo', name: 'Echo', region: 'EU‑Central', latency: 58, quality: ['4K', '1080p60', '720p'], rec: false },
];

const SCHEDULE = [
  { time: '14:00', a: 'Bayern', b: 'Dortmund', league: 'Bundesliga', sport: 'soccer' },
  { time: '15:30', a: 'Lakers', b: 'Warriors', league: 'NBA Playoffs', sport: 'basketball' },
  { time: '17:00', a: 'Djokovic', b: 'Medvedev', league: 'ATP · Madrid', sport: 'tennis' },
  { time: '19:30', a: 'Liverpool', b: 'Man City', league: 'Premier League', sport: 'soccer' },
  { time: '20:00', a: 'India', b: 'Australia', league: 'Test · Day 4', sport: 'cricket' },
  { time: '21:15', a: 'Cowboys', b: 'Giants', league: 'NFL Monday Night', sport: 'football' },
  { time: '23:00', a: 'UFC 313', b: 'Prelims', league: 'UFC', sport: 'mma' },
];

Object.assign(window, { SPORTS, MATCHES, SERVERS, SCHEDULE });
