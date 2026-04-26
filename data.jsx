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

const MATCHES = [];

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
