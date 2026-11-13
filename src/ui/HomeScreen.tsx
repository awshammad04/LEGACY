import { useEffect, useMemo } from 'react';
import type { MissionDefinition, MissionId } from '../core/types';
import { MISSIONS, getMission, isStartable } from '../content/missions';
import { replay } from '../core/reducer';
import { deleteSave, useGame, useT, useUi } from '../game/store';
import { say, sfx } from '../game/audio';
import { Modal, ProvenanceBadge, SourceLink } from './common';
import { SHARED_PRE_QUIZ } from '../content/quiz';

const TYPE_LABEL = { crewed: 'Crewed', robotic: 'Robotic', telescope: 'Telescope' } as const;
const STAGE_NAME: Record<string, string> = {
  quizPre: 'Knowledge check', briefing: 'Briefing', workshop: 'Build workshop', review: 'Readiness review', launch: 'Launch', orbit: 'In orbit',
  landingSite: 'Landing site', surface: 'Mars surface', evidence: 'Evidence', report: 'Science report', debrief: 'Debrief', quizPost: 'Final check', results: 'Complete', opsPreview: 'Launched — operations in development', cruise: 'Journey to the Moon', observe: 'Observing',
};

function budgetLabel(m: MissionDefinition) {
  return m.budgetCapM >= 1000 ? `$${(m.budgetCapM / 1000).toFixed(1)}B` : `$${m.budgetCapM}M`;
}

let welcomed = false;

