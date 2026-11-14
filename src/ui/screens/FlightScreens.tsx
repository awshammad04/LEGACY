import { useEffect, useMemo, useState } from 'react';
import { getMission } from '../../content/missions';
import { computeMetrics } from '../../core/evaluate';
import { useGame, useT } from '../../game/store';
import { say, sfx } from '../../game/audio';
import { ProvenanceBadge } from '../common';
import { Figure } from '../Figure';
import { asset } from '../../scenes/models';
import { assetCredit } from '../../content/assets';

export function OrbitScreen() {
  const t = useT();
  const missionId = useGame((s) => s.missionId)!;
  const dispatch = useGame((s) => s.dispatch);
  const mission = getMission(missionId);
  const next = mission.stages[mission.stages.indexOf('orbit') + 1] ?? 'landingSite';
  const toMoon = mission.id === 'm1-apollo';

  useEffect(() => {
    say(toMoon ? { en: 'Earth orbit reached. Next stop: the Moon.' } : { en: 'Earth orbit reached. Next stop: Mars.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="stage-body" id="main" style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="panel panel-pad stack fade-in" style={{ width: 'min(420px, 92vw)', textAlign: 'center' }}>
        <span className="eyebrow">{t('In orbit around Earth')}</span>
        <p className="small muted">{t('Drag to look around. Tap a satellite to learn about it.')}</p>
        <button className="btn btn-primary" style={{ fontSize: 17, padding: '13px 18px' }} onClick={() => (sfx('confirm'), dispatch({ type: 'ADVANCE', to: next }))}>
          🚀 {toMoon ? t('Continue to the Moon') : t('Continue to Mars')} →
        </button>
        <span className="tiny dim">{t('Illustrative animation — not live tracking data. Starlink satellites are operated by SpaceX, not NASA.')}</span>
      </div>
    </main>
  );
}

export function LandingSiteScreen() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const dispatch = useGame((s) => s.dispatch);
  const mission = getMission(missionId);
  const m = useMemo(() => computeMetrics(mission, state.design), [mission, state.design]);
  const best = [...mission.landingSites].filter((x) => m.ellipseKm <= x.maxEllipseKm).sort((a, b) => a.maxEllipseKm - b.maxEllipseKm)[0];
  const [sel, setSel] = useState<string | null>(best?.id ?? null);
  const credit = assetCredit('assets/img/jezero-delta.jpg');

  useEffect(() => {
    say({ en: 'Mars orbit insertion complete. Orbital images can show landforms and minerals from above — but not the chemistry of a single rock. Choose where to land.' });
  }, []);

  return (
    <main className="stage-body" id="main">
      <section className="side side-wide panel panel-pad stack scroll fade-in" aria-labelledby="ls-title">
        <span className="eyebrow">{t('In orbit — choose the survey data')}</span>
        <h2 id="ls-title">{t('Choose a landing site in Jezero Crater')}</h2>
        <div style={{ position: 'relative' }} className="img-card">
          <img src={asset('assets/img/jezero-delta.jpg')} alt={t('Orbital view of Jezero Crater and its river delta, with mineral colors from orbit.')} style={{ maxHeight: 'none' }} />
          {mission.landingSites.map((s) => {
            const ok = m.ellipseKm <= s.maxEllipseKm;
            const r = 4 + m.ellipseKm * 0.55;
            return (
              <button
                key={s.id}
                aria-label={`${t(s.name)} — ${ok ? t('reachable') : t('needs a more precise landing system')}`}
                onClick={() => ok && (sfx('select'), setSel(s.id))}
                style={{
                  position: 'absolute',
                  left: `${s.mapPos[0] * 100}%`,
                  top: `${s.mapPos[1] * 100}%`,
                  width: `${r}%`,
                  aspectRatio: '1.6',
                  transform: 'translate(-50%,-50%)',
                  borderRadius: '50%',
                  border: `2px ${ok ? 'solid' : 'dashed'} ${sel === s.id ? '#5ad1ff' : ok ? '#ffffff' : '#ff6b6b'}`,
                  background: sel === s.id ? 'rgba(90,209,255,.25)' : 'rgba(0,0,0,.15)',
                  cursor: ok ? 'pointer' : 'not-allowed',
                }}
              />
            );
          })}
          {credit && <div className="cap">{t('Image')}: {credit.credit} — {credit.title}. {t('Ellipses are illustrative game overlays.')}</div>}
        </div>
      </section>
      <section className="center-col" />
      <section className="side panel panel-pad stack scroll fade-in" aria-labelledby="ls-opts">
        <h3 id="ls-opts">{t('Landing options')}</h3>
        <div className="finding small">
          {t('Your landing system lands inside a {e} km ellipse. A smaller ellipse lets you land closer to the rock.', { e: m.ellipseKm })} <ProvenanceBadge p="fictional" />
        </div>
        <div className="stack-sm" role="radiogroup" aria-labelledby="ls-opts">
          {mission.landingSites.map((s) => {
            const ok = m.ellipseKm <= s.maxEllipseKm;
            return (
              <button key={s.id} className="quiz-option" role="radio" aria-checked={sel === s.id} disabled={!ok} onClick={() => (sfx('select'), setSel(s.id))} style={{ opacity: ok ? 1 : 0.55 }}>
                <span className="stack-sm">
                  <strong>{t(s.name)}</strong>
                  <span className="small muted">{t(s.description)}</span>
                  {!ok && <span className="small bad">{t('Your landing system is not precise enough for this site.')}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <Figure file="assets/img/perseverance.jpg" alt={t('Perseverance rover selfie on Mars.')} maxHeight={140} />
        <button className="btn btn-primary" disabled={!sel} onClick={() => sel && (sfx('confirm'), dispatch({ type: 'CHOOSE_LANDING_SITE', siteId: sel }))}>
          {t('Begin entry, descent and landing')} →
        </button>
      </section>
    </main>
  );
}
