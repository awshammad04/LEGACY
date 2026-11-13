import { useEffect, useMemo, useState } from 'react';
import { getMission } from '../../content/missions';
import { ORBIT_LEARN_CARDS, SKY_CARDS } from '../../content/learn';
import { PUZZLE_BINS, PUZZLE_CLUES } from '../../content/puzzle';
import { computeMetrics, tierOf } from '../../core/evaluate';
import { isTestMode, useGame, useT, useUi } from '../../game/store';
import { say, sfx } from '../../game/audio';
import { launchClock } from '../../scenes/scenes';
import { openLearnCard, ProvenanceBadge } from '../common';
import { Figure } from '../Figure';
import { asset } from '../../scenes/models';
import { assetCredit } from '../../content/assets';

export function LaunchScreen() {
  const t = useT();
  const dispatch = useGame((s) => s.dispatch);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const mission = getMission(missionId);
  const tier = tierOf(mission, state.design, 'launcher') ?? 'basic';
  const next = mission.stages[mission.stages.indexOf('launch') + 1] ?? 'orbit';
  const [now, setNow] = useState(0);
  const duration = isTestMode() ? 0.5 : reduced ? 3 : launchClock.duration;

  useEffect(() => {
    launchClock.start = performance.now();
    let raf = 0;
    let launched = false;
    const tick = () => {
      const tt = (performance.now() - launchClock.start) / 1000;
      setNow(tt);
      if (!launched && tt > 3 && !reduced) {
        launched = true;
        sfx('launch');
      }
      if (tt >= duration) {
        dispatch({ type: 'ADVANCE', to: next });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    say({ en: 'All systems are go. Launch in three… two… one…' });
    return () => cancelAnimationFrame(raf);
  }, [dispatch, duration, reduced, next]);

  const countdown = Math.max(0, Math.ceil(3 - now));
  const phase = now < 3 ? t('Countdown') : now < 9.5 ? t('Liftoff — first stage burning') : now < 11 ? t('Stage separation') : t('Fairing separation — reaching parking orbit');
  return (
    <main className="stage-body" id="main" style={{ alignItems: 'flex-end' }}>
      <div className="panel panel-pad stack-sm fade-in" style={{ width: 360 }} role="status" aria-live="polite">
        <span className="eyebrow">{t('Launch')}</span>
        <h2 className="mono" style={{ fontSize: 34 }}>
          {now < 3 ? `T−${countdown}` : `T+${Math.floor(now - 3)}s`}
        </h2>
        <span className="muted">{phase}</span>
        <span className="tiny dim">{t('Launcher: fictional {tier} vehicle sized by your workshop choice.', { tier: t(tier) })}</span>
        <button className="btn btn-sm btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => dispatch({ type: 'ADVANCE', to: next })}>
          {t('Skip cinematic')} ⏭
        </button>
      </div>
    </main>
  );
}

export function OrbitScreen() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const dispatch = useGame((s) => s.dispatch);
  const [clue, setClue] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    say({ en: 'Welcome to low Earth orbit, Commander. Explore the satellites around you, then solve the mission puzzle before we perform the transfer burn to Mars.' });
  }, []);

  const tryMatch = (bin: string) => {
    if (!clue) return;
    const c = PUZZLE_CLUES.find((x) => x.id === clue)!;
    dispatch({ type: 'PUZZLE_MATCH', clueId: clue, missionKey: bin });
    if (c.answer === bin) {
      sfx('success');
      const b = PUZZLE_BINS.find((x) => x.key === bin)!;
      setFeedback({ ok: true, text: t(b.story) });
    } else {
      sfx('warn');
      setFeedback({ ok: false, text: `${t('Not quite — hint:')} ${t(c.hint)}` });
    }
    setClue(null);
  };
  const remaining = PUZZLE_CLUES.filter((c) => !state.orbit.matched.includes(c.id));

  return (
    <main className="stage-body" id="main">
      <section className="side panel panel-pad stack scroll fade-in" aria-labelledby="orbit-title">
        <span className="eyebrow">{t('In orbit — the space highway')}</span>
        <h2 id="orbit-title">{t('Orbit Explorer')}</h2>
        <p className="small muted">{t('You are in a low parking orbit. Drag to look around and select anything to learn about it — or head straight to Mars.')}</p>
        <div className="feed-item small">{t('Illustrative animation — not live tracking data. Starlink satellites are operated by SpaceX, not NASA.')}</div>
        <div className="stack-sm">
          {ORBIT_LEARN_CARDS.map((c) => (
            <button key={c.id} className="btn btn-sm" style={{ justifyContent: 'space-between' }} onClick={() => (openLearnCard(c), dispatch({ type: 'EXPLORE', cardId: c.id }))}>
              <span>{t(c.name)}</span>
              {state.orbit.explored.includes(c.id) ? <span className="ok">✓</span> : <span className="dim">→</span>}
            </button>
          ))}
        </div>
        <div className="divider" />
        <LookAroundPanel />
      </section>
      <section className="center-col" />
      <section className="side panel panel-pad stack scroll fade-in" aria-labelledby="puzzle-title">
        <button className="btn btn-primary" style={{ fontSize: 16, padding: '12px 18px' }} onClick={() => (sfx('confirm'), dispatch({ type: 'ADVANCE', to: 'landingSite' }))}>
          🚀 {t('Continue to Mars')} →
        </button>
        <div className="divider" />
        <span className="eyebrow">{t('Optional: Mission Parts & Orbit Puzzle')}</span>
        <h3 id="puzzle-title">{t('Match each archive fragment to its mission')}</h3>
        <p className="tiny dim">{t('These are virtual archive fragments — not real hardware drifting in orbit. Pick a fragment, then the mission it belongs to.')}</p>
        <div className="row-wrap" role="group" aria-label={t('Fragments')}>
          {remaining.map((c) => (
            <button key={c.id} className="btn btn-sm" aria-pressed={clue === c.id} style={clue === c.id ? { borderColor: 'var(--cyan)', background: 'rgba(90,209,255,.15)' } : undefined} onClick={() => (sfx('click'), setClue(c.id))}>
              {t(c.text)}
            </button>
          ))}
          {remaining.length === 0 && <span className="ok small">✓ {t('All fragments matched!')}</span>}
        </div>
        <div className="stack-sm" role="group" aria-label={t('Missions')}>
          {PUZZLE_BINS.map((b) => {
            const count = state.orbit.matched.filter((id) => PUZZLE_CLUES.find((c) => c.id === id)?.answer === b.key).length;
            return (
              <button key={b.key} className="quiz-option" disabled={!clue} onClick={() => tryMatch(b.key)} style={{ opacity: clue ? 1 : 0.75 }}>
                <span className="grow">{t(b.name)}</span>
                <span className="mono small">{count}/2</span>
              </button>
            );
          })}
        </div>
        {feedback && (
          <div className={`feed-item small ${feedback.ok ? '' : 'warn'}`} role="status">
            {feedback.text}
          </div>
        )}
        <div className="row between tiny dim">
          <span>{t('Matched {n} of {total}', { n: state.orbit.matched.length, total: PUZZLE_CLUES.length })}</span>
          <span>{t('Hints used: {n}', { n: state.orbit.mistakes })}</span>
        </div>
      </section>
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

function LookAroundPanel() {
  const t = useT();
  const look = useUi((s) => s.lookAround);
  const set = useUi((s) => s.set);
  return (
    <div className="stack-sm">
      <div className="row between">
        <h4>{t('Look Around')}</h4>
        <button className="btn btn-sm" aria-pressed={look} onClick={() => (sfx('click'), set({ lookAround: !look }))}>
          {look ? t('Hide sky labels') : t('Show sky labels')}
        </button>
      </div>
      <p className="tiny dim">{t('Drag to look out of the window, then select the Moon or a planet.')}</p>
      {look && (
        <>
          <div className="feed-item small">{t('Illustrative sky — not a real-time star map. Objects are placed for learning, not at their true positions today.')}</div>
          {SKY_CARDS.map((c) => (
            <button key={c.id} className="btn btn-sm" style={{ justifyContent: 'space-between' }} onClick={() => openLearnCard(c)}>
              <span>✦ {t(c.name)}</span>
              <span className="dim">→</span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
