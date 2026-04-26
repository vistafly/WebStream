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
            window.WS_GO && window.WS_GO(it.id === 'recent' ? 'watchlist' : it.id);
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
    <div onClick={handleClick} style={{
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
function NotifyToggle({ m }) {
  const store = window.useWSStore();
  const startMs = m && m.raw && typeof m.raw.date === 'number' ? m.raw.date : 0;
  const canSchedule = startMs > Date.now();
  const on = m && m.id ? store.isNotifyScheduled(m.id) : false;
  if (!canSchedule && !on) return null;
  async function handle(e) {
    e.stopPropagation();
    if (!m || !m.id) return;
    if (on) { store.removeNotification(m.id); return; }
    let perm = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
    if (perm !== 'granted' && window.WSNotify) {
      perm = await window.WSNotify.ensurePermission();
    }
    if (perm !== 'granted') return;
    if (!store.get().settings.notifyEnabled) store.setSetting('notifyEnabled', true);
    store.addNotification(m, store.get().settings.notifyLeadMinutes);
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

Object.assign(window, { TopNav, SideNav, MatchCard, iconBtn, StarToggle, NotifyToggle });
