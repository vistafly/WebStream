// Mobile screens

function MobileShell({ children }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: T.bg0,
      display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
      paddingTop: 'env(safe-area-inset-top)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

function MobileTabBar({ active = 'home' }) {
  const items = [
    { id: 'home', route: 'home', label: 'Live', icon: Icons.signal },
    { id: 'sched', route: 'schedule', label: 'Schedule', icon: Icons.clock },
    { id: 'search', route: 'search', label: 'Search', icon: Icons.search },
    { id: 'watch', route: 'watchlist', label: 'Watchlist', icon: Icons.starFill },
    { id: 'recent', route: 'recent', label: 'Recent', icon: Icons.clock },
  ];
  return (
    <div style={{
      borderTop: `1px solid ${T.hairline}`,
      paddingTop: 6,
      paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)',
      background: T.bg0, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
      flexShrink: 0,
    }}>
      {items.map(it => (
        <div key={it.id}
          onClick={() => window.WS_GO && window.WS_GO(it.route)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: it.id === active ? T.live : T.textDim, padding: '6px 0',
            cursor: 'pointer',
          }}>
          <span>{it.icon}</span>
          <span style={{ fontFamily: T.font, fontSize: 10, fontWeight: 500 }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

function MobileHome() {
  const store = window.useWSStore();
  const sportFilter = store.get().sportFilter;
  const filtered = sportFilter === 'all' ? MATCHES : MATCHES.filter(m => (m.sport || '').toLowerCase() === sportFilter);
  const live = filtered.filter(m => m.live);
  return (
    <MobileShell>
      <div style={{ padding: '4px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => window.WS_GO && window.WS_GO('home')} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <div style={{
            width: 22, height: 22, borderRadius: 5,
            background: `linear-gradient(135deg, ${T.live}, oklch(0.55 0.14 165))`,
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', inset: 6, background: T.bg0, borderRadius: 2 }}/>
          </div>
          <span style={{ fontFamily: T.font, fontSize: 16, fontWeight: 700, color: T.text }}>WebStreamer</span>
        </div>
        <button onClick={() => window.WS_GO && window.WS_GO('settings')} style={{ ...iconBtn, color: T.live }}>{Icons.settings}</button>
      </div>

      <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        <div onClick={() => window.WS_GO && window.WS_GO('search')} style={{
          height: 38, background: T.bg2, border: `1px solid ${T.hairline}`,
          borderRadius: 10, padding: '0 12px', display: 'flex',
          alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer',
        }}>
          <span style={{ color: T.textDim }}>{Icons.search}</span>
          <span style={{ fontFamily: T.font, fontSize: 13, color: T.textDim }}>Search teams, leagues…</span>
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
          {(() => {
            const counts = {};
            MATCHES.forEach(mm => { counts[mm.sport] = (counts[mm.sport] || 0) + 1; });
            return SPORTS.filter(s => s.id === 'all' || counts[s.id] > 0)
              .map((s) => <Pill key={s.id} active={s.id === sportFilter} onClick={() => store.setSport(s.id)}>{s.label}</Pill>);
          })()}
        </div>

        <SectionHeader title="Live Now" sub={`${live.length} streams`}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {live.map(m => <MatchCard key={m.id} m={m}/>)}
          {filtered.length === 0 && (
            <div style={{
              padding: '32px 12px', textAlign: 'center',
              fontFamily: T.mono, fontSize: 12, color: T.textDim,
              border: `1px dashed ${T.hairline}`, borderRadius: 10,
            }}>
              Loading live matches…<br/>
              <span style={{ opacity: 0.7, fontSize: 11 }}>If this persists, the streamed.pk API may be unreachable from your network.</span>
            </div>
          )}
        </div>
      </div>

      <MobileTabBar active="home"/>
    </MobileShell>
  );
}

function MobilePlayer({ match, streams, streamsLoading }) {
  const m = match || (typeof MATCHES !== 'undefined' && MATCHES[0]) || {};
  const realStreams = Array.isArray(streams) ? streams : [];
  const sources = Array.from(new Set(realStreams.map(s => s.source)));
  const [activeSource, setActiveSource] = React.useState(sources[0] || null);
  const [iframeLoaded, setIframeLoaded] = React.useState(false);
  const [holdReleased, setHoldReleased] = React.useState(false);
  const [fallbackElapsed, setFallbackElapsed] = React.useState(false);
  React.useEffect(() => {
    setActiveSource(sources[0] || null);
    setIframeLoaded(false);
    setHoldReleased(false);
    setFallbackElapsed(false);
    const tHold = setTimeout(() => setHoldReleased(true), 1000);
    const tFallback = setTimeout(() => setFallbackElapsed(true), 4000);
    return () => { clearTimeout(tHold); clearTimeout(tFallback); };
  }, [m.id, sources.length]);
  const activeStream = realStreams.find(s => s.source === activeSource) || realStreams[0];
  const showIframe = (iframeLoaded || fallbackElapsed) && holdReleased;
  const { stats, available: statsAvailable } = window.useMatchStats(m);
  const [statsOpen, setStatsOpen] = React.useState(false);
  const playerRef = React.useRef(null);
  const { isFullscreen, request: requestFullscreen, exit: exitFullscreen } = window.useFullscreen(playerRef);
  const controlsVisible = window.usePlayerActivity(playerRef, 3000);
  return (
    <div ref={playerRef} style={{ width: '100%', height: '100%', background: '#000', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        {activeStream && activeStream.embedUrl && (
          <iframe
            src={activeStream.embedUrl}
            onLoad={() => setIframeLoaded(true)}
            allow="autoplay; picture-in-picture"
            referrerPolicy="no-referrer"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              border: 'none', background: '#000', zIndex: 1,
            }}
          />
        )}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: showIframe ? 0 : 1,
          transition: 'opacity .45s ease-out',
          pointerEvents: showIframe ? 'none' : 'auto',
        }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', maxHeight: '100%' }}>
            <MatchCover m={m}/>
          </div>
        </div>
        {m && !m.live && <NotLiveNotice m={m}/>}
      </div>

      {/* Minimal back button so users can leave the player */}
      <button onClick={() => window.WS_GO && window.WS_GO('detail', m)} style={{
        position: 'absolute', top: 'calc(env(safe-area-inset-top) + 12px)', left: 'calc(env(safe-area-inset-left) + 12px)', zIndex: 10,
        width: 36, height: 36, borderRadius: '50%', border: 'none',
        background: 'rgba(0,0,0,0.55)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }}>
        <svg width="16" height="16" viewBox="0 0 18 18"><path d="M11 3L4 9L11 15" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>
      </button>

      <window.FullscreenClickTrap isFullscreen={isFullscreen} onRequest={requestFullscreen} onExit={exitFullscreen} compact/>
      <window.FullscreenButton isFullscreen={isFullscreen} onRequest={requestFullscreen} onExit={exitFullscreen} visible={controlsVisible} compact invisible/>
      {isFullscreen && (
        <>
          <window.StatsToggle available={statsAvailable && (m && m.live)} open={statsOpen} onToggle={() => setStatsOpen(o => !o)} compact/>
          <window.StatsOverlay stats={stats} open={statsOpen} onClose={() => setStatsOpen(false)} compact/>
        </>
      )}
    </div>
  );
}

function MobileMatchDetail({ match }) {
  const m = match || (typeof MATCHES !== 'undefined' && MATCHES[0]) || {};
  return (
    <MobileShell>
      <div style={{ padding: '4px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => window.WS_GO && window.WS_GO('home')} style={{ ...iconBtn, color: T.text }}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M11 3L4 9L11 15" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>
        </button>
        <span style={{ fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.text }}>Match</span>
      </div>
      <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'relative', aspectRatio: '16/9', width: '100%', background: `oklch(0.18 0.02 ${m.hue || 220})` }}>
            <MatchCover m={m}/>
          </div>
          <button onClick={() => window.WS_GO && window.WS_GO('player', m)} style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 56, height: 56, borderRadius: '50%',
            background: T.live, color: '#0a1208', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M4 2L16 9L4 16V2z" fill="currentColor"/></svg>
          </button>
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <div style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', padding: '4px 8px', borderRadius: 5 }}>
              <LiveDot/>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.textFaint, textTransform: 'uppercase', marginBottom: 6 }}>{m.league || 'MATCH'}</div>
          <h1 style={{ fontFamily: T.font, fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', margin: 0 }}>
            {m.a}{m.b && <span style={{ color: T.textFaint, fontWeight: 300 }}> vs </span>}{m.b}
          </h1>
          <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
            <Stat label="STATUS" value={m.live ? 'LIVE' : (m.clock || '—')}/>
            <Stat label="SOURCES" value={String((m.rawSources && m.rawSources.length) || m.sources || 0)}/>
            <Stat label="SPORT" value={m.sport || '—'}/>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <WatchlistBtn match={m}/>
          </div>

          <div style={{
            marginTop: 18, padding: 12, background: T.bg1,
            border: `1px solid ${T.hairline}`, borderRadius: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontFamily: T.font, fontSize: 13, fontWeight: 600, color: T.text }}>Sources · {(m.rawSources || []).length}</span>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.live, display: 'flex', gap: 4, alignItems: 'center' }}>{Icons.shield} EMBED</span>
            </div>
            {(m.rawSources || []).length === 0 && (
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim, padding: '8px 4px' }}>
                No sources available.
              </div>
            )}
            {(m.rawSources || []).map((s, i) => (
              <div key={s.source + s.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px',
                borderTop: `1px solid ${T.hairline}`,
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: `1.5px solid ${i === 0 ? T.live : T.hairlineStrong}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i === 0 && <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.live }}/>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.font, fontSize: 13, fontWeight: 600, color: T.text, textTransform: 'capitalize' }}>{s.source}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, marginTop: 2 }}>{s.id}</div>
                </div>
              </div>
            ))}
          </div>

          {(m.rawSources || []).length > 0 && (
            <button style={{
              width: '100%', height: 46, marginTop: 16, borderRadius: 10, border: 'none',
              background: T.live, color: '#0a1208', fontFamily: T.font,
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }} onClick={() => window.WS_GO && window.WS_GO('player', m)}>{Icons.play} Watch · {m.rawSources[0].source}</button>
          )}
        </div>
      </div>
    </MobileShell>
  );
}

function MobileHeader({ title, active }) {
  return (
    <div style={{ padding: '4px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: T.font, fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: '-0.01em' }}>{title}</span>
      <button onClick={() => window.WS_GO && window.WS_GO('settings')} style={{ ...iconBtn, color: active === 'settings' ? T.live : T.textDim }}>{Icons.settings}</button>
    </div>
  );
}

function MobileSchedule() {
  const store = window.useWSStore();
  const sportFilter = store.get().sportFilter;
  const [items, setItems] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [selectedDate, setSelectedDate] = React.useState(window.dateKey(new Date()));
  React.useEffect(() => {
    let cancelled = false;
    setItems(null); setError(null);
    window.STREAMED.matches({ filter: 'all' })
      .then(arr => { if (!cancelled) setItems(arr); })
      .catch(e => { if (!cancelled) { setItems([]); setError(e.message || String(e)); } });
    return () => { cancelled = true; };
  }, []);
  const dayItems = (items || []).filter(m => {
    const ts = m && m.raw && typeof m.raw.date === 'number' ? m.raw.date : 0;
    return ts > 0 && window.dateKey(new Date(ts)) === selectedDate;
  });
  const filtered = dayItems
    .filter(m => sportFilter === 'all' || (m.sport || '').toLowerCase() === sportFilter)
    .slice().sort((a, b) => (a.raw && a.raw.date || 0) - (b.raw && b.raw.date || 0));
  const selectedLabel = (() => {
    const [y, m, d] = selectedDate.split('-').map(n => parseInt(n, 10));
    const dt = new Date(y, m - 1, d);
    const isToday = window.dateKey(new Date()) === selectedDate;
    return (isToday ? 'Today · ' : '') + dt.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  })();
  return (
    <MobileShell>
      <MobileHeader title="Schedule"/>
      <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        <div style={{ marginBottom: 14 }}>
          <MatchCalendar matches={items || []} selected={selectedDate} onSelect={setSelectedDate} compact/>
        </div>
        <div style={{ fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>{selectedLabel}</div>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint, marginBottom: 12 }}>
          {dayItems.length} match{dayItems.length === 1 ? '' : 'es'}
        </div>
        {(() => {
          const counts = {};
          dayItems.forEach(mm => { counts[mm.sport] = (counts[mm.sport] || 0) + 1; });
          const visible = SPORTS.filter(s => s.id === 'all' || counts[s.id] > 0);
          return (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
              {visible.map(s => <Pill key={s.id} active={s.id === sportFilter} onClick={() => store.setSport(s.id)}>{s.label}</Pill>)}
            </div>
          );
        })()}
        {items === null && <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, padding: '24px 0' }}>Loading…</div>}
        {items && filtered.length === 0 && (
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, padding: '24px 0' }}>
            No matches on this day.{error ? ' (' + error + ')' : ''}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(m => <MatchCard key={m.id} m={m}/>)}
        </div>
      </div>
      <MobileTabBar active="sched"/>
    </MobileShell>
  );
}

function MobileSearch() {
  const store = window.useWSStore();
  const q = store.get().search || '';
  const ql = q.trim().toLowerCase();
  const results = ql ? MATCHES.filter(m =>
    (m.a || '').toLowerCase().includes(ql) ||
    (m.b || '').toLowerCase().includes(ql) ||
    (m.league || '').toLowerCase().includes(ql) ||
    (m.sport || '').toLowerCase().includes(ql)
  ) : [];
  return (
    <MobileShell>
      <MobileHeader title="Search"/>
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{
          height: 42, background: T.bg2, border: `1px solid ${T.hairline}`,
          borderRadius: 10, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: T.textDim }}>{Icons.search}</span>
          <input
            autoFocus
            value={q}
            onChange={e => store.setSearch(e.target.value)}
            placeholder="Search teams, leagues…"
            style={{
              flex: 1, height: '100%', border: 'none', outline: 'none', background: 'transparent',
              color: T.text, fontFamily: T.font, fontSize: 14,
            }}
          />
          {q && <span onClick={() => store.setSearch('')} style={{ color: T.textDim, cursor: 'pointer', fontFamily: T.mono, fontSize: 11 }}>CLEAR</span>}
        </div>
      </div>
      <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {!ql && <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, padding: '24px 0' }}>Type to search across live and upcoming matches.</div>}
        {ql && results.length === 0 && <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, padding: '24px 0' }}>No matches for "{q}".</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {results.map(m => <MatchCard key={m.id} m={m}/>)}
        </div>
      </div>
      <MobileTabBar active="search"/>
    </MobileShell>
  );
}

function MobileWatchlist() {
  const store = window.useWSStore();
  const ids = store.get().watchlist || [];
  const watched = MATCHES.filter(m => ids.includes(m.id));
  return (
    <MobileShell>
      <MobileHeader title="Watchlist"/>
      <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        <SectionHeader title="Saved" sub={`${watched.length}`}/>
        {watched.length === 0 && (
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, padding: '12px 0 20px' }}>
            No saved matches yet. Tap the star on any match to save it.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {watched.map(m => <MatchCard key={m.id} m={m}/>)}
        </div>
      </div>
      <MobileTabBar active="watch"/>
    </MobileShell>
  );
}

function MobileRecent() {
  const store = window.useWSStore();
  const recent = store.get().recently || [];
  return (
    <MobileShell>
      <MobileHeader title="Recently watched"/>
      <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        <SectionHeader title="History" sub={`${recent.length}`}/>
        {recent.length === 0 && (
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, padding: '12px 0 20px' }}>
            Nothing watched yet. Streams you open will show up here.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recent.map(r => {
            const ago = (() => {
              const ms = Date.now() - (r.ts || 0);
              const m = Math.round(ms / 60000);
              if (m < 1) return 'just now';
              if (m < 60) return m + 'm ago';
              const h = Math.round(m / 60);
              if (h < 24) return h + 'h ago';
              return Math.round(h / 24) + 'd ago';
            })();
            return (
              <div key={r.id + ':' + r.ts} onClick={() => {
                const m = MATCHES.find(x => x.id === r.id) || r;
                window.WS_GO && window.WS_GO('detail', m);
              }} style={{
                padding: 12, background: T.bg1, border: `1px solid ${T.hairline}`,
                borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.12em', color: T.textFaint, textTransform: 'uppercase' }}>{r.league}</div>
                  <div style={{ fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.text, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.a}{r.b && ' vs ' + r.b}</div>
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, flexShrink: 0 }}>{ago}</div>
              </div>
            );
          })}
        </div>
      </div>
      <MobileTabBar active="recent"/>
    </MobileShell>
  );
}

const QUALITY_OPTS = ['Auto', '1080p60', '1080p', '720p', '480p'];
const REGION_OPTS = ['Auto', 'US-East', 'US-West', 'EU-West', 'EU-Central', 'Asia'];
const LEAD_OPTS = [5, 10, 15, 30, 60];

function cycle(arr, current) {
  const i = arr.indexOf(current);
  return arr[(i < 0 ? 0 : i + 1) % arr.length];
}

function MobileSettings() {
  const store = window.useWSStore();
  const s = store.get().settings;
  const Row = ({ label, value, onClick, toggle, on }) => (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 14px', background: T.bg1, border: `1px solid ${T.hairline}`,
      borderRadius: 10, marginBottom: 8, cursor: onClick ? 'pointer' : 'default',
      userSelect: 'none', WebkitTapHighlightColor: 'transparent',
    }}>
      <span style={{ fontFamily: T.font, fontSize: 14, color: T.text }}>{label}</span>
      {toggle ? (
        <div style={{
          width: 38, height: 22, borderRadius: 999,
          background: on ? T.live : T.hairlineStrong, position: 'relative',
          transition: 'background .15s ease',
        }}>
          <div style={{
            position: 'absolute', top: 2, left: on ? 18 : 2,
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            transition: 'left .15s ease',
          }}/>
        </div>
      ) : (
        <span style={{ fontFamily: T.mono, fontSize: 12, color: onClick ? T.live : T.textDim }}>{value}</span>
      )}
    </div>
  );
  return (
    <MobileShell>
      <div style={{ padding: '4px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => window.WS_GO && window.WS_GO('home')} style={{ ...iconBtn, color: T.text }}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M11 3L4 9L11 15" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>
        </button>
        <span style={{ fontFamily: T.font, fontSize: 18, fontWeight: 700, color: T.text }}>Settings</span>
      </div>
      <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        <SectionHeader title="Playback"/>
        <Row label="Default quality" value={s.defaultQuality} onClick={() => store.setSetting('defaultQuality', cycle(QUALITY_OPTS, s.defaultQuality))}/>
        <Row label="Region" value={s.region} onClick={() => store.setSetting('region', cycle(REGION_OPTS, s.region))}/>
        <Row label="Auto-switch source" toggle on={s.autoSwitch} onClick={() => store.setSetting('autoSwitch', !s.autoSwitch)}/>
        <Row label="Picture-in-picture" toggle on={s.pipDefault} onClick={() => store.setSetting('pipDefault', !s.pipDefault)}/>
        <div style={{ height: 14 }}/>
        <SectionHeader title="Privacy"/>
        <Row label="Ad shield" toggle on={s.adShield} onClick={() => store.setSetting('adShield', !s.adShield)}/>
        <Row label="Source verify" toggle on={s.sourceVerify} onClick={() => store.setSetting('sourceVerify', !s.sourceVerify)}/>
        <div style={{ height: 14 }}/>
        <SectionHeader title="Notifications"/>
        <Row label="Match start alerts" toggle on={s.notifyEnabled} onClick={() => store.setSetting('notifyEnabled', !s.notifyEnabled)}/>
        <Row label="Lead time" value={`${s.notifyLeadMinutes} min`} onClick={() => store.setSetting('notifyLeadMinutes', cycle(LEAD_OPTS, s.notifyLeadMinutes))}/>
      </div>
      <MobileTabBar/>
    </MobileShell>
  );
}

Object.assign(window, { MobileShell, MobileTabBar, MobileHome, MobilePlayer, MobileMatchDetail, MobileSchedule, MobileSearch, MobileWatchlist, MobileRecent, MobileSettings });
