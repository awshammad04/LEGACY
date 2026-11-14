import type { RuleResult } from '../../core/types';
import { useT } from '../../game/store';
import { SourceLink } from '../common';

/**
 * Space Apps challenge resources in the workshop:
 *  - NASA "Design and Develop Science Missions": every mission has Launch, Space, Ground and User segments.
 *  - JPL Concept Maturity Levels + Goddard Mission Design Lab study levels: an idea becomes a point design.
 * The live readiness rules are grouped by segment, so the player sees which part of the mission a choice affects.
 */
const SEGMENTS: { id: string; icon: string; name: string; what: string; rules: string[] }[] = [
  { id: 'launch', icon: '🚀', name: 'Launch segment', what: 'The launch vehicle and services that place the mission in space.', rules: ['launch-mass', 'landing-mass', 'mass-margin', 'ellipse'] },
  { id: 'space', icon: '🛰', name: 'Space segment', what: 'The spacecraft, instruments, landers or rovers that do the work.', rules: ['mandatory', 'power', 'battery', 'thermal', 'dependencies', 'life-support', 'power-margin', 'solar-dust'] },
  { id: 'ground', icon: '📡', name: 'Ground segment', what: 'Antennas and Mission Control that talk to the spacecraft and receive its data.', rules: ['downlink', 'storage'] },
  { id: 'user', icon: '🔬', name: 'User segment', what: 'The scientists who analyse the data and answer the mission question.', rules: ['science-fit'] },
];

export function MissionSegments({ rules }: { rules: RuleResult[] }) {
  const t = useT();
  return (
    <div className="segments" aria-labelledby="seg-title">
      <h4 id="seg-title" className="segments-title">
        {t('NASA mission segments')}
      </h4>
      {SEGMENTS.map((s) => {
        const mine = rules.filter((r) => s.rules.includes(r.id));
        const blocking = mine.filter((r) => r.severity === 'blocking');
        const failed = blocking.filter((r) => !r.pass);
        const notes = mine.filter((r) => r.severity === 'warning' && !r.pass);
        const status = failed.length ? 'bad' : notes.length ? 'warn' : 'ok';
        return (
          <div key={s.id} className={`segment ${status}`}>
            <span className="segment-icon" aria-hidden="true">
              {s.icon}
            </span>
            <span className="grow stack-sm" style={{ gap: 1 }}>
              <strong>{t(s.name)}</strong>
              <span className="tiny dim">{failed[0] ? t(failed[0].message) : notes[0] ? t(notes[0].message) : t(s.what)}</span>
            </span>
            <span className={`ico ${status}`} aria-label={status === 'ok' ? t('Pass') : status === 'bad' ? t('Fail') : t('Note')}>
              {status === 'ok' ? '✓' : status === 'bad' ? '✕' : '!'}
            </span>
          </div>
        );
      })}
      <SourceLink id="nasa-design-science-missions" />
    </div>
  );
}

/** Where this design stands on JPL's Concept Maturity Levels (with Goddard MDL study names). */
export function ConceptMaturity({ ready, customized }: { ready: boolean; customized: boolean }) {
  const t = useT();
  const steps = [
    { cml: 'CML 1', name: 'Concept', note: 'Science question chosen in the briefing', done: true },
    { cml: 'CML 3', name: 'Trade study', note: 'Compare designs: each one gives something up', done: customized },
    { cml: 'CML 4', name: 'Point design', note: 'One design that meets every requirement', done: customized && ready },
  ];
  const current = steps.findIndex((s) => !s.done);
  return (
    <div className="cml" aria-label={t('Concept maturity')}>
      <span className="eyebrow">{t('Concept maturity')}</span>
      <ol className="cml-steps">
        {steps.map((s, i) => (
          <li key={s.cml} className={s.done ? 'done' : i === current ? 'current' : ''} title={t(s.note)}>
            <span className="mono">{s.cml}</span> {t(s.name)}
          </li>
        ))}
      </ol>
      <span className="tiny dim">
        {current === -1 ? t('Point design reached: ready for the launch decision.') : t(steps[current].note)}
      </span>
      <div className="row-wrap tiny">
        <SourceLink id="jpl-cml" />
        <SourceLink id="gsfc-mdl" />
      </div>
    </div>
  );
}
