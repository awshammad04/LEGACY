import { useEffect, useMemo, useRef, useState } from 'react';
import { getMission } from '../../content/missions';
import { computeMetrics } from '../../core/evaluate';
import { MAX_WAYPOINTS, ONE_WAY_LIGHT_MINUTES, predictRoute } from '../../core/ops';
import { isTestMode, useGame, useT, useUi } from '../../game/store';
import { say, sfx } from '../../game/audio';
import { fmtNum } from '../../game/i18n';
import { Meter, Modal, ProvenanceBadge } from '../common';
import type { SpeedMode } from '../../core/types';

export function OpsHud() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const lang = useGame((s) => s.settings.lang);
  const mission = getMission(missionId);
  const n = (v: number, d = 0) => fmtNum(v, lang, d);
  const solsLeft = mission.conjunctionSol - state.ops.sol;
  return (
    <div className="hud-strip" aria-live="polite">
      <div className="hud-tile">
        <div className="lbl">{t('Sol')}</div>
        <div className="v">{n(Math.max(1, Math.floor(state.ops.sol)))}</div>
      </div>
      <div className="hud-tile">
        <div className="lbl">{t('Battery')}</div>
        <div className={`v ${state.ops.batteryWh / Math.max(1, state.ops.batteryCapWh) < 0.3 ? 'warn' : ''}`}>
          {n(state.ops.batteryWh)} / {n(state.ops.batteryCapWh)} Wh
        </div>
      </div>
      <div className="hud-tile">
        <div className="lbl">{t('Data stored')}</div>
        <div className="v">{n(state.ops.dataStoredMb)} MB</div>
      </div>
      <div className="hud-tile">
        <div className="lbl">{t('Reserve')}</div>
        <div className="v">${n(state.ops.opsReserveM)}M</div>
      </div>
      <div className="hud-tile" title={t('When Mars passes behind the Sun as seen from Earth, radio contact is disrupted for about two weeks. The date in this mission is fictional.')}>
        <div className="lbl">{t('Solar conjunction')}</div>
        <div className={`v ${solsLeft < 5 ? 'bad' : solsLeft < 10 ? 'warn' : ''}`}>{solsLeft > 0 ? t('in {n} sols', { n: Math.floor(solsLeft) }) : t('now')}</div>
      </div>
    </div>
  );
}

export function EquipmentPanel() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const lang = useGame((s) => s.settings.lang);
  const mission = getMission(missionId);
  const m = computeMetrics(mission, state.design);
  const capPct = m.batteryWh ? (state.ops.batteryCapWh / m.batteryWh) * 100 : 0;
  return (
    <div className="stack-sm" aria-labelledby="equip-title">
      <div className="row between">
        <h4 id="equip-title">{t('Equipment condition')}</h4>
        <ProvenanceBadge p="calculated" />
      </div>
      <Meter label={t('Wheel health')} value={state.ops.wheelHealth} max={100} invert display={`${fmtNum(state.ops.wheelHealth, lang)}%`} />
      <Meter label={t('Electronics health')} value={state.ops.electronicsHealth} max={100} invert display={`${fmtNum(state.ops.electronicsHealth, lang)}%`} />
      <Meter label={t('Battery capacity')} value={capPct} max={100} invert display={`${fmtNum(capPct, lang)}%`} />
      {state.ops.disabledCaps.length > 0 && <span className="tiny warn">{t('Offline systems: {list}', { list: state.ops.disabledCaps.join(', ') })}</span>}
      <span className="tiny dim">{t('Robotic mission: equipment monitoring replaces crew health.')}</span>
    </div>
  );
}

export function MessageFeed({ stages }: { stages: string[] }) {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const items = state.log.filter((l) => stages.includes(l.stage)).slice(-6).reverse();
  return (
    <div className="feed" aria-label={t('Mission Control messages')}>
      {state.flags.notes.slice(-2).map((n, i) => (
        <div key={`n${i}`} className="feed-item warn small">
          {t(n)}
        </div>
      ))}
      {items.map((l, i) => (
        <div key={i} className={`feed-item small ${l.kind === 'safety' ? 'bad' : l.kind === 'event' ? 'warn' : ''}`}>
          <strong>{t(l.title)}</strong> — {t(l.detail)}
        </div>
      ))}
    </div>
  );
}

