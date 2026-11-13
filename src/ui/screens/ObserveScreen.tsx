import { useEffect, useMemo, useRef, useState } from 'react';
import { getMission } from '../../content/missions';
import { computeMetrics } from '../../core/evaluate';
import { sciencePoints } from '../../core/science';
import { useGame, useT } from '../../game/store';
import { say, sfx } from '../../game/audio';
import { Modal } from '../common';
import { EventCard } from './ExploreHud';

type Filter = 'visible' | 'uv' | 'infrared';
const FILTER_COLOR: Record<Filter, string> = { visible: '#fff6dc', uv: '#a78bfa', infrared: '#ff8a5c' };

/** Procedural spiral galaxy (simulated view inspired by M101) with the supernova point. */
function TelescopeView({ brightness, pointed, filter }: { brightness: number; pointed: boolean; filter: Filter }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const W = c.width;
    const H = c.height;
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, W, H);
    // background stars
    for (let i = 0; i < 160; i++) {
      const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const y = (Math.sin(i * 78.233) * 12345.678) % 1;
      ctx.fillStyle = `rgba(255,255,255,${0.2 + ((i * 37) % 10) / 20})`;
      ctx.fillRect(Math.abs(x) * W, Math.abs(y) * H, 1.2, 1.2);
    }
    if (!pointed) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('…', W / 2, H / 2);
      return;
    }
    const cx = W / 2;
    const cy = H / 2;
    const tint = filter === 'uv' ? [170, 150, 255] : filter === 'infrared' ? [255, 150, 110] : [255, 240, 220];
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70);
    glow.addColorStop(0, `rgba(${tint.join(',')},0.55)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 70, 0, Math.PI * 2);
    ctx.fill();
    for (let arm = 0; arm < 4; arm++) {
      for (let k = 0; k < 420; k++) {
        const tt = k / 420;
        const ang = arm * (Math.PI / 2) + tt * 4.2;
        const r = 10 + tt * 120;
        const jitter = (Math.sin(k * 91.7 + arm * 13) * 0.5 + 0.5) * 9;
        const x = cx + Math.cos(ang) * (r + jitter);
        const y = cy + Math.sin(ang) * (r + jitter) * 0.82;
        ctx.fillStyle = `rgba(${tint.join(',')},${0.35 * (1 - tt) + 0.05})`;
        ctx.fillRect(x, y, 1.6, 1.6);
      }
    }
    // supernova in a spiral arm
    const sx = cx + 62;
    const sy = cy - 38;
    const size = 3 + brightness * 7;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 3);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, `rgba(${tint.join(',')},0.9)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, size * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5ad1ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, size * 3 + 8, 0, Math.PI * 2);
    ctx.stroke();
  }, [brightness, pointed, filter]);
  return <canvas ref={ref} width={420} height={300} className="scope-canvas" aria-label="Simulated telescope view" />;
}

function LightCurve({ points, nights }: { points: { night: number; value: number; filter: Filter }[]; nights: number }) {
  const W = 300;
  const H = 120;
  const x = (n: number) => 30 + ((n - 1) / Math.max(1, nights - 1)) * (W - 50);
  const y = (v: number) => H - 20 - v * (H - 40);
  const vis = points.filter((p) => p.filter === 'visible').sort((a, b) => a.night - b.night);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Light curve">
      <line x1={30} y1={H - 20} x2={W - 10} y2={H - 20} stroke="rgba(255,255,255,.25)" />
      <line x1={30} y1={10} x2={30} y2={H - 20} stroke="rgba(255,255,255,.25)" />
      {Array.from({ length: nights }, (_, i) => (
        <text key={i} x={x(i + 1)} y={H - 6} fontSize={10} fill="#a9b6d3" textAnchor="middle">
          {i + 1}
        </text>
      ))}
      {vis.length > 1 && <polyline points={vis.map((p) => `${x(p.night)},${y(p.value)}`).join(' ')} fill="none" stroke="#fff6dc" strokeWidth={2} />}
      {points.map((p, i) => (
        <circle key={i} cx={x(p.night) + (p.filter === 'uv' ? 6 : p.filter === 'infrared' ? -6 : 0)} cy={y(p.value)} r={4.5} fill={FILTER_COLOR[p.filter]} />
      ))}
    </svg>
  );
}

