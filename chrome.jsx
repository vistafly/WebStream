// Shared chrome: top nav, side nav

// Poster image with multi-step fallback chain. Tries each URL in sequence,
// gives up to the supplied placeholder when all fail. Also treats
// suspiciously small/square responses as failure (Streamed sometimes serves
// a tiny placeholder PNG in place of missing art instead of 404'ing).
function PosterImg({ chain, fallback, style }) {
  const list = (chain || []).filter(Boolean);
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => { setIdx(0); }, [list.join('|')]);
  if (list.length === 0 || idx >= list.length) return fallback;
  return (
    <img src={list[idx]} alt="" loading="lazy" referrerPolicy="no-referrer"
      style={style || { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      onLoad={e => {
        const img = e.currentTarget;
        // 1x1 / sub-200px responses are placeholder garbage — treat as failure.
        if (img.naturalWidth > 0 && img.naturalWidth < 200) setIdx(i => i + 1);
      }}
      onError={() => setIdx(i => i + 1)}/>
  );
}

// Side-by-side team-badge composite. Broadcast-graphic style: a single
// near-black base, a low-opacity hue wash from the top, a faint diagonal
// line pattern (pure CSS, never rasterizes), a top-center spotlight glow,
// the badges centered, and a thin "VS" divider between them. No multi-color
// gradients to band, no tiled watermarks to clutter.
function BadgeComposite({ home, away, hue }) {
  const [hFail, setHFail] = React.useState(false);
  const [aFail, setAFail] = React.useState(false);
  const showHome = home && !hFail;
  const showAway = away && !aFail;
  if (!showHome && !showAway) return null;
  const h = hue || 200;
  return (
    <div style={{
      position: 'absolute', inset: 0,
      // No overflow:hidden here — let wide logos extend past the gradient frame.
      // The parent MatchCard image area still clips at the card boundary.
      background: `
        radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.32 0.08 ${h}) 0%, transparent 70%),
        radial-gradient(ellipse 100% 80% at 50% 100%, oklch(0.10 0.03 ${h}) 0%, transparent 60%),
        linear-gradient(180deg, #14171c 0%, #0a0c10 100%)
      `,
    }}>
      {/* Diagonal line pattern — pure CSS repeating gradient, infinitely sharp */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 9px)',
      }}/>

      {/* Soft accent glows near each badge position */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(circle at 25% 55%, oklch(0.45 0.12 ${h} / 0.18), transparent 30%),
          radial-gradient(circle at 75% 55%, oklch(0.45 0.12 ${(h + 180) % 360} / 0.18), transparent 30%)
        `,
      }}/>

      {/* Vignette to focus the eye on the badges */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 90% 90% at center, transparent 55%, rgba(0,0,0,0.45) 100%)',
      }}/>

      {/* Foreground: each logo absolutely positioned, same fixed height, width
          flows naturally from natural aspect ratio. No box wrappers, no
          overflow clipping per slot — logos are free to extend horizontally. */}
      {showHome && (
        <img src={home} alt="" loading="lazy" referrerPolicy="no-referrer"
          onError={() => setHFail(true)}
          style={{
            position: 'absolute',
            top: '50%', left: showAway ? '27%' : '50%',
            transform: 'translate(-50%, -50%)',
            height: '60%', width: 'auto',
            filter: 'drop-shadow(0 10px 22px rgba(0,0,0,0.6)) drop-shadow(0 2px 3px rgba(0,0,0,0.75))',
          }}/>
      )}
      {showHome && showAway && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          opacity: 0.55,
        }}>
          <div style={{ width: 1, height: 22, background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.5), transparent)' }}/>
          <div style={{
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 10, fontWeight: 600, letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.7)',
          }}>VS</div>
          <div style={{ width: 1, height: 22, background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.5), transparent)' }}/>
        </div>
      )}
      {showAway && (
        <img src={away} alt="" loading="lazy" referrerPolicy="no-referrer"
          onError={() => setAFail(true)}
          style={{
            position: 'absolute',
            top: '50%', left: showHome ? '73%' : '50%',
            transform: 'translate(-50%, -50%)',
            height: '60%', width: 'auto',
            filter: 'drop-shadow(0 10px 22px rgba(0,0,0,0.6)) drop-shadow(0 2px 3px rgba(0,0,0,0.75))',
          }}/>
      )}
    </div>
  );
}

// Resolves the cover for a match. Strategy:
//   1. Try the poster chain — real match-day art (m.poster) first, then
//      Streamed's auto-generated composite poster. The composite is the
//      "team-color split with tiled logos" art the user prefers; it's
//      gorgeous when it resolves to real art, but Streamed serves a tiny
//      placeholder PNG for many smaller fixtures. PosterImg's onLoad sizing
//      check skips those automatically.
//   2. When the chain is exhausted, fall back to BadgeComposite over the
//      custom hue gradient. Prefer ESPN's full-res logos when STATS.findLogos
//      has resolved them, otherwise use Streamed's individual badges.
function MatchCover({ m, fill }) {
  const [espnLogos, setEspnLogos] = React.useState(null);
  React.useEffect(() => {
    setEspnLogos(null);
    if (!window.STATS || !window.STATS.findLogos || !m || !m.id) return;
    let cancelled = false;
    window.STATS.findLogos(m).then(logos => {
      if (!cancelled && logos && (logos.home || logos.away)) setEspnLogos(logos);
    });
    return () => { cancelled = true; };
  }, [m && m.id]);

  const placeholder = (
    <Placeholder label={`${m.a}${m.b ? ' VS ' + m.b : ''}`} sub={m.league} hue={m.hue}
      ratio={fill ? undefined : '16/9'}
      style={fill ? { height: '100%', aspectRatio: 'auto', position: 'absolute', inset: 0 } : { position: 'absolute', inset: 0 }}/>
  );

  const composeHome = (espnLogos && espnLogos.home) || m.homeBadge;
  const composeAway = (espnLogos && espnLogos.away) || m.awayBadge;
  const badgeFallback = (composeHome || composeAway)
    ? <BadgeComposite home={composeHome} away={composeAway} hue={m.hue}/>
    : placeholder;

  return (
    <PosterImg
      chain={m.posterChain}
      fallback={badgeFallback}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', inset: 0 }}
    />
  );
}

window.PosterImg = PosterImg;
window.BadgeComposite = BadgeComposite;
window.MatchCover = MatchCover;

function TopNav({ q, setQ }) {
  const store = window.useWSStore();
  const value = q != null ? q : store.get().search;
  const onChange = setQ || ((v) => { store.setSearch(v); if (v && window.WS_GO) window.WS_GO('search'); });
  return (
    <div style={{
      height: 56, display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16, borderBottom: `1px solid ${T.hairline}`,
      background: T.bg0, position: 'sticky', top: 0, zIndex: 5,
    }}>
      <div onClick={() => window.WS_GO && window.WS_GO('home')}
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5, position: 'relative',
          background: `linear-gradient(135deg, ${T.live} 0%, oklch(0.55 0.14 165) 100%)`,
        }}>
          <div style={{
            position: 'absolute', inset: 6, background: T.bg0, borderRadius: 2,
          }}/>
          <div style={{
            position: 'absolute', left: 9, top: 7, width: 4, height: 8,
            background: T.live, borderRadius: 1,
          }}/>
        </div>
        <span style={{
          fontFamily: T.font, fontWeight: 700, fontSize: 15,
          letterSpacing: '-0.01em', color: T.text,
        }}>WebStreamer</span>
        <span style={{
          fontFamily: T.mono, fontSize: 9, color: T.textFaint,
          padding: '2px 6px', border: `1px solid ${T.hairline}`,
          borderRadius: 4, marginLeft: 4,
        }}>v2.4</span>
      </div>

      {/* Centered search — bounded width, sits between left logo cluster
          and the right utility cluster. */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '100%', maxWidth: 420, height: 34, position: 'relative',
          background: T.bg2, border: `1px solid ${T.hairline}`,
          borderRadius: 8, display: 'flex', alignItems: 'center',
          padding: '0 12px', gap: 10,
        }}>
          <span style={{ color: T.textDim }}>{Icons.search}</span>
          <input
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && window.WS_GO) window.WS_GO('search'); }}
            placeholder="Search teams, matches, leagues…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: T.font, fontSize: 13, color: T.text,
            }}
          />
          <span style={{
            fontFamily: T.mono, fontSize: 10, color: T.textFaint,
            padding: '2px 5px', border: `1px solid ${T.hairline}`, borderRadius: 4,
          }}>⌘K</span>
        </div>
      </div>

      {/* Right utility cluster: ad-shield pill, notifications bell with
          dropdown, settings, avatar. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.textDim }}>
        <div style={{
          height: 26, padding: '0 8px', display: 'flex', alignItems: 'center',
          gap: 5, fontSize: 10, fontFamily: T.font, color: T.live,
          background: T.liveDim, borderRadius: 5,
        }}
          title="Streamed.pk's official iframe handles ad behavior on their end.">
          {Icons.shield} <span style={{ fontWeight: 600 }}>Ad‑shielded</span>
        </div>
        <NotificationsBell/>
        <button style={iconBtn} onClick={() => window.WS_GO && window.WS_GO('settings')} title="Settings">{Icons.settings}</button>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #3a4250, #20242a)',
          fontFamily: T.font, fontSize: 11, color: T.text, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>JL</div>
      </div>
    </div>
  );
}

// Bell icon in TopNav — shows pending-notification count and opens a
// dropdown listing scheduled reminders, each removable.
function NotificationsBell() {
  const store = window.useWSStore();
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const all = store.get().notifications || [];
  const pending = all.filter(n => !n.notified && n.match.startMs > Date.now() - 60 * 60 * 1000);
  const sorted = pending.slice().sort((a, b) => a.match.startMs - b.match.startMs);
  const count = pending.length;

  function fmtAbsTime(ms) {
    const d = new Date(ms);
    const sameDay = new Date().toDateString() === d.toDateString();
    const t = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return sameDay ? `Today · ${t}` : `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${t}`;
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        style={{ ...iconBtn, color: count > 0 ? T.text : 'rgba(238,240,242,0.62)', position: 'relative' }}
        onClick={() => setOpen(o => !o)}
        title={count > 0 ? `${count} reminder${count === 1 ? '' : 's'} scheduled` : 'Notifications'}>
        {Icons.bell}
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 1, right: 1,
            minWidth: 14, height: 14, padding: '0 3px',
            borderRadius: 7, background: T.live, color: '#0a1208',
            fontFamily: T.mono, fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>{count > 9 ? '9+' : count}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 340, maxHeight: 420, overflow: 'hidden',
          background: T.bg1, border: `1px solid ${T.hairlineStrong}`,
          borderRadius: 10, boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', zIndex: 50,
        }}>
          <div style={{
            padding: '12px 14px', borderBottom: `1px solid ${T.hairline}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontFamily: T.font, fontSize: 13, fontWeight: 600, color: T.text }}>Reminders</div>
            {sorted.length > 0 && (
              <button
                onClick={() => { sorted.forEach(n => store.removeNotification(n.id)); }}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: T.mono, fontSize: 10, color: T.textDim,
                  letterSpacing: '0.08em', padding: 0,
                }}>CLEAR ALL</button>
            )}
          </div>
          <div className="ws-scroll" style={{ overflowY: 'auto', flex: 1 }}>
            {sorted.length === 0 ? (
              <div style={{
                padding: '28px 18px', textAlign: 'center',
                fontFamily: T.font, fontSize: 12, color: T.textDim,
              }}>
                No reminders scheduled.<br/>
                <span style={{ fontSize: 11, color: T.textFaint }}>Open a scheduled match and tap Notify me.</span>
              </div>
            ) : sorted.map(n => (
              <div key={n.id} style={{
                padding: '10px 14px', borderBottom: `1px solid ${T.hairline}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: T.font, fontSize: 13, fontWeight: 600, color: T.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {n.match.a}{n.match.b ? <span style={{ color: T.textFaint, fontWeight: 400 }}> vs </span> : null}{n.match.b}
                  </div>
                  <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, marginTop: 2 }}>
                    {fmtAbsTime(n.match.startMs)}
                    {n.leadMinutes > 0 ? ` · alert ${n.leadMinutes}m before` : ' · alert at start'}
                  </div>
                </div>
                <button
                  onClick={() => store.removeNotification(n.id)}
                  title="Remove reminder"
                  style={{ ...iconBtn, width: 24, height: 24 }}>{Icons.x}</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

window.NotificationsBell = NotificationsBell;

const iconBtn = {
  width: 28, height: 28, borderRadius: 6, border: 'none',
  background: 'transparent', color: 'rgba(238,240,242,0.62)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
};

function SideNav({ active = 'home' }) {
  const store = window.useWSStore();
  const liveCount = (window.MATCHES || []).filter(m => m.live).length;
  const wlCount = store.get().watchlist.length;
  const items = [
    { id: 'home', label: 'Live Now', icon: Icons.signal, badge: liveCount > 0 ? String(liveCount) : null },
    { id: 'schedule', label: 'Schedule', icon: Icons.clock },
    { id: 'watchlist', label: 'Watchlist', icon: Icons.starFill, badge: wlCount > 0 ? String(wlCount) : null },
    { id: 'recent', label: 'Recently Watched', icon: Icons.play },
  ];
  const sportFilter = store.get().sportFilter;
  return (
    <div style={{
      width: 220, padding: '20px 12px', borderRight: `1px solid ${T.hairline}`,
      background: T.bg0, display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <div style={{
        fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em',
        color: T.textFaint, padding: '6px 10px',
      }}>BROWSE</div>
      {items.map(it => (
        <div key={it.id}
          onClick={() => {
            if (it.id === 'home') store.setSport('all');
            window.WS_GO && window.WS_GO(it.id);
          }}
          style={{
          height: 32, padding: '0 10px', display: 'flex', alignItems: 'center',
          gap: 10, borderRadius: 6, fontFamily: T.font, fontSize: 13,
          color: it.id === active ? T.text : T.textDim,
          background: it.id === active ? T.bg2 : 'transparent',
          cursor: 'pointer',
        }}>
          <span style={{ color: it.id === active ? T.live : T.textDim }}>{it.icon}</span>
          <span style={{ flex: 1 }}>{it.label}</span>
          {it.badge && <span style={{
            fontFamily: T.mono, fontSize: 10, color: T.textFaint,
          }}>{it.badge}</span>}
        </div>
      ))}

      <div style={{
        fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em',
        color: T.textFaint, padding: '20px 10px 6px',
      }}>SPORTS</div>
      {(() => {
        const counts = {};
        (window.MATCHES || []).forEach(m => { counts[m.sport] = (counts[m.sport] || 0) + 1; });
        const total = (window.MATCHES || []).length;
        const visible = SPORTS.slice(1).filter(s => counts[s.id] > 0);
        const all = { id: 'all', label: 'All sports', count: total };
        const rows = [all].concat(visible.map(s => ({ id: s.id, label: s.label, count: counts[s.id] })));
        return rows.map(s => {
          const on = s.id === sportFilter;
          return (
            <div key={s.id}
              onClick={() => { store.setSport(s.id); window.WS_GO && window.WS_GO('home'); }}
              style={{
                height: 30, padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontFamily: T.font, fontSize: 13,
                color: on ? T.text : T.textDim,
                background: on ? T.bg2 : 'transparent',
                borderRadius: 6, cursor: 'pointer',
              }}>
              <span>{s.label}</span>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint }}>{s.count}</span>
            </div>
          );
        });
      })()}
    </div>
  );
}

// Match card — used in grids. Treated like a mini hero so all tiles
// match the prominence of the top hero (overlay title + score + watching).
// `fill` makes the image area expand to fill its grid row height.
function MatchCard({ m, compact, onClick, fill }) {
  // Always go to player — Streamed often attaches sources between fetches,
  // and the player gracefully shows "No streams available" if there really
  // are none. This avoids the dead-end detail screen on every borderline match.
  const handleClick = onClick || (() => window.WS_GO && window.WS_GO('player', m));
  return (
    <div className="ws-card" onClick={handleClick} style={{
      background: T.bg1, border: `1px solid ${T.hairline}`,
      borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
      transition: 'border-color .15s, transform .15s',
      display: 'flex', flexDirection: 'column',
      height: fill ? '100%' : 'auto',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = T.hairlineStrong}
    onMouseLeave={e => e.currentTarget.style.borderColor = T.hairline}>
      <div style={{ position: 'relative', flex: fill ? 1 : 'none', minHeight: 0 }}>
        <div style={{
          position: 'relative', width: '100%', overflow: 'hidden',
          ...(fill ? { height: '100%' } : { aspectRatio: '16/9' }),
          background: `oklch(0.18 0.02 ${m.hue || 200})`,
        }}>
          <MatchCover m={m} fill={fill}/>
        </div>
        {/* Gradient for legibility — same as hero */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)',
          pointerEvents: 'none',
        }}/>
        {/* Top-left: LIVE / clock */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
          {m.live === true ? <div style={{
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            padding: '4px 8px', borderRadius: 4,
          }}><LiveDot/></div> : (typeof m.clock === 'string' && m.clock.length > 0 ? <div style={{
            background: 'rgba(0,0,0,0.55)', padding: '4px 8px', borderRadius: 4,
            fontFamily: T.mono, fontSize: 10, color: T.textDim,
          }}>{m.clock}</div> : null)}
        </div>
        {/* Top-right: live → viewers count, non-live → notify-me bell */}
        {m.live === true && typeof m.viewers === 'string' && m.viewers.length > 0 && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            padding: '4px 8px', borderRadius: 4,
            fontFamily: T.mono, fontSize: 10, color: T.text,
          }}>{m.viewers}</div>
        )}
        {m.live !== true && <NotifyToggle m={m}/>}
        {/* Bottom block: league + matchup + score row + Watch button — mirrors the hero */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '10px 12px 12px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{
            fontFamily: T.mono, fontSize: 9, letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase',
            textShadow: '0 1px 3px rgba(0,0,0,0.6)',
          }}>{m.league}</div>
          <div style={{
            fontFamily: T.font, fontSize: 16, fontWeight: 700, color: '#fff',
            letterSpacing: '-0.015em', lineHeight: 1.15,
            textShadow: '0 1px 4px rgba(0,0,0,0.7)',
          }}>
            {m.a}{typeof m.b === 'string' && m.b.length > 0 ? <><span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 400 }}> vs </span>{m.b}</> : null}
          </div>
          {m.live === true && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 4,
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                {typeof m.score === 'string' && m.score.length > 0 && m.score !== '—' && (
                  <span style={{
                    fontFamily: T.mono, fontSize: 14, fontWeight: 600, color: '#fff',
                    textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                  }}>{m.score}</span>
                )}
                {typeof m.clock === 'string' && m.clock.length > 0 && (
                  <span style={{
                    fontFamily: T.mono, fontSize: 11, color: 'rgba(255,255,255,0.75)',
                    textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                  }}>{m.clock}</span>
                )}
              </div>
              <button onClick={e => { e.stopPropagation(); window.WS_GO && window.WS_GO('player', m); }} style={{
                height: 26, padding: '0 10px', borderRadius: 5, border: 'none',
                background: T.live, color: '#0a1208', fontFamily: T.font,
                fontWeight: 600, fontSize: 11, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>{Icons.play} Watch</button>
            </div>
          )}
        </div>
      </div>
      {!compact && (
        <div style={{
          padding: '10px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: `1px solid ${T.hairline}`,
        }}>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center',
            fontFamily: T.mono, fontSize: 10, color: T.textDim,
          }}>
            <span style={{ color: T.live, display: 'inline-flex' }}>{Icons.signal}</span>
            {m.live === true ? <>
              <span>{m.sources || 0} source{m.sources === 1 ? '' : 's'}</span>
              <span style={{ color: T.textFaint }}>·</span>
              <span>{SERVERS[0].quality[0]}</span>
            </> : <span>Starts{typeof m.clock === 'string' && m.clock.length > 0 ? ' ' + m.clock : ''}</span>}
          </div>
          <StarToggle id={m.id}/>
        </div>
      )}
    </div>
  );
}

function StarToggle({ id, size = 14 }) {
  const store = window.useWSStore();
  const on = id ? store.isWatched(id) : false;
  return (
    <button onClick={e => { e.stopPropagation(); if (id) store.toggleWatch(id); }}
      title={on ? 'Remove from watchlist' : 'Add to watchlist'}
      style={{
        ...iconBtn, color: on ? T.live : T.textDim,
        width: size + 14, height: size + 14,
      }}>
      {on ? Icons.starFill : Icons.star}
    </button>
  );
}

// Bell pill rendered on the top-right of non-live MatchCards. Schedules a
// notification with the user's configured lead time. Disabled with a hint
// for matches that have no future start timestamp (e.g. 24/7 channels).
function NotifyToggle({ m, inline }) {
  const store = window.useWSStore();
  const startMs = m && m.raw && typeof m.raw.date === 'number' ? m.raw.date : 0;
  const canSchedule = startMs > Date.now();
  const on = m && m.id ? store.isNotifyScheduled(m.id) : false;
  if (!inline && !canSchedule && !on) return null;
  if (inline && !m) return null;
  const disabled = inline && !canSchedule && !on;
  async function handle(e) {
    e.stopPropagation();
    if (disabled) return;
    if (!m || !m.id) return;
    if (on) { store.removeNotification(m.id); return; }
    let perm = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
    if (perm !== 'granted' && window.WSNotify) {
      perm = await window.WSNotify.ensurePermission();
    }
    if (perm !== 'granted') return;
    if (!store.get().settings.notifyEnabled) store.setSetting('notifyEnabled', true);
    const res = store.addNotification(m, store.get().settings.notifyLeadMinutes);
    if (res && res.ok === false && res.reason === 'too-late' && window.WSToast) {
      const opts = pickValidLeads(res.minutesUntilStart, 4);
      if (opts.length > 0) {
        window.WSToast(
          `Game starts in ${res.minutesUntilStart} min — sooner than your ${res.leadMinutes}-min reminder window. Pick a shorter window for this match:`,
          {
            actions: opts.map(min => ({
              label: leadLabel(min),
              onAction: () => { store.addNotification(m, min); },
            })),
          }
        );
      } else {
        window.WSToast(`Game starts in ${res.minutesUntilStart} min — too soon for any reminder window.`);
      }
    }
  }
  if (inline) {
    return (
      <button onClick={handle} disabled={disabled}
        title={disabled ? 'No scheduled start time' : (on ? 'Cancel reminder' : 'Notify me before start')}
        style={{
          width: 26, height: 26, borderRadius: 5,
          background: on ? T.liveDim : 'transparent',
          color: on ? T.live : (disabled ? T.textFaint : T.textDim),
          border: on ? `1px solid ${T.live}` : `1px solid ${T.hairline}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          flexShrink: 0,
        }}>
        {Icons.bell}
      </button>
    );
  }
  return (
    <button onClick={handle}
      title={on ? 'Cancel reminder' : 'Notify me before start'}
      style={{
        position: 'absolute', top: 10, right: 10,
        height: 26, padding: '0 8px', borderRadius: 5,
        background: on ? T.liveDim : 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        color: on ? T.live : T.text,
        border: on ? `1px solid ${T.live}` : '1px solid transparent',
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontFamily: T.mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
        cursor: 'pointer',
      }}>
      {Icons.bell}
      {on ? 'ON' : null}
    </button>
  );
}

