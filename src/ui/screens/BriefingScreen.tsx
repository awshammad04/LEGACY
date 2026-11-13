import { useEffect, useState } from 'react';
import { getMission } from '../../content/missions';
import { useGame, useT } from '../../game/store';
import { say, sfx } from '../../game/audio';
import { ProvenanceBadge, SourceLink } from '../common';
import { Figure } from '../Figure';

export function BriefingScreen() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const dispatch = useGame((s) => s.dispatch);
  const mission = getMission(missionId);
  const [showBudget, setShowBudget] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => say(mission.briefing.intro), 600);
    return () => clearTimeout(id);
  }, [mission]);

  return (
    <main className="stage-body" id="main">
      <section className="side side-wide panel panel-pad stack scroll fade-in" aria-labelledby="brief-title">
        <span className="eyebrow">{t('On Earth — Mission briefing')}</span>
        <h2 id="brief-title">{t(mission.title)}</h2>
        <p>{t(mission.briefing.intro)}</p>
        <Figure file="assets/img/cheyava-falls.jpg" alt={t('The Cheyava Falls rock photographed by Perseverance, with pale spots ringed by dark rims.')} maxHeight={200} />
        <div className="stack-sm">
          <h4 className="muted">{t('NASA fact cards')}</h4>
          {mission.briefing.facts.map((f, i) => (
            <div key={i} className="finding stack-sm">
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <span>{t(f.text)}</span>
                <ProvenanceBadge p="verified" />
              </div>
              <SourceLink id={f.sourceId} />
            </div>
          ))}
        </div>
      </section>

      <section className="center-col" />

      <section className="side panel panel-pad stack scroll fade-in" aria-labelledby="priority-title">
        <span className="eyebrow">{t('Step 1 — Ask the question first')}</span>
        <h3 id="priority-title">{t('Which explanation will your mission test first?')}</h3>
        <p className="small muted">{t('Scientists choose questions before instruments. Your choice guides which tools you will need.')}</p>
        <div className="stack-sm" role="radiogroup" aria-labelledby="priority-title">
          {mission.hypotheses.map((h) => (
            <button
              key={h.id}
              className="quiz-option"
              role="radio"
              aria-checked={state.sciencePriority === h.id}
              onClick={() => {
                sfx('select');
                dispatch({ type: 'SET_PRIORITY', hypothesisId: h.id });
              }}
            >
              <span className="stack-sm">
                <strong>{t(h.name)}</strong>
                <span className="small muted">{t(h.description)}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="finding stack-sm">
          <div className="row between">
            <span className="small">{t('Simulation Budget — NASA-inspired educational estimate')}</span>
            <ProvenanceBadge p="fictional" />
          </div>
          <span className="mono" style={{ fontSize: 26 }}>
            ${(mission.budgetCapM / 1000).toFixed(1)}B
          </span>
          <button className="btn btn-ghost btn-sm" aria-expanded={showBudget} onClick={() => setShowBudget(!showBudget)} style={{ alignSelf: 'flex-start' }}>
            {showBudget ? '▾' : '▸'} {t('How we chose this budget')}
          </button>
          {showBudget && (
            <div className="stack-sm small">
              <p className="muted">{t(mission.budgetRationale)}</p>
              {mission.briefing.references.map((r, i) => (
                <div key={i} className="stack-sm">
                  <span>
                    <strong>{t(r.label)}:</strong> {t(r.value)} <ProvenanceBadge p="verified" />
                  </span>
                  <SourceLink id={r.sourceId} />
                </div>
              ))}
              <p className="tiny dim">{t('These are historical published figures in different dollar years and scopes — not current NASA authorizations, and not this game\'s budget.')}</p>
            </div>
          )}
        </div>
        <button className="btn btn-primary" disabled={!state.sciencePriority} onClick={() => (sfx('confirm'), dispatch({ type: 'ADVANCE', to: 'workshop' }))}>
          {t('Enter the Build Workshop')} →
        </button>
      </section>
    </main>
  );
}
