import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExploreSite, ObservationDef } from '../../core/types';
import { getMission } from '../../content/missions';
import { computeMetrics } from '../../core/evaluate';
import { batteryFloor, WORLD_LIMIT } from '../../core/explore';
import { downlinkCapacityMb, observationAvailability, observationDataMb, observationPowerW } from '../../core/science';
import { heightAt, TERRAIN_SIZE } from '../../core/terrain';
import { useGame, useT, useUi } from '../../game/store';
import { useLive } from '../../game/live';
import { say, sfx } from '../../game/audio';
import { fmtNum } from '../../game/i18n';
import { Modal, openLearnCard } from '../common';
import { Figure } from '../Figure';
import { EvidenceBoard } from './EvidenceScreens';
import { EquipmentPanel } from './SurfaceScreen';

const OBS_IMAGE: Record<string, string> = {
  'obs-context': 'assets/img/cheyava-falls.jpg',
  'obs-xrf': 'assets/img/pixl-mineral-map.jpg',
  'obs-cache': 'assets/img/sapphire-canyon-core.jpg',
};

function useMissionBits() {
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const mission = getMission(missionId);
  const metrics = useMemo(() => computeMetrics(mission, state.design), [mission, state.design]);
  return { state, mission, metrics };
}

/* ---------------- Objective ---------------- */

function Objective() {
  const t = useT();
  const { state, mission } = useMissionBits();
  const pending = useLive((s) => s.pendingWh);
  const did = (id: string) => state.evidence.observations.some((o) => o.id === id);
  const rockFound = state.ops.sitesFound.includes('site-rock');
  const battPct = (state.ops.batteryWh - pending) / Math.max(1, state.ops.batteryCapWh);
  let main: string;
  let sub = '';
  if (!rockFound) {
    main = t('Find the leopard-spot rock');
    sub = t('It lies in the old river valley. Follow the beacons.');
  } else if (!state.ops.arrived) {
    main = t('Drive to the Leopard-Spot Rock');
  } else if (!did('obs-xrf') && !did('obs-raman') && !did('obs-context')) {
    main = t('Investigate the rock');
    sub = t('Drive into the ring and press E.');
  } else {
    main = t('Explore more sites, or send your report');
    sub = t('Press F when you are ready to report to Earth.');
  }
  const late = state.ops.sol >= mission.conjunctionSol;
  return (
    <div className="hud-card fade-in" role="status" aria-live="polite">
      <span className="eyebrow">{t('Objective')}</span>
      <strong>{main}</strong>
      {sub && <span className="small muted">{sub}</span>}
      {battPct < 0.32 && <span className="small warn">⚡ {t('Battery low — press R to rest and recharge.')}</span>}
      {late && <span className="small bad">📡 {t('Solar conjunction has begun — send your report now. It will arrive late.')}</span>}
    </div>
  );
}

/* ---------------- Power & time ---------------- */

function PowerCard() {
  const t = useT();
  const { state, mission } = useMissionBits();
  const lang = useGame((s) => s.settings.lang);
  const dispatch = useGame((s) => s.dispatch);
  const pending = useLive((s) => s.pendingWh);
  const blocked = useLive((s) => s.blocked);
  const batt = Math.max(0, state.ops.batteryWh - pending);
  const pct = batt / Math.max(1, state.ops.batteryCapWh);
  const floor = batteryFloor(state.ops) / Math.max(1, state.ops.batteryCapWh);
  const storm = state.ops.sol < state.ops.dustUntil;
  const left = Math.max(0, Math.floor(mission.conjunctionSol - state.ops.sol));
  return (
    <div className="hud-card power-card">
      <div className="row between">
        <span className="eyebrow">{t('Battery')}</span>
        <span className="mono small">{fmtNum(pct * 100, lang)}%</span>
      </div>
      <div className="meter-track" style={{ height: 10 }} aria-label={t('Battery')}>
        <div className={`meter-fill ${pct < 0.3 ? 'bad' : pct < 0.5 ? 'warn' : 'good'}`} style={{ width: `${pct * 100}%` }} />
        <div className="meter-mark" style={{ insetInlineStart: `${floor * 100}%` }} title={t('Safety floor')} />
      </div>
      <div className="row between small">
        <span>
          {t('Sol')} <span className="mono">{fmtNum(Math.max(1, Math.floor(state.ops.sol)), lang)}</span>
        </span>
        <span className={left <= 3 ? 'bad' : left <= 6 ? 'warn' : 'muted'}>{t('{n} sols to conjunction', { n: left })}</span>
      </div>
      {storm && <span className="tiny warn">🌪 {t('Dust storm: solar power reduced')}</span>}
      {state.ops.wheelHealth < 60 && <span className="tiny warn">⚙ {t('Wheel health low: {n}%', { n: Math.round(state.ops.wheelHealth) })}</span>}
      {blocked === 'battery' && <span className="tiny bad">{t('Battery at safety floor — rest to recharge.')}</span>}
      {blocked === 'slope' && <span className="tiny warn">{t('Too steep for this chassis — find a gentler path.')}</span>}
      <button className="btn btn-sm" onClick={() => (sfx('click'), dispatch({ type: 'REST' }))} disabled={!!state.pendingEvent} title={t('Park overnight and recharge. Costs 1 sol.')}>
        🌙 {t('Rest until morning')} <span className="dim">(R)</span>
      </button>
    </div>
  );
}

