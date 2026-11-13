import { useEffect, useMemo } from 'react';
import { getMission } from '../../content/missions';
import { computeMetrics, evaluateRules, optionById } from '../../core/evaluate';
import { useGame, useT } from '../../game/store';
import { say, sfx } from '../../game/audio';
import { fmtNum } from '../../game/i18n';
import { ProvenanceBadge } from '../common';

/**
 * Honest end of the playable Earth stage for missions whose operations are still in development.
 * Shows what the player's own design will mean later — no fabricated outcome.
 */
export function OpsPreviewScreen() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const lang = useGame((s) => s.settings.lang);
  const setView = useGame((s) => s.setView);
  const startMission = useGame((s) => s.startMission);
  const continueMission = useGame((s) => s.continueMission);
  const saves = useGame((s) => s.saves);
  const mission = getMission(missionId);
  const m = useMemo(() => computeMetrics(mission, state.design), [mission, state.design]);
  const warnings = useMemo(() => evaluateRules(mission, state.design, state.sciencePriority).filter((r) => r.severity === 'warning'), [mission, state.design, state.sciencePriority]);
  const n = (v: number) => fmtNum(v, lang);
  const preview = mission.opsPreview!;
  const priority = mission.hypotheses.find((h) => h.id === state.sciencePriority);

  useEffect(() => {
    sfx('success');
    say(preview.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keySlots = mission.slots.filter((s) => !s.multi).slice(0, 6);
  return (
    <main className="centered" id="main">
      <div className="panel panel-pad content-card stack fade-in" style={{ maxWidth: 900 }}>
        <span className="eyebrow" style={{ color: mission.accent }}>
          {t('MISSION')} {mission.number} · {t(mission.title)}
        </span>
        <h2>{t(preview.title)}</h2>
        <p className="muted">{t(preview.intro)}</p>
        <div className="home-lower" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 0 }}>
          <div className="finding stack-sm">
            <div className="row between">
              <h4>{t('Your launched design')}</h4>
              <ProvenanceBadge p="fictional" />
            </div>
            {priority && (
              <span className="small">
                <strong>{t('Priority')}:</strong> {t(priority.name)}
              </span>
            )}
            {keySlots.map((s) => (
              <span key={s.id} className="small">
                <span className="muted">{t(s.name)}:</span> {t(optionById(mission, state.design.selections[s.id])?.name ?? '—')}
              </span>
            ))}
            {state.design.addons.length > 0 && (
              <span className="small">
                <span className="muted">{t('Extras')}:</span> {state.design.addons.map((id) => t(optionById(mission, id)?.name ?? '')).join(' · ')}
              </span>
            )}
            <div className="divider" />
            <span className="small mono">
              ${n(m.costM)}M · {t('reserve')} ${n(m.reserveRemainingM)}M · {n(m.launchStackMassKg)} kg
            </span>
            {warnings.map((w) => (
              <span key={w.id} className="tiny warn">
                ⚠ {t(w.message)}
              </span>
            ))}
          </div>
          <div className="stack-sm">
            <h4>{t('Coming next in this mission')}</h4>
            {preview.next.map((x, i) => (
              <div key={i} className="feed-item small">
                {t(x)}
              </div>
            ))}
          </div>
        </div>
        <div className="feed-item warn small">
          {t('The final knowledge check and debrief arrive with the operations stage. Your baseline answers are saved and will be compared only with your real final answers.')}
        </div>
        <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => startMission(missionId)}>
            ⟲ {t('Redesign from the start')}
          </button>
          {saves['m2-martian-mystery'] ? (
            <button className="btn" onClick={() => continueMission('m2-martian-mystery')}>
              {t('Continue Mission 02 (fully playable)')}
            </button>
          ) : (
            <button className="btn" onClick={() => startMission('m2-martian-mystery')}>
              {t('Play Mission 02 (fully playable)')}
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setView('home')}>
            {t('Back to Mission Control')}
          </button>
        </div>
      </div>
    </main>
  );
}
