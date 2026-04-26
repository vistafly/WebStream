// Mobile screens

function MobileShell({ children, statusDark = true }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: T.bg0,
      display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
    }}>
      <IOSStatusBar dark={!statusDark} time="9:41"/>
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
  ];
  return (
    <div style={{
      borderTop: `1px solid ${T.hairline}`, padding: '6px 0 18px',
      background: T.bg0, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
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
  const hero = live[0] || filtered[0];
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

        {hero && (
          <div onClick={() => hero.id && window.WS_GO && window.WS_GO('player', hero)} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 16, background: `oklch(0.18 0.02 ${hero.hue || 200})`, cursor: 'pointer' }}>
            <div style={{ aspectRatio: '16/9', position: 'relative' }}>
              <MatchCover m={hero}/>
            </div>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent 55%)' }}/>
            {hero.live && <div style={{ position: 'absolute', top: 10, left: 10 }}>
              <div style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', padding: '4px 8px', borderRadius: 5 }}>
                <LiveDot/>
              </div>
            </div>}
            <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em' }}>{hero.league}</div>
              <div style={{ fontFamily: T.font, fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginTop: 4 }}>{hero.a}{hero.b && ' vs ' + hero.b}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontFamily: T.mono, fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
                <span>{hero.clock}</span>
                <span>· {(hero.rawSources || []).length} source{(hero.rawSources || []).length === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>
        )}

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
          {live.slice(0, 8).map(m => <MatchCard key={m.id} m={m}/>)}
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
  return (
    <div style={{ width: '100%', height: '100%', background: '#000', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        {activeStream && activeStream.embedUrl && (
          <iframe
            src={activeStream.embedUrl}
            onLoad={() => setIframeLoaded(true)}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              border: 'none', background: '#000', zIndex: 1,
            }}
          />
        )}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          opacity: showIframe ? 0 : 1,
          transition: 'opacity .45s ease-out',
          pointerEvents: showIframe ? 'none' : 'auto',
        }}>
          <MatchCover m={m}/>
        </div>
        {!streamsLoading && !activeStream && (
          <div style={{
            position: 'absolute', bottom: 50, right: 12, zIndex: 3,
            padding: '8px 14px', background: 'rgba(0,0,0,0.75)', borderRadius: 6,
            color: '#fff', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.06em',
          }}>
            No streams available
          </div>
        )}
      </div>

      {/* Minimal back button so users can leave the player */}
      <button onClick={() => window.WS_GO && window.WS_GO('detail', m)} style={{
        position: 'absolute', top: 50, left: 12, zIndex: 10,
        width: 36, height: 36, borderRadius: '50%', border: 'none',
        background: 'rgba(0,0,0,0.55)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }}>
        <svg width="16" height="16" viewBox="0 0 18 18"><path d="M11 3L4 9L11 15" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>
      </button>
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

Object.assign(window, { MobileShell, MobileTabBar, MobileHome, MobilePlayer, MobileMatchDetail });
