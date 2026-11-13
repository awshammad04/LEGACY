import { useEffect } from 'react';
import type { LText, MissionDefinition } from '../../core/types';
import { getMission } from '../../content/missions';
import { useGame, useT } from '../../game/store';
import { say, sfx } from '../../game/audio';
import { ProvenanceBadge, SourceLink } from '../common';
import { Figure } from '../Figure';

/** One clear sentence: what this journey is for. */
export function missionGoal(mission: MissionDefinition): { title: LText; why: LText } {
  if (mission.id === 'm2-martian-mystery') {
    return {
      title: { en: 'Find out what made the leopard spots on a mysterious Mars rock.' },
      why: { en: 'Could they be a sign of ancient life? Build a rover, drive to the rock, test it — and tell Earth the truth before Mars slips behind the Sun.' },
    };
  }
  return { title: mission.objective, why: mission.subtitle };
}

export function BriefingScreen() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const dispatch = useGame((s) => s.dispatch);
  const mission = getMission(missionId);
  const goal = missionGoal(mission);
  const budget = mission.budgetCapM >= 1000 ? `$${(mission.budgetCapM / 1000).toFixed(1)}B` : `$${mission.budgetCapM}M`;

  useEffect(() => {
    const id = setTimeout(() => say(goal.title), 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission]);

  const pick = (id: string) => {
    sfx('confirm');
    dispatch({ type: 'SET_PRIORITY', hypothesisId: id });
    setTimeout(() => dispatch({ type: 'ADVANCE', to: 'workshop' }), 250);
  };

  return (
    <main className="stage-body" id="main">
      <section className="side side-wide panel panel-pad stack scroll fade-in" aria-labelledby="brief-title">
        <span className="eyebrow">{t('Your mission')}</span>
        <h2 id="brief-title" style={{ fontSize: 28, lineHeight: 1.25 }}>
          {t(goal.title)}
        </h2>
        <p className="muted">{t(goal.why)}</p>
        {mission.id === 'm2-martian-mystery' && <Figure file="assets/img/cheyava-falls.jpg" alt={t('The Cheyava Falls rock photographed by Perseverance, with pale spots ringed by dark rims.')} maxHeight={220} />}
        <div className="row-wrap small">
          <span className="pill">🎯 {t(mission.destination)}</span>
          <span className="pill">
            💰 {budget} <ProvenanceBadge p="fictional" />
          </span>
        </div>
        <details className="small">
          <summary className="muted">{t('NASA facts behind this mission')}</summary>
          <div className="stack-sm" style={{ marginTop: 8 }}>
            {mission.briefing.facts.map((f, i) => (
              <div key={i} className="finding stack-sm">
                <span>{t(f.text)}</span>
                <SourceLink id={f.sourceId} />
              </div>
            ))}
          </div>
        </details>
        <details className="small">
          <summary className="muted">{t('How we chose this budget')}</summary>
          <div className="stack-sm" style={{ marginTop: 8 }}>
            <p className="muted">{t(mission.budgetRationale)}</p>
            {mission.briefing.references.map((r, i) => (
              <div key={i} className="stack-sm">
                <span>
                  <strong>{t(r.label)}:</strong> {t(r.value)}
                </span>
                <SourceLink id={r.sourceId} />
              </div>
            ))}
          </div>
        </details>
      </section>

      <section className="center-col" />

      <section className="side panel panel-pad stack scroll fade-in" aria-labelledby="priority-title">
        <span className="eyebrow">{t('Pick your main question')}</span>
        <h3 id="priority-title">{mission.priorityPrompt ? t(mission.priorityPrompt) : t('What do you think made the spots?')}</h3>
        <p className="small muted">{t('Scientists choose a question before choosing tools. Tap one to start building.')}</p>
        <div className="stack-sm" role="radiogroup" aria-labelledby="priority-title">
          {mission.hypotheses.map((h) => (
            <button key={h.id} className="quiz-option" role="radio" aria-checked={state.sciencePriority === h.id} onClick={() => pick(h.id)}>
              <span className="stack-sm">
                <strong>{t(h.name)}</strong>
                <span className="small muted">{t(h.description)}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
