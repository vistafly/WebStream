// Shared design tokens for WebStreamer

const T = {
  // Dark broadcast palette — warm-cool neutral
  bg0: '#0a0b0d',        // page
  bg1: '#0f1114',        // surface
  bg2: '#15181c',        // raised surface
  bg3: '#1c2026',        // higher
  hairline: 'rgba(255,255,255,0.07)',
  hairlineStrong: 'rgba(255,255,255,0.12)',
  text: '#eef0f2',
  textDim: 'rgba(238,240,242,0.62)',
  textFaint: 'rgba(238,240,242,0.38)',

  // Single accent — signal green
  live: 'oklch(0.74 0.17 145)',
  liveDim: 'oklch(0.74 0.17 145 / 0.18)',

  // Status accents (sparingly)
  warn: 'oklch(0.78 0.14 75)',

  font: '"Inter Tight", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
};

// Striped placeholder thumbnail (no hand-drawn team art)
function Placeholder({ label, sub, hue = 200, ratio = '16/9', style = {} }) {
  const id = React.useId();
  return (
    <div style={{
      position: 'relative', aspectRatio: ratio, width: '100%',
      background: `oklch(0.18 0.02 ${hue})`,
      overflow: 'hidden', borderRadius: 8,
      ...style,
    }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="14" stroke={`oklch(0.24 0.02 ${hue})`} strokeWidth="6"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`}/>
      </svg>
      {label && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          fontFamily: T.mono, fontSize: 10, color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          <div>{label}</div>
          {sub && <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>{sub}</div>}
        </div>
      )}
    </div>
  );
}

// LIVE badge
function LiveDot({ size = 6, label = 'LIVE' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: T.font, fontSize: 10, fontWeight: 600,
      letterSpacing: '0.12em', color: T.live,
    }}>
      <span style={{
        width: size, height: size, borderRadius: '50%',
        background: T.live, boxShadow: `0 0 8px ${T.live}`,
        animation: 'wsPulse 1.6s ease-in-out infinite',
      }}/>
      {label}
    </span>
  );
}

// Pill
function Pill({ children, active, onClick, style = {} }) {
  return (
    <button onClick={onClick} style={{
      height: 28, padding: '0 12px', borderRadius: 999,
      border: `1px solid ${active ? T.hairlineStrong : T.hairline}`,
      background: active ? T.bg3 : 'transparent',
      color: active ? T.text : T.textDim,
      fontFamily: T.font, fontSize: 12, fontWeight: 500,
      cursor: 'pointer', whiteSpace: 'nowrap',
      transition: 'all .15s', ...style,
    }}>{children}</button>
  );
}

// Tiny inline icon set — geometric only, no hand-drawn detail
const Icons = {
  search: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  star: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5L8.7 5l3.8.5-2.8 2.7.7 3.8L7 10.2 3.6 12l.7-3.8L1.5 5.5l3.8-.5L7 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  starFill: <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1.5L8.7 5l3.8.5-2.8 2.7.7 3.8L7 10.2 3.6 12l.7-3.8L1.5 5.5l3.8-.5L7 1.5z" fill="currentColor"/></svg>,
  play: <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 1.5L10 6L3 10.5V1.5z" fill="currentColor"/></svg>,
  pip: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="6" width="5" height="4" fill="currentColor"/></svg>,
  expand: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 5V2H5M9 2H12V5M12 9V12H9M5 12H2V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  shield: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1L11 3V6.5C11 9 8.5 10.5 6 11C3.5 10.5 1 9 1 6.5V3L6 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M4 6L5.5 7.5L8 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chev: <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  signal: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="9" width="2" height="4" fill="currentColor"/><rect x="5" y="6" width="2" height="7" fill="currentColor"/><rect x="9" y="3" width="2" height="10" fill="currentColor"/></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4V7L9 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  filter: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3H12L8.5 7V11L5.5 12V7L2 3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  cast: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M3.5 5.5C5.5 5.5 7.5 7 7.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/><circle cx="3.5" cy="9" r="0.8" fill="currentColor"/></svg>,
  vol: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 5.5V8.5H4L7 11V3L4 5.5H2Z" fill="currentColor"/><path d="M9 5C10 6 10 8 9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  settings: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M7 1V3M7 11V13M11.5 2.5L10 4M4 10L2.5 11.5M13 7H11M3 7H1M11.5 11.5L10 10M4 4L2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  bell: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 6C3 4 4.5 2.5 7 2.5C9.5 2.5 11 4 11 6V8L12 9.5H2L3 8V6Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M5.5 11.5C5.7 12.3 6.3 12.5 7 12.5C7.7 12.5 8.3 12.3 8.5 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  home: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 6L7 2L12 6V11.5C12 11.8 11.8 12 11.5 12H9V8.5H5V12H2.5C2.2 12 2 11.8 2 11.5V6Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  x: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
};

// Global keyframes + scroll
if (typeof document !== 'undefined' && !document.getElementById('ws-global')) {
  const s = document.createElement('style');
  s.id = 'ws-global';
  s.textContent = `
    @keyframes wsPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }
    @keyframes wsShimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
    .ws-scroll { scrollbar-width: thin; scrollbar-color: ${T.hairlineStrong} transparent; }
    .ws-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
    .ws-scroll::-webkit-scrollbar-thumb { background: ${T.hairlineStrong}; border-radius: 8px; }
    .ws-scroll::-webkit-scrollbar-track { background: transparent; }
  `;
  document.head.appendChild(s);
}

Object.assign(window, { T, Placeholder, LiveDot, Pill, Icons });
