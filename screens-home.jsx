// Home / browse screens

// Variant A — Grid layout (live-first)
function HomeGrid() {
  const store = window.useWSStore();
  const sportFilter = store.get().sportFilter;
  // Auto-fall-back to 'all' when the saved filter has no matches in the current set
  // (e.g. user had MMA selected before the schema change to 'fight').
  const filterMatches = sportFilter === 'all' ? MATCHES : MATCHES.filter(m => (m.sport || '').toLowerCase() === sportFilter);
  const filtered = filterMatches.length === 0 && sportFilter !== 'all' ? MATCHES : filterMatches;
  const live = filtered.filter(m => m.live);
  const upcoming = filtered.filter(m => !m.live);
  const todayKey = window.dateKey(new Date());
  const upcomingToday = upcoming.filter(m => {
    const ts = m && m.raw && typeof m.raw.date === 'number' ? m.raw.date : 0;
    return ts && window.dateKey(new Date(ts)) === todayKey;
  });
  const upcomingLater = upcoming.filter(m => {
    const ts = m && m.raw && typeof m.raw.date === 'number' ? m.raw.date : 0;
    return !ts || window.dateKey(new Date(ts)) !== todayKey;
  });
  const hero = live[0] || filtered[0] || { a: 'No matches', b: '', league: sportFilter === 'all' ? 'Streamed.pk · live' : sportFilter, score: '', clock: '', viewers: '', hue: 200, poster: null };
  const tile1 = live[1] || filtered[1];
  const tile2 = live[2] || filtered[2];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg0 }}>
      <TopNav/>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <SideNav active="home"/>
        <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>
          {/* Hero strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 12, marginBottom: 28,
            height: 280,
          }}>
            <div onClick={() => hero.id && window.WS_GO && window.WS_GO('player', hero)} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height: '100%', cursor: hero.id ? 'pointer' : 'default', background: `oklch(0.18 0.02 ${hero.hue || 10})` }}>
              <MatchCover m={hero} fill/>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)',
              }}/>
              {hero.live && <div style={{ position: 'absolute', top: 14, left: 14 }}><LiveDot/></div>}
              <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                <div style={{
                  fontFamily: T.mono, fontSize: 10, color: T.textDim,
                  letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6,
                }}>{hero.league || ''}</div>
                <div style={{ fontFamily: T.font, fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: '-0.02em' }}>
                  {hero.a}{hero.b && <span style={{ color: T.textFaint, fontWeight: 400 }}> vs </span>}{hero.b}
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 8, alignItems: 'center' }}>
                  {hero.score && hero.score !== '—' && <span style={{ fontFamily: T.mono, fontSize: 14, color: T.text, fontWeight: 600 }}>{hero.score}</span>}
                  <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim }}>{hero.clock}</span>
                  {hero.viewers && <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim }}>{hero.viewers} watching</span>}
                </div>
              </div>
              {hero.id && <button onClick={e => { e.stopPropagation(); window.WS_GO && window.WS_GO('player', hero); }} style={{
                position: 'absolute', bottom: 16, right: 16,
                height: 36, padding: '0 16px', borderRadius: 8, border: 'none',
                background: T.live, color: '#0a1208', fontFamily: T.font,
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>{Icons.play} Watch</button>}
            </div>
            {tile1 && <MatchCard m={tile1} compact fill/>}
            {tile2 && <MatchCard m={tile2} compact fill/>}
          </div>

          {/* Sport pills — hide empties so only sports with live data show */}
          {(() => {
            const counts = {};
            MATCHES.forEach(m => { counts[m.sport] = (counts[m.sport] || 0) + 1; });
            const visible = SPORTS.filter(s => s.id === 'all' || counts[s.id] > 0);
            return (
              <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
                {visible.map((s) => (
                  <Pill key={s.id} active={s.id === sportFilter} onClick={() => store.setSport(s.id)}>{s.label}</Pill>
                ))}
              </div>
            );
          })()}

          {/* Live now */}
          <SectionHeader title="Live Now" sub={`${live.length} streams`}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
            {live.slice(0, 8).map(m => <MatchCard key={m.id} m={m}/>)}
          </div>

          {upcomingToday.length > 0 && (
            <>
              <SectionHeader title="Coming Up Today" sub={`${upcomingToday.length} ${upcomingToday.length === 1 ? 'match' : 'matches'}`}/>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
                {upcomingToday.map(m => <MatchCard key={m.id} m={m}/>)}
              </div>
            </>
          )}

          {upcomingLater.length > 0 && (
            <>
              <SectionHeader title="Upcoming" sub={`${upcomingLater.length} ${upcomingLater.length === 1 ? 'match' : 'matches'}`}/>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {upcomingLater.map(m => <MatchCard key={m.id} m={m}/>)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Variant B — Editorial / list-driven layout
function HomeEditorial() {
  const featured = MATCHES[0];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg0 }}>
      <TopNav/>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <SideNav active="home"/>
        <div className="ws-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          {/* Big editorial hero */}
          <div style={{ position: 'relative', height: 420, borderBottom: `1px solid ${T.hairline}` }}>
            <Placeholder label="ARSENAL VS REAL MADRID" sub="UEFA Champions League" hue={220} style={{ height: '100%', borderRadius: 0 }}/>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, rgba(10,11,13,0.92) 0%, rgba(10,11,13,0.5) 50%, transparent 100%)',
            }}/>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%',
              padding: '60px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <LiveDot/>
                <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  UEFA Champions League · Quarter‑final
                </span>
              </div>
              <div style={{
                fontFamily: T.font, fontSize: 64, fontWeight: 700,
                color: T.text, letterSpacing: '-0.035em', lineHeight: 1.0, marginBottom: 14,
              }}>Arsenal<br/><span style={{ color: T.textFaint, fontWeight: 300 }}>vs</span> Real Madrid</div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 28, alignItems: 'baseline' }}>
                <div>
                  <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textFaint, letterSpacing: '0.14em' }}>SCORE</div>
                  <div style={{ fontFamily: T.mono, fontSize: 22, color: T.text, fontWeight: 600 }}>1—1</div>
                </div>
                <div>
                  <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textFaint, letterSpacing: '0.14em' }}>CLOCK</div>
                  <div style={{ fontFamily: T.mono, fontSize: 22, color: T.text, fontWeight: 600 }}>63'</div>
                </div>
                <div>
                  <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textFaint, letterSpacing: '0.14em' }}>WATCHING</div>
                  <div style={{ fontFamily: T.mono, fontSize: 22, color: T.text, fontWeight: 600 }}>482K</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{
                  height: 42, padding: '0 22px', borderRadius: 8, border: 'none',
                  background: T.live, color: '#0a1208', fontFamily: T.font,
                  fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>{Icons.play} Watch Now</button>
                <button style={{
                  height: 42, padding: '0 18px', borderRadius: 8,
                  border: `1px solid ${T.hairlineStrong}`, background: 'transparent',
                  color: T.text, fontFamily: T.font, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>{Icons.star} Watchlist</button>
              </div>
            </div>
          </div>

          <div style={{ padding: '28px 56px 40px' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
              {SPORTS.slice(0, 8).map((s, i) => <Pill key={s.id} active={i === 0}>{s.label}</Pill>)}
            </div>

            {/* Editorial list rows */}
            <SectionHeader title="Live Now" sub="Updated 2s ago"/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {MATCHES.filter(m => m.live).slice(0, 6).map(m => (
                <ListRow key={m.id} m={m}/>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h3 style={{
          fontFamily: T.font, fontSize: 16, fontWeight: 600, color: T.text,
          margin: 0, letterSpacing: '-0.01em',
        }}>{title}</h3>
        {sub && <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint }}>{sub}</span>}
      </div>
      {action}
    </div>
  );
}

function ListRow({ m }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '120px 1fr 100px 100px 120px 100px',
      gap: 16, alignItems: 'center', padding: '14px 12px',
      borderBottom: `1px solid ${T.hairline}`, cursor: 'pointer',
      transition: 'background .12s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = T.bg1}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <Placeholder label={m.a.slice(0, 4).toUpperCase()} hue={m.hue} ratio="16/9" style={{ borderRadius: 4 }}/>
      <div>
        <div style={{
          fontFamily: T.mono, fontSize: 9, letterSpacing: '0.12em',
          color: T.textFaint, textTransform: 'uppercase', marginBottom: 4,
        }}>{m.league}</div>
        <div style={{ fontFamily: T.font, fontSize: 15, fontWeight: 600, color: T.text }}>
          {m.a}{m.b && <span style={{ color: T.textFaint, fontWeight: 400 }}> vs </span>}{m.b}
        </div>
      </div>
      <div style={{ fontFamily: T.mono, fontSize: 14, color: T.text, fontWeight: 600 }}>{m.score}</div>
      <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim }}>{m.clock}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <LiveDot/>
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim }}>{m.viewers}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button style={iconBtn}>{Icons.star}</button>
        <button style={{
          height: 30, padding: '0 14px', borderRadius: 6, border: 'none',
          background: T.live, color: '#0a1208', fontFamily: T.font,
          fontWeight: 600, fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>{Icons.play} Watch</button>
      </div>
    </div>
  );
}

Object.assign(window, { HomeGrid, HomeEditorial, SectionHeader, ListRow });
