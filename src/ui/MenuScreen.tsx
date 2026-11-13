import { useEffect, useMemo, useRef, useState } from 'react';
import type { MissionId } from '../core/types';
import { MISSIONS, getMission } from '../content/missions';
import { replay } from '../core/reducer';
import { deleteSave, markIntroSeen, useGame, useT, useUi } from '../game/store';
import { say, setAmbient, sfx, stopNarration } from '../game/audio';
import { INTRO_SECONDS } from '../scenes/menu';

const TYPE_LABEL = { crewed: 'Crewed', robotic: 'Robotic', telescope: 'Telescope' } as const;
const STAGE_NAME: Record<string, string> = {
  quizPre: 'Knowledge check', briefing: 'Briefing', workshop: 'Build workshop', review: 'Readiness review', launch: 'Launch', orbit: 'In orbit',
  landingSite: 'Landing site', surface: 'Mars surface', evidence: 'Evidence', report: 'Science report', debrief: 'Debrief', quizPost: 'Final check', results: 'Complete', opsPreview: 'Launched — operations in development', cruise: 'Journey to the Moon', observe: 'Observing',
};

/** Saved stage per mission (replayed from the action log). */
function useProgress() {
  const saves = useGame((s) => s.saves);
  return useMemo(() => {
    const out: Partial<Record<MissionId, { stage: string; at: number }>> = {};
    for (const m of MISSIONS) {
      const slot = saves[m.id];
      if (!slot) continue;
      try {
        out[m.id] = { stage: replay(m, slot.seed, slot.actions).stage, at: slot.updatedAt };
      } catch {
        /* ignore corrupt save */
      }
    }
    return out;
  }, [saves]);
}

/** Ambient space drone: starts on the first user gesture (autoplay rules), only while on the menu. */
function useAmbient() {
  const sfxOn = useGame((s) => s.settings.sfx);
  const started = useRef(false);
  useEffect(() => {
    if (!sfxOn) {
      setAmbient(false);
      return;
    }
    if (started.current) setAmbient(true);
    const start = () => {
      started.current = true;
      setAmbient(true);
    };
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
  }, [sfxOn]);
  useEffect(() => () => setAmbient(false), []);
}

export function MenuScreen() {
  const menu = useUi((s) => s.menu);
  useAmbient();
  if (menu === 'intro') return <Intro />;
  if (menu === 'select') return <MissionSelect />;
  return <MainMenu />;
}

/* ------------------------------------------------------------------ */
/* Cinematic intro — plays once per browser, always skippable          */
/* ------------------------------------------------------------------ */

