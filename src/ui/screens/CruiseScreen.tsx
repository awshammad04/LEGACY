import { useEffect, useState } from 'react';
import { getMission } from '../../content/missions';
import { useGame, useT } from '../../game/store';
import { say, sfx } from '../../game/audio';
import { CrewPanel, StatusChip } from '../CrewPanel';

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
  const [result, setResult] = useState<{ text: string; unsafe?: boolean } | null>(null);

  useEffect(() => {
    if (step) say(step.prompt, { en: 'Mission Control' });
    else say({ en: 'The Moon is filling the window. Prepare for landing!' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crew.step]);

  const choose = (optId: string) => {
    if (!step || result) return;
    const opt = step.options.find((o) => o.id === optId)!;
    sfx(opt.unsafe ? 'warn' : 'select');
    setResult({ text: t(opt.result), unsafe: opt.unsafe });
    setTimeout(() => {
      dispatch({ type: 'CREW_CHOICE', stepId: step.id, optionId: optId });
      setResult(null);
    }, 1600);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!step) {
        if (e.key === 'Enter') dispatch({ type: 'ADVANCE', to: 'surface' });
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= step.options.length) choose(step.options[n - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <main className="stage-body" id="main">
      <section className="side panel panel-pad stack scroll fade-in" aria-labelledby="cruise-title">
        <span className="eyebrow">{t('Life aboard — journey to the Moon')}</span>
        <h2 id="cruise-title">{t('A day in space')}</h2>
        <p className="small muted">{t('Your choices today change how rested, healthy and safe the crew is for the moonwalk.')}</p>
        <div className="stack-sm">
          {steps.map((s, i) => (
            <div key={s.id} className={`cruise-step ${i < crew.step ? 'done' : i === crew.step ? 'current' : ''}`}>
              <span className="t">{t(s.time)}</span>
              <span className="grow">{t(s.title)}</span>
              {i < crew.step && <span>✓</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="center-col">
        {step ? (
          <div className="panel panel-pad stack fade-in" key={step.id} style={{ width: 'min(520px, 92vw)' }} role="dialog" aria-labelledby="step-t">
            <span className="eyebrow">
              {t(step.time)} · {t('Mission Control')}
            </span>
            <h3 id="step-t" style={{ fontSize: 20 }}>
              {t(step.title)}
            </h3>
            <p>{t(step.prompt)}</p>
            {result ? (
              <div className={`feed-item ${result.unsafe ? 'bad' : ''}`} role="status">
                {result.text}
              </div>
            ) : (
              <div className="stack-sm">
                {step.options.map((o, i) => (
                  <button key={o.id} className="action-row" onClick={() => choose(o.id)}>
                    <span className="key">{i + 1}</span>
                    <span className="grow">{t(o.label)}</span>
                  </button>
                ))}
              </div>
            )}
            <span className="tiny dim">💡 {t(step.learn)}</span>
          </div>
        ) : (
          <div className="panel panel-pad stack fade-in" style={{ width: 'min(520px, 92vw)', textAlign: 'center' }}>
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

      <section className="side panel panel-pad stack scroll fade-in" aria-label={t('Crew health')}>
        <CrewPanel crew={mission.crew ?? []} vitals={crew.vitals} />
      </section>
    </main>
  );
}
