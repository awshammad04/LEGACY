import { useEffect, useMemo } from 'react';
import type { ComponentOption, RuleResult } from '../../core/types';
import { getMission } from '../../content/missions';
import { blockingFailures, computeMetrics, evaluateRules, isLaunchReady } from '../../core/evaluate';
import { useGame, useT } from '../../game/store';
import { say, sfx } from '../../game/audio';
import { Meter, ProvenanceBadge, SourceLink } from '../common';
import { fmtNum } from '../../game/i18n';

const TIER_LABEL = { basic: 'Basic', balanced: 'Balanced', advanced: 'Advanced' } as const;

function Stats({ o }: { o: ComponentOption }) {
  const t = useT();
  const bits: string[] = [`$${o.costM}M`];
  if (o.massKg) bits.push(`${o.massKg} kg`);
  if (o.powerW) bits.push(`${o.powerW} W`);
  if (o.launchCapacityKg) bits.push(t('{n} kg lift', { n: o.launchCapacityKg }));
  if (o.landingCapacityKg) bits.push(t('lands {n} kg', { n: o.landingCapacityKg }));
  if (o.ellipseKm) bits.push(t('{n} km ellipse', { n: o.ellipseKm }));
  if (o.slopeLimitDeg) bits.push(`${o.slopeLimitDeg}°`);
  if (o.generationWhPerSol) bits.push(t('{n} Wh/sol', { n: o.generationWhPerSol }));
  if (o.downlinkMbPerSol) bits.push(t('{n} MB/sol', { n: o.downlinkMbPerSol }));
  if (o.storageMb) bits.push(`${o.storageMb} MB`);
  if (o.thermalCapacity) bits.push(t('{n} heat cap.', { n: o.thermalCapacity }));
  if (o.dataMb) bits.push(t('{n} MB/use', { n: o.dataMb }));
  return (
    <span className="tstats">
      {bits.slice(0, 2).map((b) => (
        <span key={b}>{b}</span>
      ))}
    </span>
  );
}