function Intro() {
  const t = useT();
  const reduced = useGame((s) => s.settings.reducedMotion);
  const [step, setStep] = useState(0);
  const finish = () => {
    markIntroSeen();
    useUi.getState().set({ menu: 'main' });
  };
  useEffect(() => {
    if (reduced) return finish();
    useUi.getState().set({ introT0: performance.now() });
    const ids = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 3300),
      setTimeout(() => setStep(3), 5600),
      setTimeout(() => setStep(4), 8400),
      setTimeout(finish, INTRO_SECONDS * 1000),
    ];
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      ids.forEach(clearTimeout);
      window.removeEventListener('keydown', key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={`intro step-${step}`} role="dialog" aria-label={t('Intro')}>
      <div className="intro-black" />
      <div className="intro-logo">
        <span className="intro-mark">LEGACY</span>
        <span className="intro-tag">{t('Every Mission Leaves a Story')}</span>
      </div>
      <p className="intro-line">{t('Design the future. Protect the crew. Discover the past.')}</p>
      <button className="intro-skip btn btn-ghost btn-sm" onClick={finish} autoFocus>
        {t('Skip')} ›
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main menu — PLAY / CONTINUE / SETTINGS / CREDITS                     */
/* ------------------------------------------------------------------ */

function MainMenu() {
  const t = useT();
  const lang = useGame((s) => s.settings.lang);
  const setSettings = useGame((s) => s.setSettings);
  const setView = useGame((s) => s.setView);
  const continueMission = useGame((s) => s.continueMission);
  const setUi = useUi((s) => s.set);
  const progress = useProgress();
  const latest = useMemo(() => {
    const ids = (Object.keys(progress) as MissionId[]).filter((id) => progress[id]!.stage !== 'results');
    ids.sort((a, b) => progress[b]!.at - progress[a]!.at);
    return ids[0];
  }, [progress]);

  return (
    <main className="menu fade-in" id="main">
      <div className="menu-col">
        <h1 className="menu-logo">LEGACY</h1>
        <p className="menu-tag">{t('Every Mission Leaves a Story')}</p>
        <nav className="menu-list" aria-label={t('Main menu')}>
          <button className="menu-item menu-play" onClick={() => (sfx('confirm'), setUi({ menu: 'select' }))} autoFocus>
            {t('Play')}
          </button>
          {latest && (
            <button className="menu-item" onClick={() => (sfx('confirm'), continueMission(latest))}>
              {t('Continue')}
              <small>
                {t(getMission(latest).title)} · {t(STAGE_NAME[progress[latest]!.stage] ?? progress[latest]!.stage)}
              </small>
            </button>
          )}
          <button className="menu-item" onClick={() => (sfx('click'), setUi({ settingsOpen: true }))}>
            {t('Settings')}
          </button>
          <button className="menu-item" onClick={() => (sfx('click'), setView('credits'))}>
            {t('Credits')}
          </button>
        </nav>
      </div>
      <div className="menu-corner">
        <button className="btn btn-ghost btn-sm" onClick={() => (sfx('click'), setView('archive'))}>
          {t('Legacy Archive')}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setSettings({ lang: lang === 'en' ? 'ar' : 'en' })}
          aria-label={lang === 'en' ? 'التبديل إلى العربية' : 'Switch to English'}
          lang={lang === 'en' ? 'ar' : 'en'}
        >
          {lang === 'en' ? 'العربية' : 'English'}
        </button>
      </div>
      <p className="menu-foot">{t('Independent educational project for NASA Space Apps Challenge 2026 — not an official NASA product.')}</p>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Mission selection — holographic deck in 3D, minimal card in DOM      */
/* ------------------------------------------------------------------ */

let welcomed = false;

function MissionSelect() {
  const t = useT();
  const rtl = useGame((s) => s.settings.lang === 'ar');
  const profile = useGame((s) => s.profile);
  const startMission = useGame((s) => s.startMission);
  const continueMission = useGame((s) => s.continueMission);
  const focus = useUi((s) => s.focusMission);
  const setUi = useUi((s) => s.set);
  const progress = useProgress();
  const idx = MISSIONS.findIndex((m) => m.id === focus);
  const m = MISSIONS[idx] ?? MISSIONS[0];
  const stage = progress[m.id]?.stage;
  const done = profile.completed[m.id];

  useEffect(() => {
    if (welcomed) return;
    welcomed = true;
    const id = setTimeout(() => say({ en: 'Commander, four missions are waiting. Pick one — each begins with three quick questions, then you design it.' }), 700);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (step) {
        e.preventDefault();
        const n = (idx + (rtl ? -step : step) + MISSIONS.length) % MISSIONS.length;
        sfx('select');
        setUi({ focusMission: MISSIONS[n].id });
      } else if (e.key === 'Escape') {
        setUi({ menu: 'main' });
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [idx, rtl, setUi]);

  return (
    <main className="mselect fade-in" id="main">
      <div className="mselect-top">
        <button className="btn btn-ghost btn-sm" onClick={() => (sfx('click'), stopNarration(), setUi({ menu: 'main' }))}>
          {rtl ? '→' : '←'} {t('Back')}
        </button>
        <h2 className="eyebrow">{t('Choose your mission')}</h2>
        <span />
      </div>
      <div className="mselect-bottom">
        <div className="mtabs" role="tablist" aria-label={t('Choose your mission')}>
          {MISSIONS.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={x.id === m.id}
              className={`mtab ${x.id === m.id ? 'on' : ''}`}
              style={{ ['--accent' as string]: x.accent }}
              onClick={() => (sfx('select'), setUi({ focusMission: x.id }))}
            >
              <span className="mtab-num">{x.number}</span>
              <span className="mtab-name">{t(x.title)}</span>
            </button>
          ))}
        </div>
        <article key={m.id} className="mcard panel fade-in" style={{ ['--accent' as string]: m.accent }} aria-labelledby="mcard-title" role="tabpanel">
          <span className="eyebrow" style={{ color: m.accent }}>
            {t('MISSION')} {m.number} · {t(TYPE_LABEL[m.type])}
          </span>
          <h2 id="mcard-title">{t(m.title)}</h2>
          <span className="mcard-dest">📍 {t(m.destination)}</span>
          <p className="mcard-obj">{t(m.objective)}</p>
          {(stage || done) && <span className="tiny dim">{stage && stage !== 'results' ? `▶ ${t(STAGE_NAME[stage] ?? stage)}` : `✓ ${t('Completed — replay any time')}`}</span>}
          <div className="mcard-actions">
            {stage && stage !== 'results' ? (
              <>
                <button className="btn btn-primary" onClick={() => (sfx('confirm'), stopNarration(), continueMission(m.id))}>
                  {t('Continue Mission')}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    if (window.confirm(t('Start this mission again from the beginning? Your saved progress for this mission will be replaced.'))) {
                      deleteSave(m.id);
                      stopNarration();
                      startMission(m.id);
                    }
                  }}
                >
                  {t('Restart')}
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => (sfx('confirm'), stopNarration(), startMission(m.id))}>
                {t('Start Mission')}
              </button>
            )}
          </div>
          <span className="tiny dim">{t('Starts with 3 quick questions — no pass or fail.')}</span>
        </article>
      </div>
    </main>
  );
}
