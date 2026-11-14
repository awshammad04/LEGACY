import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExploreSite, MissionEventDef, ObservationDef } from '../../core/types';
import { getMission } from '../../content/missions';
import { computeMetrics } from '../../core/evaluate';
import { batteryFloor, hasBuggy, WORLD_LIMIT } from '../../core/explore';
import { downlinkCapacityMb, observationAvailability, observationDataMb, observationPowerW, pointsFor, sciencePoints } from '../../core/science';
import { heightAt, TERRAIN_SIZE } from '../../core/terrain';
import { useGame, useT, useUi } from '../../game/store';
import { useLive } from '../../game/live';
import { say, sfx } from '../../game/audio';
import { fmtNum } from '../../game/i18n';
import { Modal, openLearnCard } from '../common';
import { Figure } from '../Figure';
import { EvidenceBoard } from './EvidenceScreens';
import { EquipmentPanel } from './SurfaceScreen';
import { CrewPanel, StatusChip } from '../CrewPanel';
import { SiteStories, hasStory, replayStory } from './StoryCard';
import type { MissionState, MissionDefinition as MDef, Objective as Obj } from '../../core/types';

function objectiveDone(o: Obj, state: MissionState, mission: MDef) {
  const did = (id: string) => state.evidence.observations.some((x) => x.id === id);
  if (o.done.arrive) {
    const site = mission.sites?.find((x) => x.id === o.done.arrive);
    const main = site && (site.kind === 'rock' || site.kind === 'heritage');
    return state.ops.sitesFound.includes(o.done.arrive) && (!main || state.ops.arrived);
  }
  if (o.done.anyObs) return o.done.anyObs.some(did);
  if (o.done.allObs) return o.done.allObs.every(did);
  return false;
}

