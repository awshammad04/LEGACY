import { useEffect, useState } from 'react';
import { getMission } from '../../content/missions';
import { useGame, useT } from '../../game/store';
import { say, sfx } from '../../game/audio';
import { CrewPanel, StatusChip } from '../CrewPanel';
import { ChoiceCard } from '../ChoiceCard';

/** A short, live "day aboard" on the way to the Moon: five quick choices that change crew health. */
export function CruiseScreen() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const dispatch = useGame((s) => s.dispatch);
  const mission = getMission(missionId);
  const steps = mission.cruise ?? [];
  const crew = state.crew!;
  const step = steps[crew.step];
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    setPicked(null);
    if (step) say(step.prompt, { en: 'Mission Control' });
    else say({ en: 'The Moon is filling the window. Prepare for landing!' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crew.step]);

  const choose = (optId: string) => {
    if (!step || picked) return;
    const opt = step.options.find((o) => o.id === optId)!;
    const best = (step.best ?? step.options[0].id) === optId;
    sfx(opt.unsafe ? 'warn' : best ? 'success' : 'select');
    setPicked(optId);
  };
  // The choice is applied when the player continues, after reading which option was best and why.
  const next = () => {
    if (!step || !picked) return;
    sfx('click');
    dispatch({ type: 'CREW_CHOICE', stepId: step.id, optionId: picked });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!step) {
        if (e.key === 'Enter') dispatch({ type: 'ADVANCE', to: 'surface' });
        return;
      }
      if (picked) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === '1' || e.key === '2') {
          e.preventDefault();
          next();
        }
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= step.options.length) choose(step.options[n - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });


  return (
    <main className="stage-body cruise-hud" id="main">
      <section className="cruise-schedule panel fade-in" aria-labelledby="cruise-title">
        <span className="eyebrow">{t('Life aboard — journey to the Moon')}</span>
        <h2 id="cruise-title">{t('A day in space')}</h2>
        <ol className="cruise-steps">
          {steps.map((s, i) => (
            <li key={s.id} className={`cruise-step ${i < crew.step ? 'done' : i === crew.step ? 'current' : ''}`}>
              <span className="t">{t(s.time)}</span>
              <span className="grow">{t(s.title)}</span>
              {i < crew.step && <span>✓</span>}
            </li>
          ))}
        </ol>
      </section>

      <section className="cruise-crew panel fade-in" aria-label={t('Crew health')}>
        <CrewPanel crew={mission.crew ?? []} vitals={crew.vitals} />
      </section>

      <section className="cruise-card">
        {step ? (
          <div className="panel panel-pad stack fade-in" key={step.id} role="dialog" aria-labelledby="step-t">
            <span className="eyebrow">
              {t(step.time)} · {t('Mission Control')}
            </span>
            <ChoiceCard step={step} picked={picked} onChoose={choose} onContinue={next} />
          </div>
        ) : (
          <div className="panel panel-pad stack fade-in" style={{ textAlign: 'center' }}>
            <span className="eyebrow">{t('Arriving at the Moon')}</span>
            <h3 style={{ fontSize: 22 }}>{t('The crew is ready for landing')}</h3>
            <div className="row" style={{ justifyContent: 'center' }}>
              <StatusChip v={crew.vitals} />
            </div>
            <p className="small muted">{t('Rested crews can work longer outside. Watch your suit oxygen on the Moon and return to the lander to rest.')}</p>
            <button className="btn btn-primary" style={{ fontSize: 17, padding: '12px 20px' }} onClick={() => (sfx('confirm'), dispatch({ type: 'ADVANCE', to: 'surface' }))}>
              🌕 {t('Land on the Moon')} →
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