export function ObserveScreen() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const dispatch = useGame((s) => s.dispatch);
  const mission = getMission(missionId);
  const tel = mission.telescope!;
  const scope = state.scope!;
  const m = useMemo(() => computeMetrics(mission, state.design), [mission, state.design]);
  const [filter, setFilter] = useState<Filter>('visible');
  const [exposure, setExposure] = useState(0.5);
  const [report, setReport] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const has = (cap: string) => m.capabilities.includes(cap);
  const brightness = tel.brightness[Math.min(tel.brightness.length - 1, scope.night - 1)];
  const busy = !!state.pendingEvent;
  const last = scope.images[scope.images.length - 1];

  useEffect(() => {
    say({ en: 'Alert! A new supernova has been spotted in the Pinwheel Galaxy. Point your telescope and watch it over three nights.' });
  }, []);
  useEffect(() => {
    if (!last) return;
    const def = mission.observations.find((o) => o.id === `obs-n${last.night}`);
    setNote(`${t('Night {n}: {q} image', { n: last.night, q: t(last.quality) })} — ${def ? t(def.finding) : ''}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.images.length]);
  useEffect(() => {
    if (scope.spectrum) {
      const def = mission.observations.find((o) => o.id === 'obs-spectrum');
      if (def) setNote(t(def.finding));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.spectrum]);

  const points = scope.images.map((im) => ({ night: im.night, filter: im.filter, value: Math.min(1, tel.brightness[im.night - 1] * (im.quality === 'low' ? 0.85 : 1)) }));
  const go = (a: Parameters<typeof dispatch>[0]) => {
    const ok = dispatch(a);
    sfx(ok ? 'select' : 'error');
  };
  const nightsDone = new Set(scope.images.map((i) => i.night)).size;

  return (
    <main className="stage-body" id="main">
      <section className="side side-wide panel panel-pad stack scroll fade-in" aria-labelledby="obs-title">
        <span className="eyebrow">{t('Your observatory · in orbit')}</span>
        <h2 id="obs-title">{t('Catch the supernova')}</h2>
        <TelescopeView brightness={brightness} pointed={scope.pointed} filter={filter} />
        <span className="tiny dim">{t('Simulated view inspired by supernova SN 2023ixf in the Pinwheel Galaxy (M101), observed by NASA telescopes in 2023.')}</span>
        <h4>{t('Light curve (brightness each night)')}</h4>
        <LightCurve points={points} nights={tel.nights} />
        {note && <div className="feed-item small fade-in">{note}</div>}
      </section>
      <section className="center-col" />
      <section className="side panel panel-pad stack scroll fade-in" aria-label={t('Telescope controls')}>
        <div className="row between">
          <strong>
            🌙 {t('Night {n} of {total}', { n: scope.night, total: tel.nights })}
          </strong>
          <span className="small muted">⭐ {sciencePoints(state)} {t('science')}</span>
        </div>
        <div className="meter-track" style={{ height: 8 }} aria-label={t('Observing time left tonight')}>
          <div className="meter-fill" style={{ width: `${(scope.hoursLeft / tel.hoursPerNight) * 100}%` }} />
        </div>
        <span className="tiny muted">{t('{h} hours of observing time left tonight', { h: Math.round(scope.hoursLeft * 10) / 10 })}</span>

        <button className="btn btn-primary" disabled={scope.pointed || busy} onClick={() => go({ type: 'SCOPE_POINT' })}>
          🎯 {scope.pointed ? t('Pointed at the galaxy ✓') : t('Point at the Pinwheel Galaxy')}
        </button>

        <span className="small">{t('1. Choose light')}</span>
        <div className="seg" role="group" aria-label={t('Filter')}>
          {(['visible', 'uv', 'infrared'] as Filter[]).map((f) => {
            const ok = has(f === 'visible' ? 'visible' : f === 'uv' ? 'uv' : 'infrared');
            return (
              <button key={f} aria-pressed={filter === f} disabled={!ok} onClick={() => setFilter(f)} title={ok ? '' : t('Your sensor cannot see this light')}>
                {ok ? '' : '🔒 '}
                {t(f === 'visible' ? 'Visible' : f === 'uv' ? 'Ultraviolet' : 'Infrared')}
              </button>
            );
          })}
        </div>
        <span className="small">{t('2. Choose exposure')}</span>
        <div className="seg" role="group" aria-label={t('Exposure')}>
          {[0.25, 0.5, 1].map((e) => (
            <button key={e} aria-pressed={exposure === e} onClick={() => setExposure(e)}>
              {e === 0.25 ? t('15 min') : e === 0.5 ? t('30 min') : t('1 hour')}
            </button>
          ))}
        </div>
        <span className="tiny dim">{t('Longer exposures collect more light but use more time — and need steady pointing.')}</span>
        <button className="btn btn-primary" disabled={!scope.pointed || busy || scope.hoursLeft < exposure} onClick={() => go({ type: 'SCOPE_IMAGE', filter, exposure })}>
          📸 {t('3. Take image')}
        </button>
        {has('spectrum') && (
          <button className="btn" disabled={!scope.pointed || busy || !!scope.spectrum || scope.hoursLeft < 1.5} onClick={() => go({ type: 'SCOPE_SPECTRUM' })}>
            🌈 {scope.spectrum ? t('Spectrum taken ✓') : t('Take a spectrum (1.5 h)')}
          </button>
        )}
        <div className="divider" />
        <div className="row-wrap">
          <button className="btn" disabled={scope.night >= tel.nights || busy} onClick={() => (sfx('click'), dispatch({ type: 'SCOPE_NEXT_NIGHT' }))}>
            ⏭ {t('Next night')}
          </button>
          <button className="btn btn-primary" disabled={scope.images.length === 0 || busy} onClick={() => setReport(true)}>
            📡 {t('Send results')}
          </button>
        </div>
        <span className="tiny muted">{t('Nights observed: {n} of {total}', { n: nightsDone, total: tel.nights })}</span>
      </section>
      <div className="hud-top-center" style={{ top: 70 }}>
        <EventCard />
      </div>
      {report && (
        <Modal onClose={() => setReport(false)} labelledBy="rep-t">
          <div className="stack">
            <span className="eyebrow">{t('Report to Earth')}</span>
            <h2 id="rep-t">{t('What did you learn about the supernova?')}</h2>
            {(
              [
                ['summary', 'A supernova whose brightness changed over the nights — more observations would tell us more.'],
                ['proven', 'One image tells us everything about this supernova.'],
                ['nothing', 'Nothing changed — not worth more telescope time.'],
              ] as const
            ).map(([c, label], i) => (
              <button key={c} className="action-row" onClick={() => (sfx('success'), dispatch({ type: 'SEND_REPORT', conclusion: c }))}>
                <span className="key">{i + 1}</span>
                <span className="grow">{t(label)}</span>
              </button>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setReport(false)}>
              {t('Keep observing')}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