function useKeepOut() {
  const { mission } = useMissionBits();
  const pos = useLive((s) => s.pos);
  const ko = mission.world?.keepOut;
  if (!ko) return false;
  const site = mission.sites?.find((x) => x.id === ko.siteId);
  return !!site && Math.hypot(site.pos[0] - pos[0], site.pos[1] - pos[1]) < ko.radius;
}

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
  const tests = ['obs-context', 'obs-xrf', 'obs-raman'].filter(did).length;
  const tested = did('obs-xrf') || did('obs-raman');
  const custom = mission.objectives;
  const steps = custom
    ? [
        ...custom.map((o) => ({ done: objectiveDone(o, state, mission), label: t(o.label), hint: t(o.hint) })),
        { done: false, label: t('Report to Earth'), hint: t('Press F when you are ready.') },
      ].slice(0, 3)
    : [
        { done: state.ops.arrived, label: t('Find the leopard-spot rock'), hint: rockFound ? t('Drive into the glowing ring.') : t('Follow the yellow beacon into the old river valley.') },
        { done: tested, label: t('Test the rock'), hint: state.ops.arrived ? t('Press E — photograph it, then test its chemistry.') : '' },
        { done: false, label: t('Report to Earth'), hint: tested ? t('Press F when you are ready.') : '' },
      ];
  const inKeepOut = useKeepOut();
  const crewed = mission.type === 'crewed';
  const current = steps.findIndex((s) => !s.done);
  const late = mission.conjunctionSol > 0 && state.ops.sol >= mission.conjunctionSol;
  const sites = mission.sites?.length ?? 0;
  return (
    <div className="hud-card fade-in" role="status" aria-live="polite">
      <span className="eyebrow">{t('Mission')}</span>
      <ol className="checklist">
        {steps.map((s, i) => (
          <li key={i} className={s.done ? 'done' : i === current ? 'current' : ''}>
            <span className="tick" aria-hidden>
              {s.done ? '✓' : i + 1}
            </span>
            <span className="stack-sm" style={{ gap: 0 }}>
              <span>{s.label}</span>
              {i === current && s.hint && <span className="tiny muted">{s.hint}</span>}
            </span>
          </li>
        ))}
      </ol>
      <div className="row between small">
        <span title={t('Science points from everything you have measured')}>
          ⭐ <strong className="mono">{sciencePoints(state)}</strong> {t('science')}
        </span>
        <span className="muted">
          🗺 {state.ops.sitesFound.length}/{sites} {t('sites')}
          {mission.id === 'm2-martian-mystery' ? ` · 🧪 ${tests}/3` : ` · 📷 ${state.evidence.observations.length}`}
        </span>
      </div>
      {!crewed && battPct < 0.32 && <span className="small warn">⚡ {t('Battery low — press R to rest and recharge.')}</span>}
      {crewed && state.ops.oxygenH < 1.5 && <span className="small bad">🫁 {t('Suit oxygen low — head back to the lander!')}</span>}
      {inKeepOut && <span className="small bad">⛔ {t('You are inside the protected zone — back out now!')}</span>}
      {late && <span className="small bad">📡 {crewed ? t('Your stay is over — send your summary and return to orbit.') : t('Solar conjunction has begun — send your report now. It will arrive late.')}</span>}
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

function OxygenCard() {
  const t = useT();
  const { state, mission } = useMissionBits();
  const lang = useGame((s) => s.settings.lang);
  const dispatch = useGame((s) => s.dispatch);
  const pos = useLive((s) => s.pos);
  const setLive = useLive((s) => s.set);
  const pct = Math.max(0, state.ops.oxygenH) / Math.max(1, state.ops.evaMaxH);
  const lander = mission.sites?.find((x) => x.kind === 'lander');
  const atLander = !!lander && Math.hypot(lander.pos[0] - pos[0], lander.pos[1] - pos[1]) <= lander.radius + 8;
  const left = Math.max(0, Math.ceil(mission.conjunctionSol - state.ops.sol));
  return (
    <div className="hud-card power-card">
      <div className="row between">
        <span className="eyebrow">🫁 {t('Suit oxygen')}</span>
        <span className="mono small">
          {fmtNum(Math.max(0, state.ops.oxygenH), lang, 1)} h
        </span>
      </div>
      <div className="meter-track" style={{ height: 10 }} aria-label={t('Suit oxygen')}>
        <div className={`meter-fill ${pct < 0.25 ? 'bad' : pct < 0.5 ? 'warn' : 'good'}`} style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="row between small">
        <span>
          {t('Day')} <span className="mono">{fmtNum(Math.max(1, Math.floor(state.ops.sol)), lang)}</span>
        </span>
        <span className={left <= 1 ? 'bad' : 'muted'}>{t('{n} days left on the Moon', { n: left })}</span>
      </div>
      {state.crew && (
        <button className="btn btn-sm btn-ghost" style={{ justifyContent: 'space-between' }} onClick={() => setLive({ panel: 'journal' })}>
          <span>🩺 {t('Crew')}</span>
          <StatusChip v={state.crew.vitals} />
        </button>
      )}
      <button className="btn btn-sm" onClick={() => (sfx('click'), dispatch({ type: 'REST' }))} disabled={!atLander || !!state.pendingEvent} title={t('Only at the lander: end the moonwalk, rest and refill suits. Costs 1 day.')}>
        🛖 {atLander ? t('End moonwalk & rest') : t('Rest only at the lander')} <span className="dim">(R)</span>
      </button>
    </div>
  );
}

/* ---------------- Minimap ---------------- */

function useTerrainImage(moon = false) {
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
        if (moon) {
          img.data[o] = img.data[o + 1] = img.data[o + 2] = 70 + k * 120;
        } else {
          img.data[o] = 90 + k * 120;
          img.data[o + 1] = 45 + k * 80;
          img.data[o + 2] = 30 + k * 50;
        }
        img.data[o + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }, [moon]);
}