/* ---------------- Minimap ---------------- */

function useTerrainImage() {
  return useMemo(() => {
    if (typeof document === 'undefined') return '';
    const N = 96;
    const c = document.createElement('canvas');
    c.width = c.height = N;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(N, N);
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const x = (i / N - 0.5) * TERRAIN_SIZE;
        const z = (j / N - 0.5) * TERRAIN_SIZE;
        const h = heightAt(x, z);
        const k = Math.max(0, Math.min(1, (h + 6) / 26));
        const o = (j * N + i) * 4;
        img.data[o] = 90 + k * 120;
        img.data[o + 1] = 45 + k * 80;
        img.data[o + 2] = 30 + k * 50;
        img.data[o + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }, []);
}

function Minimap() {
  const t = useT();
  const { state, mission } = useMissionBits();
  const pos = useLive((s) => s.pos);
  const heading = useLive((s) => s.heading);
  const bg = useTerrainImage();
  const S = 168;
  const toMap = (x: number, z: number) => [((x / TERRAIN_SIZE) + 0.5) * S, ((z / TERRAIN_SIZE) + 0.5) * S];
  const [rx, rz] = toMap(pos[0], pos[1]);
  const lim = (WORLD_LIMIT / TERRAIN_SIZE) * S;
  return (
    <div className="minimap" aria-label={t('Map')}>
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} role="img" aria-label={t('Map of the exploration area')}>
        <image href={bg} x={0} y={0} width={S} height={S} preserveAspectRatio="none" opacity={0.85} />
        <rect x={S / 2 - lim} y={S / 2 - lim} width={lim * 2} height={lim * 2} fill="none" stroke="rgba(255,255,255,.18)" strokeDasharray="3 3" />
        {(mission.sites ?? []).map((site) => {
          const [x, y] = toMap(site.pos[0], site.pos[1]);
          const found = state.ops.sitesFound.includes(site.id);
          const done = site.observations.every((id) => state.evidence.observations.some((o) => o.id === id));
          return (
            <g key={site.id}>
              <circle cx={x} cy={y} r={found ? 5 : 4} fill={done ? '#4ade80' : found ? '#5ad1ff' : '#ffd27a'} stroke="#000" strokeWidth={1} />
              {!found && (
                <text x={x} y={y + 3.5} fontSize={8} textAnchor="middle" fill="#000" fontWeight={700}>
                  ?
                </text>
              )}
            </g>
          );
        })}
        <g transform={`translate(${rx} ${rz}) rotate(${(-heading * 180) / Math.PI})`}>
          <polygon points="7,0 -5,-4.5 -3,0 -5,4.5" fill="#ffffff" stroke="#000" strokeWidth={1} />
        </g>
        <text x={S - 10} y={14} fontSize={10} fill="#fff" textAnchor="middle" opacity={0.7}>
          N
        </text>
      </svg>
    </div>
  );
}

/* ---------------- Interaction ---------------- */

function needLabel(mission: ReturnType<typeof getMission>, obs: ObservationDef, caps: string[], t: ReturnType<typeof useT>) {
  const missing = obs.requires.find((c) => !caps.includes(c));
  if (!missing) return '';
  const opt = mission.slots.flatMap((s) => s.options).find((o) => (o.capabilities ?? []).includes(missing));
  return opt ? t('Needs: {name}', { name: opt.name }) : t('Missing instrument');
}