export function WorkshopScreen() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const lang = useGame((s) => s.settings.lang);
  const dispatch = useGame((s) => s.dispatch);
  const mission = getMission(missionId);
  const m = useMemo(() => computeMetrics(mission, state.design), [mission, state.design]);
  const rules = useMemo(() => evaluateRules(mission, state.design, state.sciencePriority), [mission, state.design, state.sciencePriority]);
  const warnings = rules.filter((r) => r.severity !== 'blocking' && !r.pass);
  const fails = blockingFailures(rules);

  useEffect(() => {
    if (state.reviewAttempts === 0) {
      const id = setTimeout(
        () =>
          say(
            mission.id === 'm2-martian-mystery'
              ? { en: 'Engineers have loaded a minimum-cost baseline. It can launch — but can it answer your science question? Upgrade wisely and watch every limit.' }
              : { en: 'Engineers have loaded a minimum-cost baseline. Check every limit before you trust it — then upgrade wisely.' },
          ),
        500,
      );
      return () => clearTimeout(id);
    }
  }, [state.reviewAttempts, mission.id]);

  const n = (v: number, d = 0) => fmtNum(v, lang, d);
  const budgetLimit = m.budgetCapM - m.reserveMinM;
  const has = (rule: string) => !mission.rules || mission.rules.includes(rule);
  const dayWord = mission.dayWord === 'day' ? t('day') : t('sol');
  const title = mission.model === 'telescope' ? t('Build your observatory') : mission.model === 'lunar' ? t('Build your lunar expedition') : t('Build your rover');
  const payloadLabel = mission.model === 'telescope' ? t('Spacecraft mass') : mission.model === 'lunar' ? t('Surface cargo') : t('Rover mass');

  return (
    <main className="stage-body" id="main">
      <section className="side side-wide panel panel-pad stack scroll fade-in" aria-labelledby="ws-title">
        <div className="row between">
          <div className="stack-sm">
            <span className="eyebrow">{t('On Earth — Build workshop')}</span>
            <h2 id="ws-title">{title}</h2>
          </div>
          <ProvenanceBadge p="fictional" />
        </div>
        <p className="small muted">{t('Pick one option per system. Every part changes several limits at once. All values are fictional game values.')}</p>
        {mission.slots.map((slot) => (
          <div key={slot.id} className="slot" role="group" aria-labelledby={`slot-${slot.id}`}>
            <div className="slot-head">
              <h4 id={`slot-${slot.id}`} title={t(slot.help)}>
                {t(slot.name)} {slot.mandatory && <span className="tiny dim">· {t('required')}</span>}{' '}
                <span className="dim" aria-label={t(slot.help)} style={{ cursor: 'help' }}>
                  ⓘ
                </span>
              </h4>
            </div>
            <div className={slot.multi ? 'addon-grid' : 'tier-grid'}>
              {slot.options.map((o) => {
                const selected = slot.multi ? state.design.addons.includes(o.id) : state.design.selections[slot.id] === o.id;
                return (
                  <button
                    key={o.id}
                    className="tier-card"
                    aria-pressed={selected}
                    title={t(o.description)}
                    onClick={() => {
                      sfx(selected && slot.multi ? 'click' : 'select');
                      dispatch(slot.multi ? { type: 'TOGGLE_ADDON', optionId: o.id } : { type: 'SELECT_COMPONENT', slot: slot.id, optionId: o.id });
                    }}
                  >
                    <span className="row between" style={{ gap: 6 }}>
                      <span className="tname">{t(o.name)}</span>
                      {o.tier && <span className="badge badge-tier">{t(TIER_LABEL[o.tier])}</span>}
                      {slot.multi && <span aria-hidden>{selected ? '☑' : '☐'}</span>}
                    </span>
                    <Stats o={o} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="center-col">
        <div className="hud-strip" aria-live="polite">
          <div className="hud-tile">
            <div className="lbl">{t('Budget used')}</div>
            <div className={`v ${m.costM > budgetLimit ? 'bad' : ''}`}>${n(m.costM)}M</div>
          </div>
          <div className="hud-tile">
            <div className="lbl">{t('Reserve left')}</div>
            <div className={`v ${m.reserveRemainingM < m.reserveMinM ? 'bad' : m.reserveRemainingM < m.reserveRecommendedM ? 'warn' : ''}`}>${n(m.reserveRemainingM)}M</div>
          </div>
          <div className="hud-tile">
            <div className="lbl">{payloadLabel}</div>
            <div className="v">{n(m.roverMassKg)} kg</div>
          </div>
          <div className="hud-tile">
            <div className="lbl">{t('Status')}</div>
            <div className={`v ${fails.length ? 'warn' : 'ok'}`}>{fails.length ? t('{n} limits exceeded', { n: fails.length }) : t('Within limits')}</div>
          </div>
        </div>
      </section>

      <section className="side panel panel-pad stack scroll fade-in" aria-labelledby="limits-title">
        <span className="eyebrow">{t('Engineering limits — live')}</span>
        <h3 id="limits-title">{t('Does the whole system still fit?')}</h3>
        <Meter label={t('Budget (protected reserve kept)')} value={m.costM} max={budgetLimit} display={`$${n(m.costM)}M / $${n(budgetLimit)}M`} />
        <div className="tiny dim">
          {t('Cap ${cap}M · protected reserve ${min}M (recommended ${rec}M)', { cap: m.budgetCapM, min: m.reserveMinM, rec: m.reserveRecommendedM })}
        </div>
        <Meter label={t('Launch mass vs launcher')} value={m.launchStackMassKg} max={m.launchCapacityKg} display={`${n(m.launchStackMassKg)} / ${n(m.launchCapacityKg)} kg`} />
        {has('landing-mass') && (
          <Meter
            label={mission.model === 'lunar' ? t('Surface cargo vs lander capacity') : t('Rover mass vs landing system')}
            value={m.roverMassKg}
            max={m.landingCapacityKg}
            display={`${n(m.roverMassKg)} / ${n(m.landingCapacityKg)} kg`}
          />
        )}
        {mission.requiredCrewDays ? (
          <Meter
            label={t('Crew life support (days, incl. 20% margin)')}
            value={Math.ceil(mission.requiredCrewDays * 1.2)}
            max={Math.max(1, m.crewDays)}
            display={`${n(Math.ceil(mission.requiredCrewDays * 1.2))} / ${n(m.crewDays)}`}
          />
        ) : null}
        <Meter
          label={mission.dayWord === 'day' ? t('Typical day energy demand vs supply') : t('Typical sol energy demand vs supply')}
          value={m.typicalSolDemandWh}
          max={m.generationWhPerSol}
          display={`${n(m.typicalSolDemandWh)} / ${n(m.generationWhPerSol)} Wh`}
        />
        <Meter label={t('Night energy (with margin) vs battery')} value={m.nightDemandWh * 1.25} max={m.batteryWh} display={`${n(m.nightDemandWh * 1.25)} / ${n(m.batteryWh)} Wh`} />
        <Meter label={t('Science data (2 sets) vs storage')} value={m.essentialDataMb * 2} max={m.storageMb} display={`${n(m.essentialDataMb * 2)} / ${n(m.storageMb)} MB`} />
        <Meter label={t('Heat load vs thermal capacity')} value={m.heatLoad} max={m.thermalCapacity} display={`${n(m.heatLoad)} / ${n(m.thermalCapacity)}`} />
        <div className="row-wrap tiny dim">
          <span>
            {t('Downlink')}: <span className="mono">{n(m.downlinkMbPerSol)} MB</span> / {dayWord}
          </span>
          {has('landing-mass') && mission.model !== 'lunar' && (
            <span>
              {t('Landing ellipse')}: <span className="mono">{n(m.ellipseKm)} km</span>
            </span>
          )}
          {m.slopeLimitDeg > 0 && (
            <span>
              {t('Max slope')}: <span className="mono">{n(m.slopeLimitDeg)}°</span>
            </span>
          )}
        </div>
        {warnings.length > 0 && (
          <div className="stack-sm" aria-label={t('Ground control notes')}>
            <h4 className="muted">{t('Ground control notes')}</h4>
            {warnings.map((w) => (
              <div key={w.id} className={`feed-item ${w.severity === 'warning' ? 'warn' : ''} small`}>
                {t(w.message)}
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-primary" onClick={() => (sfx('confirm'), dispatch({ type: 'REQUEST_REVIEW' }))}>
          {t('Run Pre-Launch Readiness Review')}
        </button>
      </section>
    </main>
  );
}

function RuleRow({ r }: { r: RuleResult }) {
  const t = useT();
  const icon = r.severity === 'blocking' ? (r.pass ? '✓' : '✕') : r.severity === 'warning' ? '!' : 'i';
  const cls = r.severity === 'blocking' ? (r.pass ? 'ok' : 'bad') : r.severity === 'warning' ? 'warn' : 'muted';
  return (
    <div className="rule">
      <span className={`ico ${cls}`} aria-label={r.pass ? t('Pass') : r.severity === 'blocking' ? t('Fail') : t('Note')}>
        {icon}
      </span>
      <span className="grow">{t(r.message)}</span>
      <ProvenanceBadge p={r.provenance} />
    </div>
  );
}

export function ReviewScreen() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const dispatch = useGame((s) => s.dispatch);
  const mission = getMission(missionId);
  const rules = useMemo(() => evaluateRules(mission, state.design, state.sciencePriority), [mission, state.design, state.sciencePriority]);
  const ready = isLaunchReady(rules);
  const fails = blockingFailures(rules);

  useEffect(() => {
    if (ready) {
      sfx('success');
      say({ en: 'Your spacecraft meets the modeled launch requirements. Mission authorization granted.' });
    } else {
      sfx('warn');
      say({ en: 'Not ready for launch. Review the failed checks and return to the workshop.' });
    }
  }, [ready]);

  return (
    <main className="centered" id="main">
      <div className="panel panel-pad content-card stack fade-in">
        <span className="eyebrow">{t('Pre-Launch Readiness Review')}</span>
        <h2>{ready ? t('Mission authorization granted') : t('Not ready for launch — {n} checks failed', { n: fails.length })}</h2>
        <p className="muted">
          {ready
            ? t('Your spacecraft meets the modeled launch requirements. Launch is final: the design cannot change after this point.')
            : t('Launch never bypasses an unsatisfied mandatory requirement. Here is exactly why — fix these in the workshop.')}
        </p>
        <div className="stack-sm">
          {rules
            .filter((r) => r.severity === 'blocking')
            .sort((a, b) => Number(a.pass) - Number(b.pass))
            .map((r) => (
              <RuleRow key={r.id} r={r} />
            ))}
        </div>
        {rules.some((r) => r.severity !== 'blocking') && (
          <div className="stack-sm">
            <h4 className="muted">{t('Ground notes')}</h4>
            {rules
              .filter((r) => r.severity !== 'blocking')
              .map((r) => (
                <RuleRow key={r.id} r={r} />
              ))}
          </div>
        )}
        <SourceLink id="legacy-game-model" />
        <div className="row between">
          <button className="btn" onClick={() => (sfx('click'), dispatch({ type: 'ADVANCE', to: 'workshop' }))}>
            ← {t('Return to Workshop')}
          </button>
          <button className="btn btn-launch" disabled={!ready} onClick={() => dispatch({ type: 'CONFIRM_LAUNCH' })}>
            {t('LAUNCH MISSION')}
          </button>
        </div>
      </div>
    </main>
  );
}