function Minimap() {
  const t = useT();
  const { state, mission } = useMissionBits();
  const pos = useLive((s) => s.pos);
  const heading = useLive((s) => s.heading);
  const buggyAt = useGame((s) => (s.state?.ops.onFoot ? s.state.ops.buggyPos : undefined));
  const bg = useTerrainImage(mission.world?.theme === 'moon');
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
        {buggyAt && (
          <rect x={toMap(buggyAt[0], buggyAt[1])[0] - 4} y={toMap(buggyAt[0], buggyAt[1])[1] - 3} width={8} height={6} rx={1.5} fill="#ffd166" stroke="#000" strokeWidth={1}>
            <title>{t('Parked lunar rover')}</title>
          </rect>
        )}
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
  const [shown, setShown] = useState<{ id: string; text: string; img?: string; at: number; pts?: number } | null>(null);
  const count = useRef(state.evidence.observations.length);
  const logLen = useRef(state.log.length);
  useEffect(() => {
    const obs = state.evidence.observations;
    if (obs.length > count.current) {
      const last = obs[obs.length - 1];
      const def = mission.observations.find((o) => o.id === last.id);
      if (def) {
        const text = t(last.quality === 'low' && def.findingLow ? def.findingLow : def.finding);
        setShown({ id: last.id, text, img: last.quality !== 'low' ? OBS_IMAGE[last.id] : undefined, at: Date.now(), pts: pointsFor(last.id, last.quality) });
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
      {shown.pts ? <strong className="points-pop">+{shown.pts} {t('science')}</strong> : null}
      {shown.img && <Figure file={shown.img} alt={t('Real NASA Perseverance image for comparison.')} maxHeight={120} />}
      <span className="small">{shown.text}</span>
      {shown.img && <span className="tiny dim">{t('Real NASA image for comparison — your mission is a simulation.')}</span>}
    </div>
  );
}

/* ---------------- Events & alerts (compact, in-world) ---------------- */

export function EventCard() {
  const t = useT();
  const { state, mission } = useMissionBits();
  const dispatch = useGame((s) => s.dispatch);
  const ev = mission.events.find((e) => e.id === state.pendingEvent);
  const [fb, setFb] = useState<{ ev: MissionEventDef; opt: string } | null>(null);
  const pick = (e: MissionEventDef, optId: string) => {
    if (dispatch({ type: 'EVENT_CHOICE', eventId: e.id, optionId: optId })) setFb({ ev: e, opt: optId });
  };
  useEffect(() => {
    if (!ev) return;
    setFb(null);
    sfx('alert');
    say(ev.message, ev.from);
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      const opt = ev.options[n - 1];
      if (opt && !(ev.id === 'ev-power' && opt.id === 'reserve' && state.ops.opsReserveM < 40)) pick(ev, opt.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev, dispatch, state.ops.opsReserveM]);
  useEffect(() => {
    if (!fb) return;
    const id = setTimeout(() => setFb(null), 14000);
    return () => clearTimeout(id);
  }, [fb]);
  if (!ev) return fb ? <ChoiceFeedback ev={fb.ev} chosen={fb.opt} onClose={() => setFb(null)} /> : null;
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
            <button key={o.id} className="action-row" disabled={disabled} onClick={() => (sfx(o.unsafe ? 'warn' : 'confirm'), pick(ev, o.id))}>
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

/** After a decision: which choice was best, and why — in one simple line. */
export function BestChoiceNote({ best, chosen, label, why }: { best: boolean; chosen?: string; label: string; why: string }) {
  const t = useT();
  return (
    <div className={`best-note ${best ? 'good' : 'tip'}`} role="status">
      <strong>{best ? `✓ ${t('Best choice!')}` : `💡 ${t('The best choice was: {label}', { label })}`}</strong>
      {chosen && !best && <span className="tiny dim">{chosen}</span>}
      <span className="small">{why}</span>
    </div>
  );
}

function ChoiceFeedback({ ev, chosen, onClose }: { ev: MissionEventDef; chosen: string; onClose: () => void }) {
  const t = useT();
  const bestId = ev.best ?? ev.options.find((o) => !o.unsafe)?.id;
  const best = ev.options.find((o) => o.id === bestId);
  const picked = ev.options.find((o) => o.id === chosen);
  if (!best) return null;
  return (
    <div className="hud-card choice-card fade-in" style={{ position: 'relative' }}>
      <button className="btn btn-ghost icon-btn" style={{ position: 'absolute', insetInlineEnd: 6, top: 6 }} onClick={onClose} aria-label={t('Close')}>
        ✕
      </button>
      <span className="eyebrow">{t(ev.title)}</span>
      <BestChoiceNote best={best.id === chosen} label={t(best.label)} chosen={picked ? t(picked.effects) : undefined} why={t(ev.why ?? ev.concept)} />
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
  if (mission.reportStyle === 'summary') {
    const docs = state.evidence.observations.map((r) => t(mission.observations.find((o) => o.id === r.id)?.name ?? r.id));
    return (
      <Modal onClose={onClose} labelledBy="rep-t">
        <div className="stack">
          <span className="eyebrow">{t('Report to Earth')}</span>
          <h2 id="rep-t">{t('Send your mission summary?')}</h2>
          <p className="small muted">{t('You documented:')} {docs.join(' · ')}</p>
          <p className="tiny dim">{t('Your antenna can send about {cap} MB. The most valuable data goes first.', { cap: fmtNum(cap, lang) })}</p>
          <button className="btn btn-primary" onClick={() => (sfx('success'), dispatch({ type: 'SEND_REPORT', conclusion: 'summary' }))}>
            📡 {t('Send summary to Earth')}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ alignSelf: 'flex-start' }}>
            {t('Keep exploring')}
          </button>
        </div>
      </Modal>
    );
  }
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
          {state.crew && mission.crew && <CrewPanel crew={mission.crew.filter((c) => c.id !== 'sam')} vitals={state.crew.vitals} compact />}
          {mission.id === 'm2-martian-mystery' && <EvidenceBoard />}
          <div className="divider" />
          {mission.type !== 'crewed' && <EquipmentPanel />}
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

/* ---------------- Mission intro ---------------- */

function MissionIntro({ onGo }: { onGo: () => void }) {
  const t = useT();
  const { mission } = useMissionBits();
  useEffect(() => {
    say(mission.id === 'm1-apollo' ? { en: 'Welcome to the Moon. Reach the Apollo 15 site, photograph it from outside the protected zone, and keep your crew safe.' } : mission.id === 'm3-lost-rover' ? { en: 'Welcome to Endeavour Crater. Find Opportunity and document it — without touching it.' } : { en: 'Your mission: find the leopard-spot rock, test it, and tell Earth the truth.' });
    const onKey = (e: KeyboardEvent) => {
      if (['Enter', ' ', 'w', 'W', 'ArrowUp'].includes(e.key)) onGo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGo]);
  return (
    <div className="intro-wrap">
      <div className="hud-card intro-card fade-in" role="dialog" aria-labelledby="intro-t">
        <span className="eyebrow">🎯 {t('Your mission')}</span>
        {mission.objectives ? (
          <>
            <h2 id="intro-t">{mission.id === 'm1-apollo' ? t('Explore the Moon safely — and protect Apollo 15\'s history.') : t('Find Opportunity and document it — without touching it.')}</h2>
            <ol className="intro-steps">
              {mission.objectives.map((o, i) => (
                <li key={i}>
                  <span>{['🔭', '📷', '📡'][i]}</span> {t(o.label)}
                </li>
              ))}
            </ol>
            {mission.type === 'crewed' && <p className="small warn">🫁 {t('Watch your suit oxygen. Return to the lander to rest before it runs out.')}</p>}
            {mission.world?.keepOut && <p className="small muted">⛔ {t('Never drive inside the red circle around historic hardware.')}</p>}
          </>
        ) : (
          <>
        <h2 id="intro-t">{t('Is there a sign of ancient life in this rock?')}</h2>
        <ol className="intro-steps">
          <li>
            <span>🔭</span> {t('Find the leopard-spot rock — follow the yellow beacon.')}
          </li>
          <li>
            <span>🧪</span> {t('Test it: photograph it, then check its chemistry.')}
          </li>
          <li>
            <span>📡</span> {t('Tell Earth what you found — honestly — before sol {n}.', { n: mission.conjunctionSol })}
          </li>
        </ol>
        <p className="small muted">⭐ {t('Bonus: explore all 4 sites and earn more science points.')}</p>
          </>
        )}
        <div className="row-wrap small">
          <span>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> {t('drive')}
          </span>
          <span>
            <kbd>E</kbd> {t('investigate')}
          </span>
          <span>
            <kbd>R</kbd> {t('recharge')}
          </span>
        </div>
        <button className="btn btn-primary" style={{ fontSize: 17, padding: '12px 20px' }} onClick={onGo}>
          {t("Let's go!")}
        </button>
      </div>
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
    const st = useGame.getState().state;
    if (st && st.ops.distanceU === 0 && st.evidence.observations.length === 0) setLive({ panel: 'intro' });
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
        {mission.type === 'crewed' ? <OxygenCard /> : <PowerCard />}
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
          <div className="row-wrap" style={{ justifyContent: 'center' }}>
            <button className="hud-card prompt fade-in" onClick={() => setLive({ panel: 'actions' })}>
              <kbd>E</kbd> {t('Investigate {site}', { site: nearSite.name })}
            </button>
            {hasStory(nearSite.id) && (
              <button className="hud-card prompt fade-in" onClick={() => replayStory(nearSite.id)}>
                <kbd>T</kbd> 📖 {t('Story')}
              </button>
            )}
            <BuggyPrompt keyLabel="B" />
          </div>
        ) : (
          <>
            {!busy && <BuggyPrompt />}
            <ControlsHint />
          </>
        )}
      </div>
      <div className="hud-br">
        <Minimap />
      </div>
      <SiteStories />
      <TouchControls />
      {panel === 'journal' && <Journal onClose={() => setLive({ panel: 'none' })} onReport={() => setLive({ panel: 'report' })} />}
      {panel === 'report' && <ReportCard onClose={() => setLive({ panel: 'none' })} />}
      {panel === 'intro' && <MissionIntro onGo={() => setLive({ panel: 'none' })} />}
      <span className="scene-label explore-note">{t('Illustrative terrain inspired by Jezero Crater — not to scale.')}</span>
    </main>
  );
}


/** "E" prompt to step off the lunar rover, or to climb back aboard when standing beside it. */
function BuggyPrompt({ keyLabel = 'E' }: { keyLabel?: string }) {
  const t = useT();
  const missionId = useGame((s) => s.missionId);
  const design = useGame((s) => s.state?.design);
  const onFoot = useGame((s) => !!s.state?.ops.onFoot);
  const near = useLive((s) => !!s.buggyNear);
  const stopped = useLive((s) => s.speed < 0.3);
  const moved = useLive((s) => s.moved);
  if (!missionId || !design || !hasBuggy(getMission(missionId), design)) return null;
  const go = () => window.dispatchEvent(new Event('legacy:buggy'));
  if (onFoot && near)
    return (
      <button className="hud-card prompt fade-in" onClick={go}>
        <kbd>{keyLabel}</kbd> {t('Climb aboard the lunar rover')}
      </button>
    );
  if (onFoot && keyLabel === 'E')
    return <div className="hud-card prompt-hint small">{t('On foot — walking is slower and uses more suit oxygen. Walk back to the rover (yellow on the map) to drive again.')}</div>;
  if (stopped && (moved || keyLabel === 'B'))
    return (
      <button className="hud-card prompt fade-in" onClick={go}>
        <kbd>{keyLabel}</kbd> {t('Step off and walk')}
      </button>
    );
  return null;
}