// Lead-time options (minutes before kickoff) for reminders. 0 means
// "at the start of the game". Ordered smallest → largest for display.
const NOTIFY_LEAD_OPTS = [0, 5, 10, 15, 30, 60];

function leadLabel(min) {
  return min === 0 ? 'At start' : `${min}-min`;
}

// Largest viable lead — iterates the list and keeps the last one that
// fits within the remaining window (with a 30s safety margin). Returns
// null if even the smallest option (0 = at start) is past.
function pickShorterLead(minutesUntilStart) {
  const safe = minutesUntilStart - 0.5;
  let best = null;
  for (const opt of NOTIFY_LEAD_OPTS) {
    if (opt <= safe) best = opt;
  }
  return best;
}

// All viable lead options, smallest → largest. Useful when offering
// the user a choice of shorter reminder windows.
function pickValidLeads(minutesUntilStart, max) {
  const safe = minutesUntilStart - 0.5;
  const cap = typeof max === 'number' ? max : 4;
  const out = [];
  for (const opt of NOTIFY_LEAD_OPTS) {
    if (opt <= safe) out.push(opt);
  }
  return out.slice(0, cap);
}

// Hook: tracks whether the given ref (the player container) is currently
// the document's fullscreen element. We deliberately do NOT redirect
// iframe-initiated fullscreen here — that requires async re-entry which
// browsers reject because the user-gesture chain is broken across the
// exit/enter cycle. Instead, callers should disallow fullscreen on the
// iframe (drop the `allowFullScreen` attr / `fullscreen` allow directive)
// and rely on `request()` from a real user gesture (our own button).
function useFullscreen(ref) {
  const [isFs, setIsFs] = React.useState(false);
  React.useEffect(() => {
    const onChange = () => {
      const el = document.fullscreenElement || document.webkitFullscreenElement;
      setIsFs(!!el && !!ref.current && (el === ref.current || ref.current.contains(el)));
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [ref]);
  const request = React.useCallback(() => {
    const el = ref.current; if (!el) return;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen;
    if (fn) fn.call(el);
  }, [ref]);
  const exit = React.useCallback(() => {
    const fn = document.exitFullscreen || document.webkitExitFullscreen;
    if (fn) fn.call(document);
  }, []);
  return { isFullscreen: isFs, request, exit };
}

// Hook: resolves an ESPN match for the given Streamed match (best-effort)
// and polls live stats every 30s. Returns { stats, available }. `available`
// is false until findMatch succeeds — callers should hide their stats UI
// entirely while it's false.
function useMatchStats(m) {
  const [stats, setStats] = React.useState(null);
  const [found, setFound] = React.useState(null);
  React.useEffect(() => {
    setStats(null); setFound(null);
    if (!m || !m.id || !window.STATS) return;
    let cancelled = false;
    (async () => {
      try {
        const f = await window.STATS.findMatch(m);
        if (cancelled || !f) return;
        setFound(f);
        const s = await window.STATS.fetchStats(f);
        if (cancelled) return;
        setStats(s);
      } catch (e) { /* best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [m && m.id]);
  React.useEffect(() => {
    if (!found || !window.STATS) return;
    let cancelled = false;
    const id = setInterval(async () => {
      try {
        const s = await window.STATS.fetchStats(found);
        if (!cancelled && s) setStats(s);
      } catch (e) {}
    }, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [found && found.eventId]);
  return { stats, available: !!found };
}

// Floating stats overlay rendered inside the player container. Visible only
// when `open` and stats are resolved. Glass panel docked top-right (desktop)
// / top-center (mobile) so it doesn't block the play button or controls.
function StatsOverlay({ stats, open, onClose, compact }) {
  if (!open || !stats) return null;
  const sect = (title, children) => (
    <div style={{ marginTop: 14 }}>
      <div style={{
        fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em',
        color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
        marginBottom: 8,
      }}>{title}</div>
      {children}
    </div>
  );
  const team = (t, side) => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: side === 'home' ? 'flex-start' : 'flex-end',
      flex: 1, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: side === 'home' ? 'row' : 'row-reverse' }}>
        {t.logo && <img src={t.logo} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }}/>}
        <div style={{
          fontFamily: T.font, fontSize: 13, fontWeight: 600, color: '#fff',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          maxWidth: 140,
        }}>{t.shortName || t.name}</div>
      </div>
      <div style={{
        fontFamily: T.mono, fontSize: 26, fontWeight: 700, color: '#fff',
        marginTop: 4, letterSpacing: '-0.02em',
      }}>{t.score}</div>
    </div>
  );
  return (
    <div style={{
      position: 'absolute',
      top: compact ? 'calc(env(safe-area-inset-top) + 60px)' : 16,
      right: compact ? 12 : 16,
      left: compact ? 12 : 'auto',
      width: compact ? 'auto' : 360,
      maxHeight: compact ? 'calc(100% - 120px)' : 'calc(100% - 32px)',
      background: 'rgba(8,10,14,0.78)',
      backdropFilter: 'blur(18px) saturate(160%)',
      WebkitBackdropFilter: 'blur(18px) saturate(160%)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 14, padding: 16, color: '#fff',
      zIndex: 12, overflow: 'auto',
      boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
      animation: 'ws-stats-in .25s ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {stats.status === 'live' && <LiveDot/>}
          <span style={{
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase',
          }}>{stats.period || (stats.status === 'final' ? 'Final' : stats.status === 'pre' ? 'Pre-game' : 'Live')}</span>
        </div>
        <button onClick={onClose} title="Close stats" style={{
          width: 24, height: 24, borderRadius: 6, border: 'none',
          background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {team(stats.home, 'home')}
        <div style={{ fontFamily: T.mono, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>vs</div>
        {team(stats.away, 'away')}
      </div>

      {stats.stats && stats.stats.length > 0 && sect('Box score', (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stats.stats.map((row, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr',
              gap: 10, alignItems: 'center',
              fontFamily: T.font, fontSize: 12, color: '#fff',
            }}>
              <div style={{ textAlign: 'left', fontFamily: T.mono, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>{row.home}</div>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{row.label}</div>
              <div style={{ textAlign: 'right', fontFamily: T.mono, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>{row.away}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Hook: returns true while the user has been active inside `ref` within
// the last `idleMs` ms. Mousemove/touch/click reset the timer. Used to
// auto-hide custom player controls the way the iframe's own controls do.
function usePlayerActivity(ref, idleMs) {
  const ms = typeof idleMs === 'number' ? idleMs : 4000;
  const [active, setActive] = React.useState(true);
  React.useEffect(() => {
    const el = ref && ref.current;
    if (!el) return;
    let timer;
    const bump = () => {
      setActive(true);
      clearTimeout(timer);
      timer = setTimeout(() => setActive(false), ms);
    };
    bump();
    const opts = { passive: true };
    el.addEventListener('mousemove', bump, opts);
    el.addEventListener('mousedown', bump, opts);
    el.addEventListener('touchstart', bump, opts);
    el.addEventListener('mouseenter', bump, opts);
    return () => {
      el.removeEventListener('mousemove', bump);
      el.removeEventListener('mousedown', bump);
      el.removeEventListener('touchstart', bump);
      el.removeEventListener('mouseenter', bump);
      clearTimeout(timer);
    };
  }, [ref, ms]);
  return active;
}

// Fullscreen toggle button — fullscreens the player container (not the
// iframe) so React-rendered overlays (stats etc.) stay layered on top.
// Switches to an exit icon when already fullscreen, and auto-fades on
// inactivity (driven by the `visible` prop) to mimic native player UX.
function FullscreenButton({ isFullscreen, onRequest, onExit, visible = true, compact }) {
  const handle = isFullscreen ? onExit : onRequest;
  return (
    <button onClick={handle} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} style={{
      position: 'absolute',
      bottom: compact ? 'calc(env(safe-area-inset-bottom) + 12px)' : 14,
      right: compact ? 20 : 24,
      zIndex: 11,
      width: 36, height: 36, borderRadius: 8,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      color: '#fff', border: '1px solid rgba(255,255,255,0.18)',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(6px)',
      transition: 'opacity .25s ease, transform .25s ease',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      {isFullscreen ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          {/* exit fullscreen — corner brackets pointing inward */}
          <path d="M5 2v3H2M9 2v3h3M5 12V9H2M9 12V9h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 5V2h3M12 5V2H9M2 9v3h3M12 9v3H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

// Invisible click-trap covering the bottom-right corner of the player —
// where streams almost always render their fullscreen / exit-fullscreen
// button. Clicks in this hotspot are intercepted and routed to our
// container fullscreen toggle, so reaching for the iframe's own button
// (entering OR exiting) actually toggles our overlay-friendly fullscreen.
function FullscreenClickTrap({ isFullscreen, onRequest, onExit, compact }) {
  const handle = isFullscreen ? onExit : onRequest;
  return (
    <div
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handle(); }}
      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
      title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      style={{
        position: 'absolute',
        bottom: 0, right: 0,
        width: compact ? 64 : 72, height: compact ? 56 : 60,
        zIndex: 10, // above iframe (1) and cover (2), below FullscreenButton (11)
        cursor: 'pointer',
        background: 'transparent',
      }}
    />
  );
}

// Tab-style toggle button to show the stats overlay. Hidden when stats
// aren't available so it never appears as a dead button. Also hidden once
// the overlay is open — the overlay has its own close button and the
// toggle would otherwise sit on top of it.
function StatsToggle({ available, open, onToggle, compact }) {
  if (!available || open) return null;
  return (
    <button onClick={onToggle} title={open ? 'Hide stats' : 'Show stats'} style={{
      position: 'absolute',
      top: compact ? 'calc(env(safe-area-inset-top) + 12px)' : 16,
      right: compact ? 12 : 16,
      zIndex: 13,
      height: 32, padding: '0 12px', borderRadius: 999,
      background: open ? T.live : 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      color: open ? '#0a1208' : '#fff',
      border: open ? `1px solid ${T.live}` : '1px solid rgba(255,255,255,0.18)',
      fontFamily: T.font, fontSize: 12, fontWeight: 600,
      letterSpacing: '0.04em', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <rect x="1.5" y="6" width="2" height="5.5" rx="0.6" fill="currentColor"/>
        <rect x="5.5" y="3" width="2" height="8.5" rx="0.6" fill="currentColor"/>
        <rect x="9.5" y="0.5" width="2" height="11" rx="0.6" fill="currentColor"/>
      </svg>
      {open ? 'Stats' : 'Stats'}
    </button>
  );
}

// Local-date key (YYYY-MM-DD) for a Date — used to bucket matches by day.
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

// Calendar grid: month view, 7 cols (Sun..Sat). Days with matches get a
// small dot indicator. Click a day to call onSelect(YYYY-MM-DD).
function MatchCalendar({ matches, selected, onSelect, compact }) {
  const today = new Date();
  const todayKey = dateKey(today);
  const initial = (() => {
    if (selected) {
      const [y, m] = selected.split('-').map(n => parseInt(n, 10));
      return new Date(y, m - 1, 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  })();
  const [view, setView] = React.useState(initial);

  // Bucket matches by date key — count per day so we can show 1/2/3 dots.
  const counts = React.useMemo(() => {
    const out = {};
    (matches || []).forEach(m => {
      const ts = m && m.raw && typeof m.raw.date === 'number' ? m.raw.date : 0;
      if (!ts) return;
      const k = dateKey(new Date(ts));
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  }, [matches]);

  const monthStart = new Date(view.getFullYear(), view.getMonth(), 1);
  const monthEnd = new Date(view.getFullYear(), view.getMonth() + 1, 0);
  const startWeekday = monthStart.getDay(); // 0..6, Sun
  const daysInMonth = monthEnd.getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const cellSize = compact ? 38 : 46;
  const dotSize = compact ? 3 : 4;

  const arrowBtn = {
    width: 30, height: 30, borderRadius: 8, border: 'none',
    background: 'transparent', color: T.textDim, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background .12s, color .12s',
  };

  function goToday() {
    setView(new Date(today.getFullYear(), today.getMonth(), 1));
    if (onSelect) onSelect(todayKey);
  }

  return (
    <div style={{
      background: T.bg1, border: `1px solid ${T.hairline}`,
      borderRadius: 14, padding: compact ? 12 : 16,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{
          fontFamily: T.font, fontSize: compact ? 14 : 16, fontWeight: 600,
          color: T.text, letterSpacing: '-0.01em',
        }}>{monthLabel}</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button style={arrowBtn} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
            onMouseEnter={e => { e.currentTarget.style.background = T.bg2; e.currentTarget.style.color = T.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textDim; }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button onClick={goToday} title="Jump to today" style={{
            height: 28, padding: '0 12px', borderRadius: 999,
            border: `1px solid ${T.live}`, background: 'transparent',
            color: T.live, fontFamily: T.font, fontSize: 11, fontWeight: 600,
            cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase',
            transition: 'background .12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = T.liveDim}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Today
          </button>
          <button style={arrowBtn} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
            onMouseEnter={e => { e.currentTarget.style.background = T.bg2; e.currentTarget.style.color = T.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textDim; }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{
            fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em',
            color: T.textFaint, textAlign: 'center', textTransform: 'uppercase',
            padding: '6px 0',
          }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={'e' + i} style={{ height: cellSize }}/>;
          const cellDate = new Date(view.getFullYear(), view.getMonth(), d);
          const k = dateKey(cellDate);
          const count = counts[k] || 0;
          const isSelected = selected === k;
          const isToday = k === todayKey;
          const hasEvents = count > 0;
          return (
            <div key={k} onClick={() => onSelect && onSelect(k)} style={{
              height: cellSize, position: 'relative', cursor: 'pointer',
              borderRadius: 10, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              background: isSelected ? T.live : 'transparent',
              transition: 'background .14s, transform .08s',
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.bg2; }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{
                fontFamily: T.font, fontSize: compact ? 13 : 14,
                fontWeight: isToday || isSelected ? 700 : (hasEvents ? 500 : 400),
                color: isSelected ? '#0a1208'
                  : isToday ? T.live
                  : hasEvents ? T.text
                  : T.textDim,
                lineHeight: 1,
              }}>{d}</span>
              {hasEvents && (
                <div style={{ display: 'flex', gap: 2, height: dotSize + 1, alignItems: 'center' }}>
                  {[...Array(Math.min(count, 3))].map((_, j) => (
                    <div key={j} style={{
                      width: dotSize, height: dotSize, borderRadius: '50%',
                      background: isSelected ? '#0a1208' : T.live,
                      opacity: isSelected ? 1 : 0.85,
                    }}/>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { TopNav, SideNav, MatchCard, MatchCalendar, dateKey, pickShorterLead, pickValidLeads, leadLabel, NOTIFY_LEAD_OPTS, iconBtn, StarToggle, NotifyToggle, useMatchStats, useFullscreen, usePlayerActivity, StatsOverlay, StatsToggle, FullscreenButton, FullscreenClickTrap });
