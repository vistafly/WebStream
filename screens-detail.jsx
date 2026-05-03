// Match detail + active player

// Centered notice rendered over the cover when a match is not live OR live
// but has no streams. Includes Back-to-home, watchlist toggle, and a
// Notify-me action that requests permission and schedules a reminder.
function NotLiveNotice({ m }) {
  const store = window.useWSStore();
  const isScheduled = !m || !m.live;
  const ts = m && m.raw && typeof m.raw.date === 'number' ? m.raw.date : 0;
  let scheduledLabel = m && m.clock;
  if (ts > 0) {
    const d = new Date(ts);
    const sameDay = new Date().toDateString() === d.toDateString();
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    scheduledLabel = sameDay
      ? `today at ${time}`
      : `${d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} at ${time}`;
  }
  const watched = m && m.id ? store.isWatched(m.id) : false;
  const notifyOn = m && m.id ? store.isNotifyScheduled(m.id) : false;
  const canSchedule = isScheduled && ts > 0 && ts > Date.now();
  const lead = (store.get().settings || {}).notifyLeadMinutes || 0;
  const [permState, setPermState] = React.useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const [tooLate, setTooLate] = React.useState(null); // { minutesUntilStart, leadMinutes, options }
  async function handleNotify() {
    if (!canSchedule) return;
    if (notifyOn) { store.removeNotification(m.id); return; }
    let perm = permState;
    if (perm !== 'granted' && window.WSNotify) {
      perm = await window.WSNotify.ensurePermission();
      setPermState(perm);
    }
    if (perm !== 'granted') return;
    if (!store.get().settings.notifyEnabled) store.setSetting('notifyEnabled', true);
    const res = store.addNotification(m, lead);
    if (res && res.ok === false && res.reason === 'too-late') {
      setTooLate({
        minutesUntilStart: res.minutesUntilStart,
        leadMinutes: res.leadMinutes,
        options: window.pickValidLeads(res.minutesUntilStart, 4),
      });
    } else if (res && res.ok) {
      setTooLate(null);
    }
  }
  function applyOption(min) {
    // Per-match override only — leave the user's default lead in Settings alone.
    const r = store.addNotification(m, min);
    if (r && r.ok) setTooLate(null);
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 3,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, pointerEvents: 'none',
    }}>
      <div style={{
        maxWidth: 480, padding: '18px 22px',
        background: 'rgba(10,11,13,0.85)', backdropFilter: 'blur(12px)',
        border: `1px solid ${T.hairlineStrong}`, borderRadius: 12,
        color: T.text, fontFamily: T.font, fontSize: 13, textAlign: 'center',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        pointerEvents: 'auto',
      }}>
        <div style={{
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.16em',
          color: isScheduled ? T.warn : T.textDim, marginBottom: 8,
        }}>{isScheduled ? 'NOT LIVE YET' : 'NO STREAMS AVAILABLE'}</div>
        {isScheduled ? (
          <>
            <div>This game starts <strong style={{ color: T.text }}>{scheduledLabel || 'soon'}</strong>.</div>
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>
              Check back at the scheduled start time to watch.
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: T.textDim }}>No active streams found for this match right now.</div>
        )}

        <div style={{
          display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
          marginTop: 16,
        }}>
          <button onClick={() => window.WS_GO && window.WS_GO('home')}
            style={pillBtn(false)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{Icons.home} Back to home</span>
          </button>
          {m && m.id && (
            <button onClick={() => store.toggleWatch(m.id)}
              style={pillBtn(watched)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {watched ? Icons.starFill : Icons.star}
                {watched ? 'Starred' : 'Star'}
              </span>
            </button>
          )}
          {m && m.id && (
            <button onClick={handleNotify}
              disabled={!canSchedule || permState === 'denied'}
              title={
                permState === 'denied' ? 'Notifications blocked in browser settings'
                : !canSchedule ? 'No scheduled start time available'
                : ''
              }
              style={{
                ...pillBtn(notifyOn),
                opacity: (!canSchedule || permState === 'denied') ? 0.5 : 1,
                cursor: (!canSchedule || permState === 'denied') ? 'not-allowed' : 'pointer',
              }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {Icons.bell}
                {notifyOn
                  ? `Reminder set${lead > 0 ? ` · ${lead}m before` : ''}`
                  : (permState === 'denied' ? 'Notifications blocked' : 'Notify me')}
              </span>
            </button>
          )}
        </div>
        {tooLate && (
          <div style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 8,
            background: 'rgba(255, 180, 100, 0.08)',
            border: `1px solid ${T.warn}`,
            fontFamily: T.font, fontSize: 12, color: T.warn,
            textAlign: 'left',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div>
              Game starts in <strong>{tooLate.minutesUntilStart} min</strong> — sooner than your <strong>{tooLate.leadMinutes}-minute</strong> reminder window.
              {tooLate.options.length > 0 && ' Pick a shorter window for this match:'}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tooLate.options.length === 0 && (
                <span style={{ color: T.textDim, fontSize: 11 }}>Too close to start for any reminder window.</span>
              )}
              {tooLate.options.map(min => (
                <button key={min} onClick={() => applyOption(min)} style={{
                  height: 28, padding: '0 12px', borderRadius: 6,
                  border: `1px solid ${T.warn}`, background: 'rgba(255,180,100,0.15)',
                  color: T.warn, fontFamily: T.font, fontWeight: 600, fontSize: 12,
                  cursor: 'pointer',
                }}>{window.leadLabel(min)}</button>
              ))}
              <button onClick={() => setTooLate(null)} style={{
                height: 28, padding: '0 10px', borderRadius: 6,
                border: `1px solid ${T.hairlineStrong}`, background: 'transparent',
                color: T.textDim, fontFamily: T.font, fontSize: 12, cursor: 'pointer',
              }}>Dismiss</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function pillBtn(active) {
  return {
    height: 32, padding: '0 14px', borderRadius: 6,
    border: `1px solid ${active ? T.live : T.hairlineStrong}`,
    background: active ? T.liveDim : 'transparent',
    color: active ? T.live : T.text,
    fontFamily: T.font, fontSize: 12, fontWeight: 500,
    cursor: 'pointer', whiteSpace: 'nowrap',
    display: 'inline-flex', alignItems: 'center',
  };
}

function MatchDetail({ match }) {
  const m = match || MATCHES[0];
  const realSources = (m && m.rawSources) || [];
  const hasReal = realSources.length > 0;
  const [server, setServer] = React.useState(hasReal ? realSources[0].source : 'alpha');
  const [quality, setQuality] = React.useState('1080p60');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg0 }}>
      <TopNav/>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <SideNav/>
        <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>
          {/* Breadcrumb */}
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16,
            fontFamily: T.mono, fontSize: 11, color: T.textDim,
          }}>
            <span>Live Now</span>
            <span style={{ color: T.textFaint }}>›</span>
            <span>Soccer</span>
            <span style={{ color: T.textFaint }}>›</span>
            <span>UEFA Champions League</span>
            <span style={{ color: T.textFaint }}>›</span>
            <span style={{ color: T.text }}>Arsenal vs Real Madrid</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
            <div>
              {/* Hero / poster */}
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ position: 'relative', aspectRatio: '16/9', width: '100%', background: `oklch(0.18 0.02 ${m.hue || 220})` }}>
                  <MatchCover m={m}/>
                </div>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%)',
                }}/>
                <div style={{ position: 'absolute', top: 16, left: 16 }}>
                  <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', padding: '6px 10px', borderRadius: 6 }}>
                    <LiveDot/>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div style={{ marginTop: 20 }}>
                <div style={{
                  fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
                  color: T.textFaint, textTransform: 'uppercase', marginBottom: 8,
                }}>{m.league || 'MATCH'}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h1 style={{
                    fontFamily: T.font, fontSize: 36, fontWeight: 700,
                    color: T.text, letterSpacing: '-0.025em', margin: 0,
                  }}>{m.a}{m.b && <span style={{ color: T.textFaint, fontWeight: 300 }}> vs </span>}{m.b}</h1>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <WatchlistBtn match={m}/>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 32, marginTop: 18 }}>
                  <Stat label="STATUS" value={m.live ? 'LIVE' : (m.clock || '—')}/>
                  <Stat label="SOURCES" value={String((m.rawSources && m.rawSources.length) || m.sources || 0)}/>
                  <Stat label="SPORT" value={m.sport || '—'}/>
                </div>
              </div>

              {/* Server + quality selectors */}
              <div style={{
                marginTop: 24, padding: 16, background: T.bg1,
                border: `1px solid ${T.hairline}`, borderRadius: 12,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
                }}>
                  <div>
                    <div style={{ fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.text }}>
                      Pick a stream source
                    </div>
                    <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint, marginTop: 2 }}>
                      {hasReal ? `${realSources.length} mirror${realSources.length === 1 ? '' : 's'} · streamed.pk` : '7 mirrors verified · ad-shielded · last checked 8s ago'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.live, fontSize: 11, fontFamily: T.mono }}>
                    {Icons.shield} ALL CLEAN
                  </div>
                </div>

                {/* Server table */}
                <div style={{ borderTop: `1px solid ${T.hairline}` }}>
                  {(hasReal
                    ? realSources.map((rs, i) => ({
                        id: rs.source, name: rs.source.charAt(0).toUpperCase() + rs.source.slice(1),
                        region: rs.id, latency: 50 + i * 30,
                        quality: ['HD', 'SD'], rec: i === 0,
                      }))
                    : SERVERS
                  ).map(s => {
                    const active = s.id === server;
                    return (
                      <div key={s.id} onClick={() => setServer(s.id)} style={{
                        display: 'grid', gridTemplateColumns: '24px 90px 100px 1fr 120px 90px',
                        gap: 12, alignItems: 'center', padding: '12px 10px',
                        borderBottom: `1px solid ${T.hairline}`, cursor: 'pointer',
                        background: active ? T.bg2 : 'transparent',
                        transition: 'background .12s',
                      }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%',
                          border: `1.5px solid ${active ? T.live : T.hairlineStrong}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.live }}/>}
                        </div>
                        <div style={{ fontFamily: T.font, fontSize: 13, fontWeight: 600, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {s.name}
                          {s.rec && <span style={{
                            fontFamily: T.mono, fontSize: 9, color: T.live,
                            border: `1px solid ${T.live}`, padding: '1px 4px', borderRadius: 3,
                          }}>BEST</span>}
                        </div>
                        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim }}>{s.region}</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {s.quality.map(q => (
                            <span key={q} style={{
                              fontFamily: T.mono, fontSize: 9, padding: '2px 6px',
                              border: `1px solid ${T.hairline}`, borderRadius: 3,
                              color: T.textDim,
                            }}>{q}</span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <SignalBars level={s.latency < 60 ? 4 : s.latency < 100 ? 3 : s.latency < 150 ? 2 : 1}/>
                          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim }}>{s.latency}ms</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {active && <span style={{ fontFamily: T.mono, fontSize: 10, color: T.live }}>● ACTIVE</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quality dropdown row */}
                <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
                  <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint, letterSpacing: '0.12em' }}>QUALITY</span>
                  {(hasReal ? ['HD', 'SD'] : (SERVERS.find(s => s.id === server) || SERVERS[0]).quality).map(q => (
                    <Pill key={q} active={q === quality} onClick={() => setQuality(q)}>{q}</Pill>
                  ))}
                  <div style={{ flex: 1 }}/>
                  <button onClick={() => window.WS_GO && window.WS_GO('player', m)} style={{
                    height: 36, padding: '0 18px', borderRadius: 8, border: 'none',
                    background: T.live, color: '#0a1208', fontFamily: T.font,
                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>{Icons.play} Start Watching</button>
                </div>
              </div>
            </div>

            {/* Sidebar — related */}
            <div>
              <SectionHeader title="Up Next"/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MATCHES.slice(1, 6).map(m => (
                  <div key={m.id} style={{
                    display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10,
                    cursor: 'pointer',
                  }}>
                    <Placeholder label={m.a.slice(0, 3).toUpperCase()} hue={m.hue} ratio="16/9" style={{ borderRadius: 6 }}/>
                    <div>
                      <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.1em', color: T.textFaint, textTransform: 'uppercase', marginBottom: 3 }}>{m.league}</div>
                      <div style={{ fontFamily: T.font, fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.3 }}>
                        {m.a}{m.b && ' vs ' + m.b}
                      </div>
                      <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center', fontFamily: T.mono, fontSize: 10, color: T.textDim }}>
                        {m.live ? <LiveDot size={5} label="LIVE"/> : <span>{m.clock}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textFaint, letterSpacing: '0.14em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: T.mono, fontSize: 18, color: T.text, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function SignalBars({ level = 3 }) {
  return (
    <div style={{ display: 'inline-flex', gap: 2, alignItems: 'flex-end' }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{
          width: 3, height: 3 + i * 2,
          background: i <= level ? T.live : T.hairlineStrong,
          borderRadius: 1,
        }}/>
      ))}
    </div>
  );
}

const ghostBtn = {
  height: 36, padding: '0 14px', borderRadius: 8,
  border: `1px solid ${T.hairlineStrong}`, background: 'transparent',
  color: T.text, fontFamily: T.font, fontSize: 13, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 8,
};

// Active player — minimal chrome
function PlayerMinimal() {
  const [hovering, setHovering] = React.useState(true);
  return (
    <div style={{ height: '100%', background: '#000', position: 'relative', overflow: 'hidden' }}
         onMouseEnter={() => setHovering(true)}>
      {/* "Video" */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Placeholder label="LIVE STREAM · ARSENAL VS REAL MADRID" sub="63' · 1—1" hue={220} style={{ height: '100%', borderRadius: 0 }}/>
      </div>

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
        opacity: hovering ? 1 : 0, transition: 'opacity .25s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button style={{ ...iconBtn, color: T.text }}>
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 2L4 8L10 14" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>
          </button>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.14em' }}>UCL · QF</div>
            <div style={{ fontFamily: T.font, fontSize: 14, fontWeight: 600, color: '#fff' }}>Arsenal vs Real Madrid</div>
          </div>
        </div>
        <div style={{
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          padding: '6px 10px', borderRadius: 6, display: 'flex', gap: 8, alignItems: 'center',
          color: T.live, fontFamily: T.mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
        }}>{Icons.shield} AD‑SHIELDED · ALPHA · 1080p60</div>
      </div>

      {/* Bottom controls */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '40px 28px 20px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
        opacity: hovering ? 1 : 0, transition: 'opacity .25s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button style={{
            width: 44, height: 44, borderRadius: '50%', border: 'none',
            background: '#fff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><rect x="3" y="2" width="3" height="10" fill="currentColor"/><rect x="8" y="2" width="3" height="10" fill="currentColor"/></svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff' }}>
            <LiveDot/>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>BROADCAST · NO SEEK</span>
          </div>
          <div style={{ flex: 1 }}/>
          <button style={{ ...iconBtn, color: '#fff' }}>{Icons.vol}</button>
          <button style={{ ...iconBtn, color: '#fff' }}>{Icons.pip}</button>
          <button style={{ ...iconBtn, color: '#fff' }}>{Icons.settings}</button>
          <button style={{ ...iconBtn, color: '#fff' }}>{Icons.expand}</button>
        </div>
      </div>
    </div>
  );
}

// Active player — full chrome, with tabbed right rail (Sources / Events)
function PlayerFull({ match, streams, streamsLoading }) {
  const m = match || MATCHES[0] || {};
  const store = window.useWSStore();
  const realStreams = Array.isArray(streams) ? streams : [];
  const hasReal = realStreams.length > 0;
  const streamKey = (s) => s.source + '#' + (s.streamNo != null ? s.streamNo : 0);
  const initialServer = hasReal ? streamKey(realStreams[0]) : 'alpha';
  const [server, setServer] = React.useState(initialServer);
  const [streamIdx, setStreamIdx] = React.useState(0);
  const [tab, setTab] = React.useState('stats'); // 'stats' | 'events'
  const [showStatsOverlay, setShowStatsOverlay] = React.useState(false);
  const [iframeKey, setIframeKey] = React.useState(0);
  const [iframeLoaded, setIframeLoaded] = React.useState(false);
  const [autoSwitched, setAutoSwitched] = React.useState(0);
  // Streams whose iframe failed to load within the failover window. Cleared
  // when a stream loads successfully on retry; surfaced in the SourcesPanel
  // so users see which mirrors are currently broken.
  const [failedStreams, setFailedStreams] = React.useState(() => new Set());
  // When the active selection was made — used to decide whether a switch
  // away from this source counts as an implicit "didn't work" signal.
  const selectionTsRef = React.useRef(Date.now());
  // Per-stream "we got onLoad and reset the failure-mark to clean" guard.
  // Without this, the post-load watchdog re-arms on every render and can
  // mark a stream that's actually playing.
  const watchdogArmedRef = React.useRef(null);
  // Mirror of iframeLoaded for use inside setTimeout closures whose effect
  // doesn't re-run when iframeLoaded toggles.
  const iframeLoadedRef = React.useRef(false);
  React.useEffect(() => { iframeLoadedRef.current = iframeLoaded; }, [iframeLoaded]);
  const iframeRef = React.useRef(null);
  // Cover fade logic:
  //   - Hold the cover at least 1s after entering the player (deliberate reveal).
  //   - Fade once the iframe has loaded, OR after a 4s safety timeout — some
  //     embed pages never fire window.load due to long-poll subresources, and
  //     we don't want the cover stuck forever.
  const [holdReleased, setHoldReleased] = React.useState(false);
  const [fallbackElapsed, setFallbackElapsed] = React.useState(false);
  const mountTsRef = React.useRef(0);
  React.useEffect(() => {
    setHoldReleased(false);
    setFallbackElapsed(false);
    mountTsRef.current = Date.now();
    const tHold = setTimeout(() => setHoldReleased(true), 1000);
    const tFallback = setTimeout(() => setFallbackElapsed(true), 4000);
    return () => { clearTimeout(tHold); clearTimeout(tFallback); };
  }, [m.id]);
  const showIframe = (iframeLoaded || fallbackElapsed) && holdReleased;
  React.useEffect(() => {
    setStreamIdx(0); setServer(initialServer); setAutoSwitched(0);
    setFailedStreams(new Set());
    selectionTsRef.current = Date.now();
    watchdogArmedRef.current = null;
  }, [m.id, hasReal]);

  // Switching sources is a neutral user action — never infer failure from
  // it. Failure is only ever inferred from the two watchdogs:
  //   - pre-load (iframe never fires onLoad in 8s)
  //   - post-load engagement (no user interaction in 25s after onLoad)
  const selectStream = React.useCallback((nextKey) => {
    selectionTsRef.current = Date.now();
    setServer(nextKey);
  }, []);

  // When the active iframe loads successfully, drop it from the failed set
  // (it might have been marked failed earlier and the user retried it).
  React.useEffect(() => {
    if (!iframeLoaded || !server) return;
    setFailedStreams(prev => {
      if (!prev.has(server)) return prev;
      const next = new Set(prev);
      next.delete(server);
      return next;
    });
  }, [iframeLoaded, server]);

  // Push to "recently watched" once per match.
  React.useEffect(() => { if (m && m.id) store.pushRecent(m); }, [m && m.id]);

  const activeStream = hasReal
    ? (realStreams.find(s => streamKey(s) === server) || realStreams[streamIdx] || realStreams[0])
    : null;
  const serverList = hasReal
    ? Array.from(new Set(realStreams.map(s => s.source))).slice(0, 6)
        .map(src => ({ id: src, name: src.charAt(0).toUpperCase() + src.slice(1) }))
    : [];

  // Two-stage failure detection:
  //   Stage 1 (8s): iframe never fires onLoad. The embed page itself is
  //                 unreachable — clearly broken. Mark + advance.
  //   Stage 2 (20s after onLoad): iframe loaded but we have no way to
  //                 know if HLS playback inside is actually working
  //                 (cross-origin). Re-arm a watchdog; if the user
  //                 switches away within selectStream's 35s window the
  //                 source is marked. We can't auto-detect "Could not
  //                 play video" because the iframe is opaque, but the
  //                 selectStream heuristic catches it the moment they
  //                 manually try a different mirror.
  React.useEffect(() => {
    if (!activeStream) return;
    setIframeLoaded(false);
    const failingKey = server;
    watchdogArmedRef.current = failingKey;
    const t = setTimeout(() => {
      if (iframeLoadedRef.current) return;
      setFailedStreams(prev => {
        if (prev.has(failingKey)) return prev;
        const next = new Set(prev);
        next.add(failingKey);
        return next;
      });
      if (!store.get().settings.autoSwitch) return;
      const keys = realStreams.map(streamKey);
      const idx = keys.indexOf(failingKey);
      if (idx >= 0 && idx < keys.length - 1 && autoSwitched < keys.length) {
        const next = realStreams[idx + 1];
        const nextLabel = next ? (next.source.charAt(0).toUpperCase() + next.source.slice(1)) + (next.streamNo != null ? ' · #' + next.streamNo : '') : 'next mirror';
        selectStream(keys[idx + 1]);
        setAutoSwitched(autoSwitched + 1);
        if (window.WSToast) window.WSToast(`Source didn't load — switched to ${nextLabel}`);
      }
    }, 8000);
    return () => clearTimeout(t);
  }, [activeStream && activeStream.embedUrl]);

  // No Stage-2 post-load watchdog. Cross-origin iframes give us no reliable
  // way to distinguish a silent viewer from a broken-but-loaded stream —
  // any non-engagement heuristic produces false positives on real users.
  // ISSUE flagging is now driven exclusively by the pre-load watchdog
  // (iframe never fires onLoad in N seconds = definitively broken).

  // postMessage probe — listens for any messages from the streamed.pk iframe.
  // Cross-origin iframes can voluntarily emit postMessages to their parent,
  // and some embed players announce playback state, errors, or HLS events
  // this way. We log everything received to learn whether streamed.pk
  // sends anything useful, and if so, react to clear failure signals.
  React.useEffect(() => {
    if (!activeStream) return;
    const failingKey = server;
    const onMsg = (e) => {
      // Ignore noise from React DevTools, browser extensions, our own code.
      const d = e && e.data;
      if (!d) return;
      const isReactInternal = typeof d === 'object' && (d.source === 'react-devtools-content-script' || d.source === 'react-devtools-bridge');
      if (isReactInternal) return;
      // Best-effort filter to messages originating from the streamed.pk
      // iframe — embedme.top is their CDN host. Also accept anything from
      // an opaque `null` origin since some embeds use srcdoc.
      const origin = e.origin || '';
      const fromEmbed = origin.includes('streamed') || origin.includes('embedme') || origin === 'null' || origin === '';
      if (!fromEmbed) return;
      try {
        // eslint-disable-next-line no-console
        console.log('[WS player postMessage]', { origin, data: d });
      } catch (err) {}
      // Heuristic: if the payload mentions 'error' or 'fail', mark failed.
      const text = typeof d === 'string' ? d.toLowerCase()
        : (typeof d === 'object' && d != null) ? JSON.stringify(d).toLowerCase()
        : '';
      if (text && /\b(error|failed|cannot|unavailable|hlsnetworkerror|manifestloaderror)\b/.test(text)) {
        setFailedStreams(prev => {
          if (prev.has(failingKey)) return prev;
          const n = new Set(prev); n.add(failingKey); return n;
        });
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [activeStream && activeStream.embedUrl, server]);

  // Tab-toggleable stats overlay (only visible while the player is fullscreened).
  const { stats, available: statsAvailable } = window.useMatchStats(m);
  const [statsOpen, setStatsOpen] = React.useState(false);
  const playerRef = React.useRef(null);
  const { isFullscreen, request: requestFullscreen, exit: exitFullscreen } = window.useFullscreen(playerRef);
  const controlsVisible = window.usePlayerActivity(playerRef, 3000);
  return (
    <div style={{ height: '100%', background: T.bg0, display: 'flex', flexDirection: 'column' }}>
      <TopNav/>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', minHeight: 0 }}>
        {/* Left: player */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, padding: '16px 16px 16px 24px' }}>
          <div ref={playerRef} style={{
            position: 'relative', borderRadius: isFullscreen ? 0 : 10, overflow: 'hidden',
            background: '#000',
            aspectRatio: isFullscreen ? 'auto' : '16/9',
            width: isFullscreen ? '100%' : 'min(100%, calc((100vh - 200px) * 16 / 9))',
            height: isFullscreen ? '100%' : 'auto',
            alignSelf: 'center',
          }}>
            {/* Iframe stays mounted underneath. The cover sits on top and fades
                out once the iframe is ready, revealing the live player.
                For non-live / no-stream matches, the cover stays visible
                permanently so the player area never goes blank. */}
            {activeStream && activeStream.embedUrl && (
              <iframe
                ref={iframeRef}
                key={activeStream.embedUrl + ':' + iframeKey}
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
            {(() => {
              const isLive = !!(m && m.live);
              const hasStream = !!(activeStream && activeStream.embedUrl);
              // Only allow the cover to fade once a real live stream's iframe
              // is up. Non-live matches keep the cover visible permanently —
              // no matter what the iframe does (some non-live sources return
              // dead pages that fire onLoad and would otherwise trigger the
              // fade).
              const coverHidden = isLive && hasStream && showIframe;
              return (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 2,
                  opacity: coverHidden ? 0 : 1,
                  transition: 'opacity .45s ease-out',
                  pointerEvents: coverHidden ? 'none' : 'auto',
                }}>
                  <MatchCover m={m}/>
                </div>
              );
            })()}
            {m && !m.live && <NotLiveNotice m={m}/>}

            <window.FullscreenClickTrap isFullscreen={isFullscreen} onRequest={requestFullscreen} onExit={exitFullscreen}/>
            <window.FullscreenButton isFullscreen={isFullscreen} onRequest={requestFullscreen} onExit={exitFullscreen} visible={controlsVisible} invisible/>
            {(() => {
              const keys = realStreams.map(streamKey);
              const idx = keys.indexOf(server);
              const hasNext = idx >= 0 && idx < keys.length - 1;
              if (!hasNext) return null;
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextKey = keys[idx + 1];
                    const next = realStreams[idx + 1];
                    const nextLabel = next ? (next.source.charAt(0).toUpperCase() + next.source.slice(1)) + (next.streamNo != null ? ' · #' + next.streamNo : '') : 'next mirror';
                    setFailedStreams(prev => {
                      if (prev.has(server)) return prev;
                      const n = new Set(prev); n.add(server); return n;
                    });
                    selectStream(nextKey);
                    if (window.WSToast) window.WSToast(`Switched to ${nextLabel}`);
                  }}
                  title="Stream not working? Switch to next mirror"
                  style={{
                    position: 'absolute', top: 16, left: 16, zIndex: 11,
                    height: 30, padding: '0 12px', borderRadius: 999,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                    color: '#fff', border: '1px solid rgba(255,255,255,0.18)',
                    fontFamily: T.font, fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.04em', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    opacity: controlsVisible ? 1 : 0,
                    transition: 'opacity .25s ease',
                    pointerEvents: controlsVisible ? 'auto' : 'none',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2 5.5a3.5 3.5 0 0 1 6-2.5M9 5.5a3.5 3.5 0 0 1-6 2.5M8 1v2.5H5.5M3 10V7.5H5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Next mirror
                </button>
              );
            })()}
            {isFullscreen && (
              <>
                <window.StatsToggle available={statsAvailable && (m && m.live)} open={statsOpen} onToggle={() => setStatsOpen(o => !o)}/>
                <window.StatsOverlay stats={stats} open={statsOpen} onClose={() => setStatsOpen(false)}/>
              </>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint, letterSpacing: '0.14em', marginBottom: 8 }}>NOW WATCHING</div>
            <div style={{ fontFamily: T.font, fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: '-0.02em' }}>{m.a}{m.b && <span style={{ color: T.textFaint, fontWeight: 400 }}> vs </span>}{m.b}</div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim, marginTop: 4 }}>{m.league || ''} {activeStream && activeStream.hd ? '· HD' : ''} {activeStream && activeStream.language ? '· ' + activeStream.language : ''}</div>
          </div>
        </div>

        {/* Right rail: tabbed */}
        <div style={{ borderLeft: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Tab strip */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.hairline}`, padding: '0 8px' }}>
            {[
              { id: 'stats', label: 'Stats' },
              { id: 'events', label: 'Events' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, height: 44, border: 'none', background: 'transparent',
                color: tab === t.id ? T.text : T.textDim,
                fontFamily: T.font, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                position: 'relative', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {t.label}
                {t.count != null && <span style={{
                  fontFamily: T.mono, fontSize: 9, color: T.textFaint,
                  padding: '1px 5px', borderRadius: 3,
                  background: tab === t.id ? T.bg3 : T.bg2,
                }}>{t.count}</span>}
                {tab === t.id && <span style={{
                  position: 'absolute', bottom: -1, left: 12, right: 12, height: 2,
                  background: T.live, borderRadius: 2,
                }}/>}
              </button>
            ))}
          </div>

          <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16, minHeight: 0 }}>
            {tab === 'stats' && <RealStatsPanel match={m}/>}
            {tab === 'events' && <RealEventsPanel match={m}/>}
          </div>
          {/* Sources — separate bottom panel, always visible */}
          <div style={{
            borderTop: `1px solid ${T.hairlineStrong}`,
            background: T.bg1,
            maxHeight: '40%',
            display: 'flex', flexDirection: 'column', minHeight: 0,
          }}>
            <div style={{
              padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: `1px solid ${T.hairline}`,
            }}>
              <span style={{ fontFamily: T.font, fontSize: 12, fontWeight: 600, color: T.text, letterSpacing: '0.04em' }}>
                SOURCES
              </span>
              {realStreams.length > 0 && (
                <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint }}>
                  {realStreams.length} active
                </span>
              )}
            </div>
            <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              <SourcesPanel
                server={server}
                setServer={selectStream}
                streams={realStreams}
                failed={failedStreams}
                onRetry={(key) => {
                  setFailedStreams(prev => {
                    if (!prev.has(key)) return prev;
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                  });
                  selectionTsRef.current = Date.now();
                  setIframeKey(k => k + 1);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MultiViewPanel() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: T.font, fontSize: 13, fontWeight: 600, color: T.text }}>Multi‑view · 3 active</div>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint, marginTop: 2 }}>Drag to reorder · click to swap</div>
        </div>
        <button style={{
          height: 26, padding: '0 10px', borderRadius: 5,
          border: `1px solid ${T.hairlineStrong}`, background: 'transparent',
          color: T.text, fontFamily: T.font, fontSize: 11, cursor: 'pointer',
        }}>+ Add</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MATCHES.slice(1, 5).map((m, i) => (
          <div key={m.id} style={{
            position: 'relative', borderRadius: 8, overflow: 'hidden',
            border: i === 0 ? `1.5px solid ${T.live}` : `1px solid ${T.hairline}`,
            cursor: 'pointer',
          }}>
            <Placeholder label={m.a.slice(0,3).toUpperCase() + (m.b ? ' VS ' + m.b.slice(0,3).toUpperCase() : '')} hue={m.hue} ratio="16/9" style={{ borderRadius: 0 }}/>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent 55%)' }}/>
            {i === 0 && <div style={{ position: 'absolute', top: 8, left: 8, padding: '3px 6px', background: T.live, color: '#0a1208', fontFamily: T.mono, fontSize: 9, fontWeight: 700, borderRadius: 3 }}>PIP</div>}
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <LiveDot size={5}/>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 10px' }}>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>{m.league}</div>
              <div style={{ fontFamily: T.font, fontSize: 12, fontWeight: 600, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                {m.a}{m.b && ' vs ' + m.b}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontFamily: T.mono, fontSize: 11, color: '#fff', fontWeight: 600 }}>{m.score}</span>
                <span style={{ fontFamily: T.mono, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{m.clock}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsPanel() {
  return (
    <div>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint, letterSpacing: '0.14em', marginBottom: 4 }}>MATCH STATS</div>
      <div style={{ fontFamily: T.font, fontSize: 13, color: T.textDim, marginBottom: 14 }}>Live · Q3 · 63'</div>

      {/* Team headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12,
        alignItems: 'center', marginBottom: 16,
        padding: '12px 0', borderTop: `1px solid ${T.hairline}`, borderBottom: `1px solid ${T.hairline}`,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: 'oklch(0.32 0.13 25)', margin: '0 auto 6px' }}/>
          <div style={{ fontFamily: T.font, fontSize: 13, fontWeight: 600, color: T.text }}>Arsenal</div>
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 700, color: T.text }}>1—1</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: 'oklch(0.95 0.04 100)', margin: '0 auto 6px' }}/>
          <div style={{ fontFamily: T.font, fontSize: 13, fontWeight: 600, color: T.text }}>Real Madrid</div>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        {[
          ['Possession', 58, 42],
          ['Shots', 11, 8],
          ['On target', 5, 3],
          ['Corners', 6, 2],
          ['Fouls', 9, 12],
          ['Offsides', 1, 3],
          ['Pass accuracy', 87, 84],
          ['xG', 1.4, 0.9],
        ].map(([label, l, r]) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 11, color: T.text, marginBottom: 5 }}>
              <span style={{ fontWeight: 600 }}>{l}</span>
              <span style={{ color: T.textDim, fontSize: 10, letterSpacing: '0.06em' }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{r}</span>
            </div>
            <div style={{ display: 'flex', height: 4, gap: 2 }}>
              <div style={{ flex: l, background: T.live, borderRadius: 2 }}/>
              <div style={{ flex: r, background: T.hairlineStrong, borderRadius: 2 }}/>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint, letterSpacing: '0.14em', marginBottom: 8 }}>FORMATION</div>
      <div style={{
        background: T.bg1, border: `1px solid ${T.hairline}`, borderRadius: 8,
        padding: '10px 12px', display: 'flex', justifyContent: 'space-between',
        fontFamily: T.mono, fontSize: 12, color: T.text,
      }}>
        <span>4‑3‑3</span>
        <span style={{ color: T.textFaint }}>vs</span>
        <span>4‑2‑3‑1</span>
      </div>
    </div>
  );
}

function SourcesPanel({ server, setServer, streams, failed, onRetry }) {
  const real = Array.isArray(streams) ? streams : [];
  const failedSet = failed instanceof Set ? failed : new Set();
  const list = real.length > 0
    ? real.map((s) => ({
        id: s.source + '#' + (s.streamNo != null ? s.streamNo : 0),
        sourceId: s.source + '#' + (s.streamNo != null ? s.streamNo : 0),
        name: (s.source.charAt(0).toUpperCase() + s.source.slice(1)) + (s.streamNo != null ? ' · #' + s.streamNo : ''),
        sub: (s.hd ? 'HD' : 'SD') + ' · ' + (s.language || 'EN'),
        level: s.hd ? 4 : 3,
      }))
    : SERVERS.map(s => ({ id: s.id, sourceId: s.id, name: s.name, sub: s.region + ' · ' + s.quality[0], level: s.latency < 60 ? 4 : s.latency < 100 ? 3 : 2, latency: s.latency }));
  return (
    <div>
      <div style={{
        padding: 12, background: T.bg1, border: `1px solid ${T.hairline}`,
        borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
      }}>
        <div style={{ color: T.live }}>{Icons.shield}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.font, fontSize: 12, fontWeight: 600, color: T.text }}>Streamed.pk · embed</div>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint }}>{real.length > 0 ? real.length + ' streams · official iframe' : 'No streams loaded'}</div>
        </div>
      </div>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint, letterSpacing: '0.14em', marginBottom: 8 }}>SOURCES · {list.length} ACTIVE</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {list.map(s => {
          const isFailed = failedSet.has(s.sourceId);
          const isActive = s.sourceId === server;
          return (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px',
              background: isActive ? T.bg2 : 'transparent',
              border: `1px solid ${isActive ? T.hairlineStrong : 'transparent'}`,
              borderRadius: 6, cursor: 'pointer',
              opacity: isFailed && !isActive ? 0.55 : 1,
            }} onClick={() => {
              if (isFailed && s.sourceId === server && onRetry) onRetry(s.sourceId);
              else if (isFailed && onRetry) { onRetry(s.sourceId); setServer(s.sourceId); }
              else setServer(s.sourceId);
            }}>
              <SignalBars level={isFailed ? 1 : s.level}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: T.font, fontSize: 12, fontWeight: 600, color: isFailed ? '#ff7a7a' : T.text }}>{s.name}</span>
                  {isFailed && (
                    <span title="Stream failed to load — click to retry" style={{
                      fontFamily: T.mono, fontSize: 8, fontWeight: 700,
                      color: '#ff7a7a', border: '1px solid rgba(255,122,122,0.5)',
                      background: 'rgba(255,122,122,0.1)',
                      padding: '1px 4px', borderRadius: 3, letterSpacing: '0.08em',
                    }}>ISSUE</span>
                  )}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: isFailed ? 'rgba(255,122,122,0.7)' : T.textFaint, marginTop: 2 }}>
                  {isFailed ? 'Failed to load · click to retry' : s.sub}
                </div>
              </div>
              {!isFailed && s.latency != null && <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim }}>{s.latency}ms</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventsPanel() {
  const events = [
    { t: "61'", a: 'Saka', e: 'Yellow card', team: 'ARS', icon: '▢' },
    { t: "53'", a: 'Vinícius Jr.', e: 'Shot saved', team: 'RMA', icon: '◐' },
    { t: "44'", a: 'Vinícius Jr.', e: 'Goal', team: 'RMA', icon: '●' },
    { t: "31'", a: 'Bellingham', e: 'Substitution on', team: 'RMA', icon: '↑' },
    { t: "12'", a: 'Ødegaard', e: 'Goal', team: 'ARS', icon: '●' },
    { t: "0'", a: '', e: 'Kick‑off', team: '', icon: '▷' },
  ];
  return (
    <div>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint, letterSpacing: '0.14em', marginBottom: 12 }}>KEY EVENTS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {events.map((ev, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 12, borderBottom: i < events.length - 1 ? `1px solid ${T.hairline}` : 'none' }}>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint, minWidth: 30, paddingTop: 1 }}>{ev.t}</span>
            <span style={{ color: ev.e === 'Goal' ? T.live : T.textDim, fontFamily: T.mono, fontSize: 12, lineHeight: 1, paddingTop: 2 }}>{ev.icon}</span>
            <div style={{ flex: 1 }}>
              {ev.a && <div style={{ fontFamily: T.font, fontSize: 12, fontWeight: 600, color: T.text }}>{ev.a}</div>}
              <div style={{ fontFamily: T.font, fontSize: 12, color: ev.a ? T.textDim : T.text }}>{ev.e}</div>
              {ev.team && <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textFaint, letterSpacing: '0.1em', marginTop: 2 }}>{ev.team}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBar({ label, l, r }) {
  const total = l + r;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 10, color: '#fff', marginBottom: 3 }}>
        <span>{l}</span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
        <span>{r}</span>
      </div>
      <div style={{ display: 'flex', height: 2, gap: 2 }}>
        <div style={{ flex: l / total, background: T.live, borderRadius: 1 }}/>
        <div style={{ flex: r / total, background: 'rgba(255,255,255,0.3)', borderRadius: 1 }}/>
      </div>
    </div>
  );
}

// Polls ESPN for live stats every 30s. Returns
// { status: 'idle'|'loading'|'no-match'|'ok'|'error', data, error }.
function useStats(match) {
  const [state, setState] = React.useState({ status: 'idle', data: null, error: null });
  React.useEffect(() => {
    if (!match || !match.id || !window.STATS) {
      setState({ status: 'idle', data: null, error: null });
      return;
    }
    let cancelled = false;
    let foundCache = null;
    const tick = async () => {
      try {
        if (!foundCache) {
          foundCache = await window.STATS.findMatch(match);
          if (cancelled) return;
          if (!foundCache) {
            setState({ status: 'no-match', data: null, error: null });
            return;
          }
        }
        const data = await window.STATS.fetchStats(foundCache);
        if (cancelled) return;
        setState({ status: 'ok', data, error: null });
      } catch (e) {
        if (cancelled) return;
        setState(s => ({ status: 'error', data: s.data, error: e && e.message ? e.message : String(e) }));
      }
    };
    setState({ status: 'loading', data: null, error: null });
    tick();
    const id = setInterval(tick, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [match && match.id]);
  return state;
}

function TeamLogo({ url, fallbackHue }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setFailed(false); }, [url]);
  if (!url || failed) {
    return <div style={{ width: 32, height: 32, borderRadius: 6, background: `oklch(0.32 0.13 ${fallbackHue || 200})`, margin: '0 auto 6px' }}/>;
  }
  return (
    <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{ width: 32, height: 32, margin: '0 auto 6px', objectFit: 'contain', display: 'block' }}/>
  );
}

function StatsLoading() {
  return <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim, padding: 24, textAlign: 'center' }}>Loading from ESPN…</div>;
}

function RealStatsPanel({ match }) {
  const { status, data, error } = useStats(match);
  if (status === 'loading' || status === 'idle') return <StatsLoading/>;
  if (status === 'no-match') return <NoDataPanel title="Match stats" body="Couldn't find this match on ESPN. Stats aren't available for every fixture (lower-tier leagues, exhibitions, regional broadcasts)."/>;
  if (status === 'error' && !data) return <NoDataPanel title="Match stats" body={`ESPN source error: ${error}. Will retry every 30s.`}/>;
  if (!data) return <NoDataPanel title="Match stats" body="No data."/>;

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12,
        alignItems: 'center', marginBottom: 14,
        padding: '12px 0', borderTop: `1px solid ${T.hairline}`, borderBottom: `1px solid ${T.hairline}`,
      }}>
        <div style={{ textAlign: 'center' }}>
          <TeamLogo url={data.home.logo} fallbackHue={25}/>
          <div style={{ fontFamily: T.font, fontSize: 12, fontWeight: 600, color: T.text }}>{data.home.shortName || data.home.name}</div>
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 700, color: T.text, whiteSpace: 'nowrap' }}>{data.home.score}—{data.away.score}</div>
        <div style={{ textAlign: 'center' }}>
          <TeamLogo url={data.away.logo} fallbackHue={100}/>
          <div style={{ fontFamily: T.font, fontSize: 12, fontWeight: 600, color: T.text }}>{data.away.shortName || data.away.name}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontFamily: T.mono, fontSize: 10, color: T.textDim }}>
        {data.status === 'live'
          ? <LiveDot label={`LIVE${data.period ? ' · ' + data.period : ''}`}/>
          : <span style={{ letterSpacing: '0.14em' }}>{data.status === 'final' ? 'FINAL' : 'PRE-MATCH'}{data.period ? ' · ' + data.period : ''}</span>}
      </div>

      {data.stats.length === 0 && (
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim, padding: '12px 0' }}>
          No live stats yet — {data.status === 'pre' ? 'match hasn\'t started.' : 'ESPN hasn\'t published stats for this match.'}
        </div>
      )}

      {data.stats.map(s => {
        const lh = parseFloat(String(s.home).replace(/[^\d.]/g, '')) || 0;
        const la = parseFloat(String(s.away).replace(/[^\d.]/g, '')) || 0;
        const total = lh + la || 1;
        return (
          <div key={s.label} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: T.mono, fontSize: 11, marginBottom: 5 }}>
              <span style={{ fontWeight: lh >= la && lh > 0 ? 700 : 600, color: lh >= la && lh > 0 ? T.live : T.textDim }}>{s.home}</span>
              <span style={{ color: T.textDim, fontSize: 10, letterSpacing: '0.06em' }}>{s.label}</span>
              <span style={{ fontWeight: la > lh ? 700 : 600, color: la > lh ? T.live : T.textDim }}>{s.away}</span>
            </div>
            <div style={{ display: 'flex', height: 4, gap: 2 }}>
              <div style={{ flex: lh / total, background: T.live, borderRadius: 2, minWidth: lh > 0 ? 2 : 0 }}/>
              <div style={{ flex: la / total, background: T.hairlineStrong, borderRadius: 2, minWidth: la > 0 ? 2 : 0 }}/>
            </div>
          </div>
        );
      })}

      <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textFaint, marginTop: 18, paddingTop: 10, borderTop: `1px solid ${T.hairline}`, letterSpacing: '0.08em' }}>
        SOURCE · ESPN · REFRESH 30s{status === 'error' ? ' · LAST FETCH FAILED' : ''}
      </div>
    </div>
  );
}

function RealEventsPanel({ match }) {
  const { status, data, error } = useStats(match);
  if (status === 'loading' || status === 'idle') return <StatsLoading/>;
  if (status === 'no-match') return <NoDataPanel title="Key events" body="Couldn't find this match on ESPN."/>;
  if (status === 'error' && !data) return <NoDataPanel title="Key events" body={`ESPN source error: ${error}. Will retry every 30s.`}/>;
  if (!data || data.events.length === 0) return <NoDataPanel title="Key events" body="No events recorded yet."/>;
  return (
    <div>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint, letterSpacing: '0.14em', marginBottom: 12 }}>KEY EVENTS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.events.map((ev, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            paddingBottom: 10, borderBottom: i < data.events.length - 1 ? `1px solid ${T.hairline}` : 'none',
          }}>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: ev.scoringPlay ? T.live : T.textFaint, minWidth: 40, paddingTop: 1, fontWeight: ev.scoringPlay ? 700 : 400 }}>{ev.time || '—'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.font, fontSize: 12, color: ev.scoringPlay ? T.text : T.textDim, fontWeight: ev.scoringPlay ? 600 : 400 }}>{ev.text}</div>
              {ev.team && <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textFaint, letterSpacing: '0.1em', marginTop: 2 }}>{ev.team}</div>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textFaint, marginTop: 18, paddingTop: 10, borderTop: `1px solid ${T.hairline}`, letterSpacing: '0.08em' }}>
        SOURCE · ESPN · REFRESH 30s
      </div>
    </div>
  );
}

function NoDataPanel({ title, body }) {
  return (
    <div>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint, letterSpacing: '0.14em', marginBottom: 12 }}>{title.toUpperCase()}</div>
      <div style={{ padding: 16, background: T.bg1, border: `1px dashed ${T.hairlineStrong}`, borderRadius: 8, fontFamily: T.font, fontSize: 12, color: T.textDim, lineHeight: 1.55 }}>
        {body}
      </div>
    </div>
  );
}

function WatchlistBtn({ match }) {
  const store = window.useWSStore();
  const id = match && match.id;
  const on = id ? store.isWatched(id) : false;
  return (
    <button
      onClick={() => id && store.toggleWatch(id)}
      disabled={!id}
      style={{ ...ghostBtn, color: on ? T.live : T.text, borderColor: on ? T.live : T.hairlineStrong }}>
      {on ? Icons.starFill : Icons.star} {on ? 'In watchlist' : 'Watchlist'}
    </button>
  );
}

Object.assign(window, { MatchDetail, PlayerMinimal, PlayerFull, NotLiveNotice, ghostBtn, WatchlistBtn });
