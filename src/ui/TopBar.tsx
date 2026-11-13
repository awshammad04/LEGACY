import type { StageId } from '../core/types';
import { getMission } from '../content/missions';
import { useGame, useT, useUi } from '../game/store';
import { sfx, stopNarration } from '../game/audio';

const STAGE_LABEL: Partial<Record<StageId, string>> = {
  quizPre: 'Knowledge check',
  briefing: 'Briefing',
  workshop: 'Build',
  review: 'Review',
  launch: 'Launch',
  orbit: 'Orbit',
  landingSite: 'Landing',
  surface: 'Surface',
  evidence: 'Evidence',
  report: 'Report',
  debrief: 'Debrief',
  quizPost: 'Final check',
  results: 'Results',
};

export function TopBar() {
  const t = useT();
  const view = useGame((s) => s.view);
  const state = useGame((s) => s.state);
  const missionId = useGame((s) => s.missionId);
  const lang = useGame((s) => s.settings.lang);
  const setSettings = useGame((s) => s.setSettings);
  const exitToHome = useGame((s) => s.exitToHome);
  const setView = useGame((s) => s.setView);
  const mission = missionId ? getMission(missionId) : undefined;
  const stages = mission?.stages.filter((s) => s !== 'review') ?? [];
  const curIdx = state ? stages.indexOf(state.stage === 'review' ? 'workshop' : state.stage) : -1;

  return (
    <header className="topbar">
      <button
        className="brand"
        onClick={() => {
          sfx('click');
          stopNarration();
          exitToHome();
        }}
        title={t('return to Mission Control home')}
      >
        <span className="brand-mark">LEGACY</span>
        <span className="brand-sub">{view === 'mission' && mission ? `${mission.number} · ${t(mission.title)}` : t('Every Mission Leaves a Story')}</span>
        <span className="sr-only"> — {t('return to Mission Control home')}</span>
      </button>
      <div className="spacer" />
      {view === 'mission' && state && (
        <nav className="stage-steps" aria-label={t('Mission stages')}>
          {stages.map((s, i) => (
            <span key={s} className={`stage-step ${i < curIdx ? 'done' : ''} ${i === curIdx ? 'current' : ''}`} aria-current={i === curIdx ? 'step' : undefined}>
              {t(STAGE_LABEL[s] ?? s)}
            </span>
          ))}
        </nav>
      )}
      <div className="spacer" />
      {view !== 'mission' && (
        <button className="btn btn-ghost btn-sm" onClick={() => (sfx('click'), setView(view === 'archive' ? 'home' : 'archive'))}>
          {view === 'archive' ? t('Mission Control') : t('Legacy Archive')}
        </button>
      )}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setSettings({ lang: lang === 'en' ? 'ar' : 'en' })}
        aria-label={lang === 'en' ? 'التبديل إلى العربية' : 'Switch to English'}
        lang={lang === 'en' ? 'ar' : 'en'}
      >
        {lang === 'en' ? 'العربية' : 'English'}
      </button>
      <button className="btn btn-sm" onClick={() => (sfx('click'), useUi.getState().set({ settingsOpen: true }))}>
        ⚙ {t('Settings')}
      </button>
    </header>
  );
}