export function HomeScreen() {
  const t = useT();
  const saves = useGame((s) => s.saves);
  const profile = useGame((s) => s.profile);
  const startMission = useGame((s) => s.startMission);
  const continueMission = useGame((s) => s.continueMission);
  const setView = useGame((s) => s.setView);
  const setUi = useUi((s) => s.set);

  useEffect(() => {
    if (welcomed) return;
    welcomed = true;
    const id = setTimeout(
      () =>
        say({
          en: "Commander, four missions are awaiting your decision. Each has a real scientific story — but the spacecraft, crew plan, and mission budget are yours to design. Select your mission. Before we begin, let's see what you already know.",
        }),
      900,
    );
    return () => clearTimeout(id);
  }, []);

  const progress = useMemo(() => {
    const out: Partial<Record<MissionId, string>> = {};
    for (const m of MISSIONS) {
      const slot = saves[m.id];
      if (!slot || !isStartable(m)) continue;
      try {
        out[m.id] = replay(m, slot.seed, slot.actions).stage;
      } catch {
        out[m.id] = undefined;
      }
    }
    return out;
  }, [saves]);

  return (
    <main className="home scroll" id="main">
      <section className="hero fade-in">
        <span className="eyebrow">{t('Mission Control Academy · Headquarters')}</span>
        <h1 style={{ marginTop: 8 }}>
          LEGACY <span className="dim" style={{ fontWeight: 400 }}>— {t('Every Mission Leaves a Story')}</span>
        </h1>
        <p className="tagline">{t('Design the future. Protect the crew. Discover the past.')}</p>
      </section>

      <section aria-labelledby="choose-title">
        <div className="row between" style={{ marginBottom: 10 }}>
          <h2 id="choose-title">{t('Choose your mission')}</h2>
          <span className="small dim">{t('All four missions are open from the start. Each has its own save.')}</span>
        </div>
        <div className="mission-grid">
          {MISSIONS.map((m) => {
            const stage = progress[m.id];
            const done = profile.completed[m.id];
            return (
              <article key={m.id} className="panel mission-card fade-in" style={{ ['--accent' as string]: m.accent }} aria-labelledby={`mc-${m.id}`}>
                <div className="row between">
                  <span className="num">{t('MISSION')} {m.number}</span>
                  <span className="pill">{t(TYPE_LABEL[m.type])}</span>
                </div>
                <div className="stack-sm">
                  <h3 id={`mc-${m.id}`}>{t(m.title)}</h3>
                  <span className="small muted">{t(m.subtitle)}</span>
                </div>
                <dl className="kv">
                  <dt>{t('Destination')}</dt>
                  <dd>{t(m.destination)}</dd>
                  <dt>{t('Objective')}</dt>
                  <dd>{t(m.objective)}</dd>
                  <dt>{t('Game budget')}</dt>
                  <dd>
                    <span className="mono">{budgetLabel(m)}</span> <ProvenanceBadge p="fictional" />
                  </dd>
                  <dt>{t('Progress')}</dt>
                  <dd>{stage ? t(STAGE_NAME[stage] ?? stage) : done ? t('Completed — replay any time') : !m.playable ? t('Earth stage playable · operations in development') : t('Not started')}</dd>
                </dl>
                <div className="actions">
                  {isStartable(m) ? (
                    stage ? (
                      <>
                        <button className="btn btn-primary" onClick={() => (sfx('confirm'), continueMission(m.id))}>
                          {t('Continue Mission')}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            if (window.confirm(t('Start this mission again from the beginning? Your saved progress for this mission will be replaced.'))) {
                              deleteSave(m.id);
                              startMission(m.id);
                            }
                          }}
                        >
                          {t('Restart')}
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-primary" onClick={() => (sfx('confirm'), startMission(m.id))}>
                        {t('Start Mission')}
                      </button>
                    )
                  ) : (
                    <button className="btn" onClick={() => (sfx('click'), setUi({ previewMission: m.id }))}>
                      {t('View briefing')}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="home-lower">
        <div className="panel panel-pad stack" aria-labelledby="quiz-preview-title">
          <span className="eyebrow">{t('Before you launch')}</span>
          <h3 id="quiz-preview-title">{t('3-question knowledge check')}</h3>
          <p className="small muted">{t('After you choose a mission, three short questions record what you already know — before any teaching begins. There is no pass or fail, and "I\'m not sure" is always a fine answer. At the end you answer three similar questions and see your real before-and-after results.')}</p>
          <div className="stack-sm">
            {SHARED_PRE_QUIZ.map((q, i) => (
              <p key={q.id} className="quiz-preview-q">
                <strong>{i + 1}.</strong> {t(q.conceptLabel)} — {t(q.prompt)}
              </p>
            ))}
          </div>
          <p className="tiny dim">{t('You may skip the check for accessibility, but then no before/after comparison is available.')}</p>
        </div>
        <div className="panel panel-pad stack" aria-labelledby="journey-title">
          <span className="eyebrow">{t('Continue your journey')}</span>
          <h3 id="journey-title">{t('Saved missions')}</h3>
          {Object.keys(progress).length === 0 ? (
            <p className="small muted">{t('No saved missions yet. Progress saves automatically at every stage.')}</p>
          ) : (
            <div className="stack-sm">
              {(Object.keys(progress) as MissionId[]).map((id) => (
                <button key={id} className="btn btn-sm" style={{ justifyContent: 'space-between' }} onClick={() => continueMission(id)}>
                  <span>{t(getMission(id).title)}</span>
                  <span className="dim">{t(STAGE_NAME[progress[id] ?? ''] ?? '')}</span>
                </button>
              ))}
            </div>
          )}
          <div className="row between small">
            <span className="muted">{t('Archive entries unlocked')}</span>
            <span className="mono">{profile.archive.length}</span>
          </div>
          <div className="row between small">
            <span className="muted">{t('Discovery log')}</span>
            <span className="mono">{profile.discoveries.length}</span>
          </div>
          <button className="btn btn-sm" onClick={() => setView('archive')}>
            {t('Open the Legacy Archive')}
          </button>
        </div>
        <div className="panel panel-pad stack" aria-labelledby="learn-title">
          <span className="eyebrow">{t('Learn / Accessibility')}</span>
          <h3 id="learn-title">{t('Play your way')}</h3>
          <p className="small muted">{t('Subtitles, narration, Arabic or English, reduced motion and keyboard or touch controls. Every number is labeled as a real NASA fact, a calculation, or a game value.')}</p>
          <div className="row-wrap">
            <ProvenanceBadge p="verified" />
            <ProvenanceBadge p="calculated" />
            <ProvenanceBadge p="fictional" />
          </div>
          <div className="row-wrap">
            <button className="btn btn-sm" onClick={() => setUi({ settingsOpen: true })}>
              {t('Settings & how numbers work')}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setView('credits')}>
              {t('Sources & credits')}
            </button>
          </div>
        </div>
      </section>
      <p className="footer-note">{t('Independent educational project for NASA Space Apps Challenge 2026 — not an official NASA product. NASA images are used under NASA media guidelines and credited where shown.')}</p>
    </main>
  );
}

export function MissionPreviewModal() {
  const id = useUi((s) => s.previewMission);
  const set = useUi((s) => s.set);
  const t = useT();
  if (!id) return null;
  const m = getMission(id);
  const close = () => set({ previewMission: undefined });
  return (
    <Modal onClose={close} labelledBy="preview-title">
      <div className="modal-head">
        <div className="stack-sm">
          <span className="eyebrow" style={{ color: m.accent }}>
            {t('MISSION')} {m.number} · {t(TYPE_LABEL[m.type])}
          </span>
          <h2 id="preview-title">
            {t(m.title)} — {t(m.subtitle)}
          </h2>
        </div>
        <button className="btn btn-ghost icon-btn" onClick={close} aria-label={t('Close')}>
          ✕
        </button>
      </div>
      <div className="stack" style={{ marginTop: 12 }}>
        <p>{t(m.briefing.intro)}</p>
        <div className="stack-sm">
          {m.briefing.facts.map((f, i) => (
            <div key={i} className="finding stack-sm">
              <div className="row between">
                <span>{t(f.text)}</span>
                <ProvenanceBadge p="verified" />
              </div>
              <SourceLink id={f.sourceId} />
            </div>
          ))}
        </div>
        <div className="finding stack-sm">
          <div className="row between">
            <h4>
              {t('Simulation Budget — NASA-inspired educational estimate')}: <span className="mono">{budgetLabel(m)}</span>
            </h4>
            <ProvenanceBadge p="fictional" />
          </div>
          <p className="small muted">{t(m.budgetRationale)}</p>
          {m.briefing.references.map((r, i) => (
            <div key={i} className="stack-sm">
              <span className="small">
                <strong>{t(r.label)}:</strong> {t(r.value)}
              </span>
              <SourceLink id={r.sourceId} />
            </div>
          ))}
        </div>
        <div className="feed-item warn small">{t('This mission\'s operations stage is still in development. Mission 02 — The Martian Mystery — is fully playable today and uses the same systems this mission will reuse.')}</div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={close}>
            {t('Back to Mission Control')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