function ActionPanel({ site, onClose }: { site: ExploreSite; onClose: () => void }) {
  const t = useT();
  const { state, mission, metrics } = useMissionBits();
  const lang = useGame((s) => s.settings.lang);
  const dispatch = useGame((s) => s.dispatch);
  const obsList = site.observations.map((id) => mission.observations.find((o) => o.id === id)!).filter(Boolean);
  const run = (o: ObservationDef) => {
    const ok = dispatch({ type: 'INVESTIGATE', siteId: site.id, observationId: o.id });
    if (ok) {
      sfx('select');
      useLive.getState().set({ scan: { siteId: site.id, at: performance.now() } });
    } else sfx('error');
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= obsList.length) run(obsList[n - 1]);
      if (e.key === 'Escape' || e.key.toLowerCase() === 'e') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className="hud-card action-panel fade-in" role="dialog" aria-label={t(site.name)}>
      <div className="row between">
        <strong>{t(site.name)}</strong>
        <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label={t('Close')}>
          ✕
        </button>
      </div>
      <div className="stack-sm">
        {obsList.map((o, i) => {
          const av = observationAvailability(mission, state, metrics, o);
          const done = !av.ok && av.reason === 'done';
          const depotLocked = o.id === 'obs-depot' && !state.evidence.observations.some((x) => x.id === 'obs-cache');
          const disabled = !av.ok || depotLocked;
          const energy = Math.round(o.hours * observationPowerW(mission, state.design, o));
          return (
            <button key={o.id} className="action-row" disabled={disabled} onClick={() => run(o)}>
              <span className="key">{i + 1}</span>
              <span className="grow stack-sm" style={{ gap: 2 }}>
                <span>{t(o.name)}</span>
                <span className="tiny dim">
                  {done
                    ? `✓ ${t('Done')}`
                    : !av.ok && av.reason === 'missing-instrument'
                      ? `🔒 ${needLabel(mission, o, metrics.capabilities, t)}`
                      : !av.ok && av.reason === 'disabled'
                        ? t('Offline after an earlier decision.')
                        : depotLocked
                          ? t('First core a sample at the rock.')
                          : `⚡ ${fmtNum(energy, lang)} Wh · ⏱ ${fmtNum(o.hours, lang, 1)} h · 💾 ${fmtNum(observationDataMb(mission, state.design, o), lang)} MB`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FindingToast() {
  const t = useT();
  const { state, mission } = useMissionBits();
  const [shown, setShown] = useState<{ id: string; text: string; img?: string; at: number } | null>(null);
  const count = useRef(state.evidence.observations.length);
  const logLen = useRef(state.log.length);
  useEffect(() => {
    const obs = state.evidence.observations;
    if (obs.length > count.current) {
      const last = obs[obs.length - 1];
      const def = mission.observations.find((o) => o.id === last.id);
      if (def) {
        const text = t(last.quality === 'low' && def.findingLow ? def.findingLow : def.finding);
        setShown({ id: last.id, text, img: last.quality !== 'low' ? OBS_IMAGE[last.id] : undefined, at: Date.now() });
        say(last.quality === 'low' && def.findingLow ? def.findingLow : def.finding, { en: 'Science Team' });
      }
    } else if (state.log.length > logLen.current) {
      const entry = state.log[state.log.length - 1];
      if (entry.title.en.startsWith('Discovered')) {
        sfx('success');
        setShown({ id: 'disc', text: t(entry.title), at: Date.now() });
      }
    }
    count.current = obs.length;
    logLen.current = state.log.length;
  }, [state.evidence.observations, state.log, mission, t]);
  useEffect(() => {
    if (!shown) return;
    const id = setTimeout(() => setShown(null), shown.img ? 9000 : 6000);
    return () => clearTimeout(id);
  }, [shown]);
  if (!shown) return null;
  return (
    <div className="hud-card finding-toast fade-in" role="status">
      {shown.img && <Figure file={shown.img} alt={t('Real NASA Perseverance image for comparison.')} maxHeight={120} />}
      <span className="small">{shown.text}</span>
      {shown.img && <span className="tiny dim">{t('Real NASA image for comparison — your mission is a simulation.')}</span>}
    </div>
  );
}

/* ---------------- Events & alerts (compact, in-world) ---------------- */

function EventCard() {
  const t = useT();
  const { state, mission } = useMissionBits();
  const dispatch = useGame((s) => s.dispatch);
  const ev = mission.events.find((e) => e.id === state.pendingEvent);
  useEffect(() => {
    if (!ev) return;
    sfx('alert');
    say(ev.message, ev.from);
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      const opt = ev.options[n - 1];
      if (opt && !(ev.id === 'ev-power' && opt.id === 'reserve' && state.ops.opsReserveM < 40)) dispatch({ type: 'EVENT_CHOICE', eventId: ev.id, optionId: opt.id });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ev, dispatch, state.ops.opsReserveM]);
  if (!ev) return null;
  return (
    <div className="hud-card event-card fade-in" role="alertdialog" aria-labelledby="ev-t">
      <span className="eyebrow" style={{ color: 'var(--amber)' }}>
        ⚠ {t(ev.from)}
      </span>
      <strong id="ev-t">{t(ev.title)}</strong>
      <span className="small">{t(ev.message)}</span>
      <details className="tiny dim">
        <summary>{t('Why?')}</summary>
        {t(ev.cause)} {t(ev.concept)}
      </details>
      <div className="stack-sm">
        {ev.options.map((o, i) => {
          const disabled = ev.id === 'ev-power' && o.id === 'reserve' && state.ops.opsReserveM < 40;
          return (
            <button key={o.id} className="action-row" disabled={disabled} onClick={() => (sfx(o.unsafe ? 'warn' : 'confirm'), dispatch({ type: 'EVENT_CHOICE', eventId: ev.id, optionId: o.id }))}>
              <span className="key">{i + 1}</span>
              <span className="grow stack-sm" style={{ gap: 2 }}>
                <span>{t(o.label)}</span>
                <span className="tiny dim">{t(o.effects)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AlertCard() {
  const t = useT();
  const { state } = useMissionBits();
  const dispatch = useGame((s) => s.dispatch);
  const [note, setNote] = useState<string | null>(null);
  const need = state.evidence.alertShown && !state.evidence.alertChoice;
  const choose = (c: 'announce' | 'gather' | 'cautious') => {
    dispatch({ type: 'ALERT_CHOICE', choice: c });
    if (c === 'announce') {
      sfx('warn');
      setNote(t('Mission Control: "Hold on — this is a potential biosignature, not proof. Non-biological chemistry can make similar minerals." Your choice is recorded.'));
    } else {
      sfx('confirm');
      say(c === 'gather' ? { en: 'Agreed. Independent measurements make the case stronger.' } : { en: 'Good call. Careful scientists report what the data can and cannot show.' });
    }
  };
  useEffect(() => {
    if (!need) return;
    sfx('alert');
    say({ en: 'Possible biosignature? Further investigation required.' }, { en: 'Science Team' });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '1') choose('announce');
      if (e.key === '2') choose('gather');
      if (e.key === '3') choose('cautious');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [need]);
  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), 9000);
    return () => clearTimeout(id);
  }, [note]);
  if (note) return <div className="hud-card event-card fade-in small" role="status">{note}</div>;
  if (!need) return null;
  return (
    <div className="hud-card event-card fade-in" role="alertdialog" aria-labelledby="al-t">
      <span className="eyebrow" style={{ color: 'var(--amber)' }}>
        ⚠ {t('Science Team')}
      </span>
      <strong id="al-t">{t('Possible biosignature? Further investigation required.')}</strong>
      {(
        [
          ['announce', 'Announce a discovery of life now'],
          ['gather', 'Gather more independent measurements'],
          ['cautious', 'Keep a cautious interpretation with alternatives'],
        ] as const
      ).map(([c, label], i) => (
        <button key={c} className="action-row" onClick={() => choose(c)}>
          <span className="key">{i + 1}</span>
          <span className="grow">{t(label)}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- Report ---------------- */

function ReportCard({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { state, mission, metrics } = useMissionBits();
  const lang = useGame((s) => s.settings.lang);
  const dispatch = useGame((s) => s.dispatch);
  const cap = downlinkCapacityMb(mission, state, metrics);
  const total = state.evidence.observations.reduce((a, r) => a + observationDataMb(mission, state.design, mission.observations.find((o) => o.id === r.id)!), 0);
  const options: { id: 'proven' | 'potential' | 'untested' | 'nothing'; label: string }[] = [
    { id: 'proven', label: 'We found life on Mars!' },
    { id: 'potential', label: 'A potential biosignature — more tests are needed, and non-biological causes are still possible.' },
    { id: 'untested', label: 'An intriguing rock, but we could not test it properly — more evidence is needed.' },
    { id: 'nothing', label: 'Nothing important here.' },
  ];
  const send = (c: (typeof options)[number]['id']) => {
    sfx('success');
    dispatch({ type: 'SEND_REPORT', conclusion: c });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) send(options[n - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <Modal onClose={onClose} labelledBy="rep-t">
      <div className="stack">
        <span className="eyebrow">{t('Report to Earth')}</span>
        <h2 id="rep-t">{t('What will you tell scientists on Earth?')}</h2>
        <p className="small muted">
          {t('Your antenna can send about {cap} MB before conjunction. You collected {total} MB — the most valuable data goes first.', { cap: fmtNum(cap, lang), total: fmtNum(total, lang) })}
        </p>
        {options.map((o, i) => (
          <button key={o.id} className="action-row" onClick={() => send(o.id)}>
            <span className="key">{i + 1}</span>
            <span className="grow">{t(o.label)}</span>
          </button>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ alignSelf: 'flex-start' }}>
          {t('Keep exploring')}
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- Journal ---------------- */

function Journal({ onClose, onReport }: { onClose: () => void; onReport: () => void }) {
  const t = useT();
  const { state, mission } = useMissionBits();
  const done = [...state.evidence.observations].reverse();
  return (
    <Modal onClose={onClose} labelledBy="jr-t" wide>
      <div className="modal-head">
        <div className="stack-sm">
          <span className="eyebrow">{t('Mission journal')}</span>
          <h2 id="jr-t">{t(mission.title)}</h2>
        </div>
        <button className="btn btn-ghost icon-btn" onClick={onClose} aria-label={t('Close')}>
          ✕
        </button>
      </div>
      <div className="home-lower" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
        <div className="stack">
          <EvidenceBoard />
          <div className="divider" />
          <EquipmentPanel />
          <div className="divider" />
          <h4>{t('Controls')}</h4>
          <p className="small muted">{t('W A S D or arrow keys: drive · Shift: faster (more wear and energy) · Space: brake · Drag: look around · Scroll: zoom · E: investigate · R: rest · F: report · J: journal')}</p>
          <p className="tiny dim">{t('Gameplay simplification: real Mars rovers cannot be driven live from Earth — commands take many minutes to arrive, so rovers drive themselves between commands.')}</p>
        </div>
        <div className="stack">
          <h3>{t('Findings')}</h3>
          {done.length === 0 && <p className="small dim">{t('No measurements yet. Drive up to a site and press E.')}</p>}
          {done.map((r) => {
            const o = mission.observations.find((x) => x.id === r.id)!;
            const site = mission.sites?.find((x) => x.id === r.site);
            return (
              <div key={r.id} className="finding stack-sm">
                <div className="row between">
                  <strong className="small">{t(o.name)}</strong>
                  <span className="pill">{site ? t(site.name) : ''}</span>
                </div>
                <p className="small">{t(r.quality === 'low' && o.findingLow ? o.findingLow : o.finding)}</p>
                {o.learnCardId && (
                  <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => openLearnCard(mission.learnCards.find((c) => c.id === o.learnCardId))}>
                    ⓘ {t('Real instrument behind it')}
                  </button>
                )}
              </div>
            );
          })}
          <button className="btn btn-primary" disabled={state.evidence.observations.length === 0} onClick={onReport}>
            📡 {t('Send report to Earth')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Touch controls & hints ---------------- */

function TouchControls() {
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  if (!coarse) return null;
  const hold = (k: 'fwd' | 'back' | 'left' | 'right' | 'boost', v: boolean) => useLive.getState().set({ touch: { ...useLive.getState().touch, [k]: v } });
  const B = ({ k, label }: { k: 'fwd' | 'back' | 'left' | 'right' | 'boost'; label: string }) => (
    <button className="touch-btn" onPointerDown={() => hold(k, true)} onPointerUp={() => hold(k, false)} onPointerLeave={() => hold(k, false)} aria-label={k}>
      {label}
    </button>
  );
  return (
    <div className="touch-pad">
      <div />
      <B k="fwd" label="▲" />
      <div />
      <B k="left" label="◀" />
      <B k="boost" label="⚡" />
      <B k="right" label="▶" />
      <div />
      <B k="back" label="▼" />
      <div />
    </div>
  );
}

function ControlsHint() {
  const t = useT();
  const moved = useLive((s) => s.moved);
  if (moved) return null;
  return (
    <div className="hud-card controls-hint fade-in">
      <div className="keys">
        <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd>
      </div>
      <span className="small">{t('Drive with W A S D or the arrow keys. Drag to look around, scroll to zoom.')}</span>
    </div>
  );
}

/* ---------------- HUD root ---------------- */

export function ExploreHud() {
  const t = useT();
  const { state, mission } = useMissionBits();
  const dispatch = useGame((s) => s.dispatch);
  const panel = useLive((s) => s.panel);
  const nearSiteId = useLive((s) => s.nearSiteId);
  const setLive = useLive((s) => s.set);
  const nearSite = mission.sites?.find((s) => s.id === nearSiteId);
  const busy = !!state.pendingEvent || (state.evidence.alertShown && !state.evidence.alertChoice);
  const canReport = state.evidence.observations.length > 0;

  useEffect(() => {
    say({ en: 'Touchdown confirmed! The rover is yours, Commander. Find the leopard-spot rock — and explore anything that looks interesting.' });
    useUi.getState().set({ waypoints: [] });
    document.documentElement.classList.add('exploring');
    return () => {
      setLive({ panel: 'none' });
      document.documentElement.classList.remove('exploring');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useUi.getState().settingsOpen || useUi.getState().learnCard) return;
      const k = e.key.toLowerCase();
      const cur = useLive.getState().panel;
      if (k === 'escape' && cur !== 'none') setLive({ panel: 'none' });
      if (busy) return;
      if (k === 'e' && cur === 'none' && useLive.getState().nearSiteId) setLive({ panel: 'actions' });
      if (k === 'j') setLive({ panel: cur === 'journal' ? 'none' : 'journal' });
      if (k === 'f' && canReport && cur === 'none') setLive({ panel: 'report' });
      if (k === 'r' && cur === 'none') {
        sfx('click');
        dispatch({ type: 'REST' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, canReport, dispatch, setLive]);

  // Close the action panel when driving away from the site.
  useEffect(() => {
    if (panel === 'actions' && !nearSite) setLive({ panel: 'none' });
  }, [panel, nearSite, setLive]);

  return (
    <main className="explore-hud" id="main">
      <div className="hud-tl">
        <Objective />
      </div>
      <div className="hud-tr">
        <PowerCard />
        <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-sm" onClick={() => setLive({ panel: 'journal' })}>
            📓 {t('Journal')} <span className="dim">(J)</span>
          </button>
          <button className="btn btn-sm btn-primary" disabled={!canReport || busy} onClick={() => setLive({ panel: 'report' })}>
            📡 {t('Report')} <span className="dim">(F)</span>
          </button>
        </div>
      </div>
      <div className="hud-top-center">
        <EventCard />
        <AlertCard />
        {!busy && <FindingToast />}
      </div>
      <div className="hud-bottom-center">
        {panel === 'actions' && nearSite && !busy ? (
          <ActionPanel site={nearSite} onClose={() => setLive({ panel: 'none' })} />
        ) : nearSite && !busy ? (
          <button className="hud-card prompt fade-in" onClick={() => setLive({ panel: 'actions' })}>
            <kbd>E</kbd> {t('Investigate {site}', { site: nearSite.name })}
          </button>
        ) : (
          <ControlsHint />
        )}
      </div>
      <div className="hud-br">
        <Minimap />
      </div>
      <TouchControls />
      {panel === 'journal' && <Journal onClose={() => setLive({ panel: 'none' })} onReport={() => setLive({ panel: 'report' })} />}
      {panel === 'report' && <ReportCard onClose={() => setLive({ panel: 'none' })} />}
      <span className="scene-label explore-note">{t('Illustrative terrain inspired by Jezero Crater — not to scale.')}</span>
    </main>
  );
}