export function EventModal() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const dispatch = useGame((s) => s.dispatch);
  const driving = useUi((s) => s.driving);
  const mission = getMission(missionId);
  const ev = mission.events.find((e) => e.id === state.pendingEvent);
  const show = !!ev && !driving;
  useEffect(() => {
    if (show && ev) {
      sfx('alert');
      say(ev.message, ev.from);
    }
  }, [show, ev]);
  if (!show || !ev) return null;
  return (
    <Modal labelledBy="ev-title">
      <div className="stack">
        <span className="eyebrow" style={{ color: 'var(--amber)' }}>
          ⚠ {t(ev.from)}
        </span>
        <h2 id="ev-title">{t(ev.title)}</h2>
        <p>{t(ev.message)}</p>
        <div className="finding small stack-sm">
          <span>
            <strong>{t('Cause')}:</strong> {t(ev.cause)}
          </span>
          <span>
            <strong>{t('Science concept')}:</strong> {t(ev.concept)}
          </span>
        </div>
        <div className="stack-sm">
          {ev.options.map((o) => {
            const disabled = ev.id === 'ev-power' && o.id === 'reserve' && state.ops.opsReserveM < 40;
            return (
              <button key={o.id} className="quiz-option" disabled={disabled} style={{ opacity: disabled ? 0.5 : 1 }} onClick={() => (sfx(o.unsafe ? 'warn' : 'confirm'), dispatch({ type: 'EVENT_CHOICE', eventId: ev.id, optionId: o.id }))}>
                <span className="stack-sm">
                  <strong>{t(o.label)}</strong>
                  <span className="small muted">{t(o.effects)}</span>
                  {disabled && <span className="small bad">{t('Not enough reserve remaining.')}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <span className="tiny dim">{t('Illustrative game outcomes — not NASA operational rules.')}</span>
      </div>
    </Modal>
  );
}

export function SurfaceScreen() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const lang = useGame((s) => s.settings.lang);
  const dispatch = useGame((s) => s.dispatch);
  const { waypoints, speed, driving, set } = useUi();
  const mission = getMission(missionId);
  const m = useMemo(() => computeMetrics(mission, state.design), [mission, state.design]);
  const pred = useMemo(() => (waypoints.length ? predictRoute(m, state.ops.pos, waypoints, speed, mission.target) : null), [m, state.ops.pos, waypoints, speed, mission.target]);
  const [uplink, setUplink] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const n = (v: number, d = 0) => fmtNum(v, lang, d);
  const distToTarget = Math.hypot(state.ops.pos[0] - mission.target[0], state.ops.pos[1] - mission.target[1]) * 4;

  useEffect(() => {
    if (state.ops.drives === 0) say({ en: 'Touchdown confirmed! Plan your route to the target rock. Remember: commands take minutes to reach Mars, so the rover drives itself between waypoints.' });
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (state.ops.arrived) say({ en: 'Arrival confirmed. The rover is beside the target rock.' });
  }, [state.ops.arrived]);

  const addToward = (fraction: number) => {
    const last = waypoints[waypoints.length - 1] ?? state.ops.pos;
    const p: [number, number] = fraction >= 1 ? [...mission.target] : [last[0] + (mission.target[0] - last[0]) * fraction, last[1] + (mission.target[1] - last[1]) * fraction];
    if (waypoints.length < MAX_WAYPOINTS) set({ waypoints: [...waypoints, p] });
  };

  const doUplink = () => {
    if (!pred || pred.blocked) return;
    sfx('uplink');
    const total = isTestMode() ? 200 : 2600;
    const start = performance.now();
    setUplink(0.001);
    timer.current = setInterval(() => {
      const p = (performance.now() - start) / total;
      if (p >= 1) {
        clearInterval(timer.current);
        setUplink(0);
        dispatch({ type: 'EXECUTE_ROUTE', waypoints, speed });
        set({ waypoints: [] });
      } else setUplink(p);
    }, 50);
  };

  const riskLabel = (r: number) => (r < 0.35 ? t('Low') : r < 1 ? t('Moderate') : t('High — a wheel slip is expected'));
  const canPlan = !state.ops.arrived && !state.pendingEvent && !driving && !uplink;

  return (
    <main className="stage-body" id="main">
      <section className="side panel panel-pad stack scroll fade-in" aria-labelledby="route-title">
        <span className="eyebrow">{t('On Mars — reach the rock')}</span>
        <h2 id="route-title">{t('Plan the drive')}</h2>
        {state.ops.arrived ? (
          <div className="stack">
            <div className="feed-item small">{t('Arrived at the target rock. Investigation can begin once Mission Control alerts are handled.')}</div>
            <button className="btn btn-primary" disabled={!!state.pendingEvent || driving} onClick={() => (sfx('confirm'), dispatch({ type: 'ADVANCE', to: 'evidence' }))}>
              {t('Begin the investigation')} →
            </button>
          </div>
        ) : (
          <>
            <p className="small muted">{t('Click or tap the terrain to place up to {n} waypoints. Clicking near the target rock snaps to it. Blue = drivable, amber = risky, red = too steep for your chassis.', { n: MAX_WAYPOINTS })}</p>
            <div className="row-wrap">
              <button className="btn btn-sm" disabled={!canPlan} onClick={() => addToward(0.35)}>
                + {t('Waypoint toward target')}
              </button>
              <button className="btn btn-sm" disabled={!canPlan} onClick={() => addToward(1)}>
                ◎ {t('Target rock')}
              </button>
              <button className="btn btn-sm btn-ghost" disabled={!waypoints.length || !canPlan} onClick={() => set({ waypoints: waypoints.slice(0, -1) })}>
                {t('Undo')}
              </button>
              <button className="btn btn-sm btn-ghost" disabled={!waypoints.length || !canPlan} onClick={() => set({ waypoints: [] })}>
                {t('Clear')}
              </button>
            </div>
            <div className="toggle" style={{ borderBottom: 0 }}>
              <span>{t('Driving mode')}</span>
              <div className="seg" role="group" aria-label={t('Driving mode')}>
                {(['cautious', 'standard', 'fast'] as SpeedMode[]).map((s) => (
                  <button key={s} aria-pressed={speed === s} onClick={() => set({ speed: s })}>
                    {t(s === 'cautious' ? 'Cautious' : s === 'standard' ? 'Standard' : 'Fast')}
                  </button>
                ))}
              </div>
            </div>
            <div className="finding stack-sm small" aria-live="polite">
              <div className="row between">
                <strong>{t('Predicted drive')}</strong>
                <ProvenanceBadge p="calculated" />
              </div>
              {pred ? (
                <>
                  <span>
                    {t('Distance')}: <span className="mono">{n(pred.distanceM)} m</span> · {t('Drive time')}: <span className="mono">{n(pred.hours, 1)} h</span>
                  </span>
                  <span>
                    {t('Energy')}: <span className="mono">{n(pred.energyWh)} Wh</span> · {t('About {s} sols', { s: n(Math.max(0.1, pred.sols), 1) })}
                  </span>
                  <span className={pred.risk >= 1 ? 'warn' : ''}>
                    {t('Mobility risk')}: {riskLabel(pred.risk)}
                  </span>
                  {pred.blocked && <span className="bad">{t('Blocked: a slope on this route is steeper than your chassis can climb ({d}°). Route around it — look for gentler ground.', { d: m.slopeLimitDeg })}</span>}
                  {!pred.endsAtTarget && !pred.blocked && <span className="dim">{t('This route does not end at the rock yet.')}</span>}
                </>
              ) : (
                <span className="dim">{t('Distance to the rock: about {d} m (map distances compressed).', { d: n(distToTarget) })}</span>
              )}
            </div>
            {uplink > 0 ? (
              <div className="stack-sm" role="status">
                <span className="small">{t('Uplinking commands… one-way light time about {m} minutes (compressed for gameplay).', { m: ONE_WAY_LIGHT_MINUTES })}</span>
                <div className="meter-track">
                  <div className="meter-fill" style={{ width: `${uplink * 100}%` }} />
                </div>
              </div>
            ) : (
              <button className="btn btn-primary" disabled={!pred || pred.blocked || !canPlan} onClick={doUplink}>
                📡 {t('Uplink drive commands')}
              </button>
            )}
            {driving && <span className="small muted">{t('Rover driving autonomously…')}</span>}
          </>
        )}
        <div className="divider" />
        <EquipmentPanel />
      </section>
      <section className="center-col">
        <span className="scene-label" style={{ position: 'static' }}>
          {t('Illustrative terrain inspired by Jezero Crater — not to scale.')}
        </span>
        <OpsHud />
      </section>
      <section className="side panel panel-pad stack scroll fade-in" style={{ width: 'min(340px, 30vw)' }} aria-labelledby="feed-title">
        <h3 id="feed-title">{t('Mission Control')}</h3>
        <MessageFeed stages={['surface', 'landingSite']} />
      </section>
      <EventModal />
    </main>
  );
}
