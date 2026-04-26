// Schedule, Search, Settings, Watchlist, Mobile

function ScheduleScreen() {
  const store = window.useWSStore();
  const sportFilter = store.get().sportFilter;
  const [items, setItems] = React.useState(null); // null = loading, [] = empty
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    setItems(null); setError(null);
    window.STREAMED.matches({ filter: 'all-today' })
      .then(arr => { if (!cancelled) setItems(arr); })
      .catch(e => { if (!cancelled) { setItems([]); setError(e.message || String(e)); } });
    return () => { cancelled = true; };
  }, []);

  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return 'Local'; } })();
  const filtered = (items || []).filter(m => sportFilter === 'all' || (m.sport || '').toLowerCase() === sportFilter)
    .slice().sort((a, b) => (a.raw && a.raw.date || 0) - (b.raw && b.raw.date || 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg0 }}>
      <TopNav/>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <SideNav active="schedule"/>
        <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <h1 style={{ fontFamily: T.font, fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', margin: 0 }}>Schedule</h1>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint }}>Today · {tz}</span>
          </div>

          {/* Sport filter pills — only show sports that have today's events */}
          {(() => {
            const counts = {};
            (items || []).forEach(m => { counts[m.sport] = (counts[m.sport] || 0) + 1; });
            const visible = SPORTS.filter(s => s.id === 'all' || counts[s.id] > 0);
            return (
              <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
                {visible.map((s) => (
                  <Pill key={s.id} active={s.id === sportFilter} onClick={() => store.setSport(s.id)}>{s.label}</Pill>
                ))}
              </div>
            );
          })()}

          {items === null && <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, padding: '40px 0' }}>Loading today's matches…</div>}
          {items && items.length === 0 && (
            <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, padding: '40px 0' }}>
              No matches today.{error ? ' (' + error + ')' : ''}
            </div>
          )}
          {filtered.length > 0 && (
            <div>
              {filtered.map((e) => (
                <div key={e.id}
                  onClick={() => window.WS_GO && window.WS_GO('player', e)}
                  style={{
                    display: 'grid', gridTemplateColumns: '90px 70px 1fr 130px 100px 80px',
                    gap: 16, alignItems: 'center', padding: '14px 12px',
                    borderBottom: `1px solid ${T.hairline}`,
                    background: e.live ? `linear-gradient(90deg, ${T.liveDim} 0%, transparent 8%)` : 'transparent',
                    cursor: 'pointer',
                  }}>
                  <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 600, color: e.live ? T.live : T.text }}>
                    {e.live ? 'NOW' : e.clock}
                  </div>
                  <div>
                    {e.live ? <LiveDot/> : <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint, letterSpacing: '0.12em' }}>UPCOMING</span>}
                  </div>
                  <div>
                    <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.12em', color: T.textFaint, textTransform: 'uppercase', marginBottom: 4 }}>{e.league}</div>
                    <div style={{ fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.text }}>
                      {e.a}{e.b && <span style={{ color: T.textFaint, fontWeight: 400 }}> vs </span>}{e.b}
                    </div>
                  </div>
                  <div style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, textTransform: 'capitalize' }}>{e.sport}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim }}>
                    {(e.rawSources || []).length} source{(e.rawSources || []).length === 1 ? '' : 's'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }} onClick={ev => ev.stopPropagation()}>
                    <StarToggle id={e.id}/>
                    {e.live && (e.rawSources || []).length > 0 && <button onClick={() => window.WS_GO && window.WS_GO('player', e)} style={{
                      height: 28, padding: '0 12px', borderRadius: 6, border: 'none',
                      background: T.live, color: '#0a1208', fontFamily: T.font,
                      fontWeight: 600, fontSize: 11, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>{Icons.play}</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchScreen() {
  const store = window.useWSStore();
  const q = store.get().search.trim();
  const [filter, setFilter] = React.useState('all'); // all | live | upcoming
  const ql = q.toLowerCase();
  const matches = !q ? [] : MATCHES.filter(m => {
    const hay = `${m.a || ''} ${m.b || ''} ${m.league || ''} ${m.sport || ''}`.toLowerCase();
    return hay.includes(ql);
  });
  const live = matches.filter(m => m.live);
  const upcoming = matches.filter(m => !m.live);
  const visible = filter === 'live' ? live : filter === 'upcoming' ? upcoming : matches;
  const top = live[0] || matches[0];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg0 }}>
      <TopNav/>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <SideNav/>
        <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint, letterSpacing: '0.12em', marginBottom: 6 }}>SEARCH RESULTS</div>
            <h1 style={{ fontFamily: T.font, fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', margin: 0 }}>
              {q ? `"${q}"` : 'Type to search'} <span style={{ color: T.textFaint, fontWeight: 400, fontSize: 18 }}>· {matches.length} match{matches.length === 1 ? '' : 'es'}</span>
            </h1>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 24, alignItems: 'center' }}>
            <Pill active={filter === 'all'} onClick={() => setFilter('all')}>All ({matches.length})</Pill>
            <Pill active={filter === 'live'} onClick={() => setFilter('live')}>Live ({live.length})</Pill>
            <Pill active={filter === 'upcoming'} onClick={() => setFilter('upcoming')}>Upcoming ({upcoming.length})</Pill>
          </div>

          {!q && <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, padding: '40px 0' }}>Use the search bar above to find teams, matches, or leagues.</div>}
          {q && matches.length === 0 && <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, padding: '40px 0' }}>No matches for "{q}".</div>}

          {top && (
            <div style={{ marginBottom: 32 }}>
              <SectionHeader title="Best match" sub={top.live ? 'Live now' : top.clock}/>
              <div onClick={() => window.WS_GO && window.WS_GO('player', top)} style={{
                display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20,
                padding: 16, background: T.bg1, border: `1px solid ${T.hairlineStrong}`, borderRadius: 12,
                cursor: 'pointer',
              }}>
                <div style={{ position: 'relative', aspectRatio: '16/9', background: `oklch(0.18 0.02 ${top.hue || 200})`, borderRadius: 8, overflow: 'hidden' }}>
                  <MatchCover m={top}/>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    {top.live && <LiveDot/>}
                    <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint, letterSpacing: '0.12em' }}>{top.league}</span>
                  </div>
                  <h2 style={{ fontFamily: T.font, fontSize: 26, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', margin: 0, marginBottom: 8 }}>
                    {top.a}{top.b && <span style={{ color: T.textFaint, fontWeight: 400 }}> vs </span>}{top.b}
                  </h2>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                    <div><span style={{ fontFamily: T.mono, fontSize: 9, color: T.textFaint, letterSpacing: '0.12em' }}>STATUS</span><div style={{ fontFamily: T.mono, fontSize: 16, color: T.text, fontWeight: 600 }}>{top.live ? 'LIVE' : top.clock}</div></div>
                    <div><span style={{ fontFamily: T.mono, fontSize: 9, color: T.textFaint, letterSpacing: '0.12em' }}>SOURCES</span><div style={{ fontFamily: T.mono, fontSize: 16, color: T.text, fontWeight: 600 }}>{(top.rawSources || []).length}</div></div>
                    <div><span style={{ fontFamily: T.mono, fontSize: 9, color: T.textFaint, letterSpacing: '0.12em' }}>SPORT</span><div style={{ fontFamily: T.mono, fontSize: 16, color: T.text, fontWeight: 600, textTransform: 'capitalize' }}>{top.sport || '—'}</div></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }} onClick={ev => ev.stopPropagation()}>
                    {(top.rawSources || []).length > 0 && <button onClick={() => window.WS_GO && window.WS_GO('player', top)} style={{
                      height: 36, padding: '0 18px', borderRadius: 8, border: 'none',
                      background: T.live, color: '#0a1208', fontFamily: T.font,
                      fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>{Icons.play} Watch Now</button>}
                    <WatchlistBtn match={top}/>
                  </div>
                </div>
              </div>
            </div>
          )}

          {visible.length > 0 && (
            <>
              <SectionHeader title="All results"/>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {visible.map(m => <MatchCard key={m.id} m={m}/>)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function WatchlistScreen() {
  const store = window.useWSStore();
  const ids = store.get().watchlist;
  const recently = store.get().recently;
  // Resolve watchlist ids to current match metadata when available; fall back to a stub.
  const byId = Object.fromEntries(MATCHES.map(m => [m.id, m]));
  const items = ids.map(id => byId[id] || { id, a: 'Match ' + id.slice(0, 6), b: '', league: 'Unavailable', live: false, hue: 200 });
  const liveItems = items.filter(m => m.live);
  const otherItems = items.filter(m => !m.live);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg0 }}>
      <TopNav/>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <SideNav active="watchlist"/>
        <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontFamily: T.font, fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', margin: 0 }}>Watchlist</h1>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint, marginTop: 4 }}>{items.length} item{items.length === 1 ? '' : 's'} · {liveItems.length} live now</div>
          </div>

          {items.length === 0 && (
            <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, padding: '40px 0' }}>
              Your watchlist is empty. Tap the star on any match to add it.
            </div>
          )}

          {liveItems.length > 0 && (
            <>
              <SectionHeader title="Live now"/>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
                {liveItems.map(m => <MatchCard key={m.id} m={m}/>)}
              </div>
            </>
          )}

          {otherItems.length > 0 && (
            <>
              <SectionHeader title="Saved"/>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
                {otherItems.map(m => <MatchCard key={m.id} m={m}/>)}
              </div>
            </>
          )}

          {recently.length > 0 && (
            <>
              <SectionHeader title="Recently watched"/>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {recently.map(r => {
                  const live = byId[r.id];
                  return <MatchCard key={r.id} m={live || r}/>;
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsScreen() {
  const store = window.useWSStore();
  const s = store.get().settings;
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return 'Local'; } })();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg0 }}>
      <TopNav/>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <SideNav/>
        <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto', padding: '32px 56px 40px', maxWidth: 760 }}>
          <h1 style={{ fontFamily: T.font, fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', margin: 0, marginBottom: 28 }}>Settings</h1>

          <Setting label="Default quality" sub="Streamed.pk embeds choose quality automatically. This is a preference for any future direct-stream support.">
            <div style={{ display: 'flex', gap: 6 }}>
              {['Auto', '1080p', '720p', '480p'].map((q) => <Pill key={q} active={s.defaultQuality === q} onClick={() => store.setSetting('defaultQuality', q)}>{q}</Pill>)}
            </div>
          </Setting>

          <Setting label="Preferred server region" sub="When a match has multiple sources, prefer this region. Streamed sources don't always advertise region, so this is best-effort.">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Auto', 'EU‑West', 'EU‑Central', 'US‑East', 'US‑West', 'Asia'].map((q) => <Pill key={q} active={s.region === q} onClick={() => store.setSetting('region', q)}>{q}</Pill>)}
            </div>
          </Setting>

          <Setting label="Ad shielding (note)" sub="WebStreamer renders Streamed.pk's official iframe, which handles ad behavior on their end. Toggling this does not affect their embed.">
            <Toggle checked={s.adShield} onChange={v => store.setSetting('adShield', v)}/>
          </Setting>

          <Setting label="Auto‑switch source on failure" sub="If the embedded player fails to load within 8 seconds, automatically advance to the next source.">
            <Toggle checked={s.autoSwitch} onChange={v => store.setSetting('autoSwitch', v)}/>
          </Setting>

          <Setting label="Theme">
            <div style={{ display: 'flex', gap: 6 }}>
              {['System', 'Dark', 'OLED Black'].map((q) => <Pill key={q} active={s.theme === q} onClick={() => store.setSetting('theme', q)}>{q}</Pill>)}
            </div>
          </Setting>

          <Setting label="Game-start notifications" sub="Receive a browser notification before a scheduled match starts. Notifications fire only while WebStreamer is open in a tab.">
            <Toggle
              checked={s.notifyEnabled && (typeof Notification === 'undefined' || Notification.permission === 'granted')}
              onChange={async (v) => {
                if (v) {
                  if (window.WSNotify) {
                    const p = await window.WSNotify.ensurePermission();
                    if (p !== 'granted') return;
                  }
                  store.setSetting('notifyEnabled', true);
                } else {
                  store.setSetting('notifyEnabled', false);
                }
              }}/>
          </Setting>

          <Setting label="Notification lead time" sub="How far ahead of the scheduled start time we should fire the reminder.">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { v: 0, label: 'At start' },
                { v: 15, label: '15 min' },
                { v: 30, label: '30 min' },
                { v: 60, label: '1 hour' },
              ].map(o => (
                <Pill key={o.v} active={s.notifyLeadMinutes === o.v}
                  onClick={() => store.setSetting('notifyLeadMinutes', o.v)}>{o.label}</Pill>
              ))}
            </div>
          </Setting>

          <Setting label="Time zone">
            <div style={{
              padding: '8px 12px', background: T.bg2, border: `1px solid ${T.hairline}`,
              borderRadius: 6, fontFamily: T.mono, fontSize: 12, color: T.text,
              minWidth: 220, textAlign: 'right',
            }}>{tz}</div>
          </Setting>

          <Setting label="Clear local data" sub="Removes your watchlist, recently watched, and saved settings.">
            <button style={{ ...ghostBtn, color: '#ff8b6b', borderColor: 'rgba(255,139,107,0.4)' }}
              onClick={() => { try { localStorage.removeItem('webstreamer.v1'); location.reload(); } catch (e) {} }}>
              Reset
            </button>
          </Setting>
        </div>
      </div>
    </div>
  );
}

function Setting({ label, sub, children }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 32,
      padding: '20px 0', borderBottom: `1px solid ${T.hairline}`,
      alignItems: 'center',
    }}>
      <div>
        <div style={{ fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.text }}>{label}</div>
        {sub && <div style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, marginTop: 4, maxWidth: 480, lineHeight: 1.5 }}>{sub}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  const controlled = onChange != null;
  const [local, setLocal] = React.useState(!!checked);
  const on = controlled ? !!checked : local;
  const flip = () => { if (controlled) onChange(!on); else setLocal(!on); };
  return (
    <button onClick={flip} style={{
      width: 38, height: 22, borderRadius: 999,
      background: on ? T.live : T.bg3, border: `1px solid ${T.hairline}`,
      position: 'relative', cursor: 'pointer', padding: 0,
      transition: 'background .15s',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: on ? '#0a1208' : T.text,
        transition: 'left .15s',
      }}/>
    </button>
  );
}

Object.assign(window, { ScheduleScreen, SearchScreen, WatchlistScreen, SettingsScreen });
