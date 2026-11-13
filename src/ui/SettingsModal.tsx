import { useGame, useT, useUi } from '../game/store';
import { Modal, ProvenanceBadge, Toggle } from './common';
import { MODEL } from '../core/evaluate';

export function SettingsModal() {
  const open = useUi((s) => s.settingsOpen);
  const set = useUi((s) => s.set);
  const settings = useGame((s) => s.settings);
  const setSettings = useGame((s) => s.setSettings);
  const setView = useGame((s) => s.setView);
  const t = useT();
  if (!open) return null;
  const close = () => set({ settingsOpen: false });
  return (
    <Modal onClose={close} labelledBy="settings-title" wide>
      <div className="modal-head">
        <div className="stack-sm">
          <span className="eyebrow">{t('Learn / Accessibility')}</span>
          <h2 id="settings-title">{t('Settings & how LEGACY works')}</h2>
        </div>
        <button className="btn btn-ghost icon-btn" onClick={close} aria-label={t('Close')}>
          ✕
        </button>
      </div>
      <div className="home-lower" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
        <div>
          <div className="toggle">
            <span>{t('Language')}</span>
            <div className="seg" role="group" aria-label={t('Language')}>
              <button aria-pressed={settings.lang === 'en'} onClick={() => setSettings({ lang: 'en' })} lang="en">
                English
              </button>
              <button aria-pressed={settings.lang === 'ar'} onClick={() => setSettings({ lang: 'ar' })} lang="ar">
                العربية
              </button>
            </div>
          </div>
          <Toggle label={t('Subtitles')} hint={t('Show text for every spoken line.')} checked={settings.subtitles} onChange={(v) => setSettings({ subtitles: v })} />
          <Toggle label={t('Voice narration')} hint={t('Synthetic narrator voice from your browser. The narrator is a fictional Mission Control character.')} checked={settings.narration} onChange={(v) => setSettings({ narration: v })} />
          <Toggle label={t('Sound effects')} checked={settings.sfx} onChange={(v) => setSettings({ sfx: v })} />
          <Toggle label={t('Reduce motion')} hint={t('Shortens cinematics and stops camera movement.')} checked={settings.reducedMotion} onChange={(v) => setSettings({ reducedMotion: v })} />
          <div className="toggle">
            <span>{t('Graphics quality')}</span>
            <div className="seg" role="group" aria-label={t('Graphics quality')}>
              <button aria-pressed={settings.quality === 'high'} onClick={() => setSettings({ quality: 'high' })}>
                {t('High')}
              </button>
              <button aria-pressed={settings.quality === 'low'} onClick={() => setSettings({ quality: 'low' })}>
                {t('Low')}
              </button>
            </div>
          </div>
          <div className="stack-sm" style={{ marginTop: 14 }}>
            <h4>{t('Controls')}</h4>
            <p className="small muted">{t('On Mars: W A S D or arrow keys to drive, Shift for speed, E to investigate, R to rest, J for the journal, F to report. Drag to look around and scroll to zoom. Touch screens get on-screen driving buttons. Menus: Tab moves between controls, Enter activates, Escape closes.')}</p>
          </div>
        </div>
        <div className="stack" id="how-numbers-work">
          <h3>{t('Real facts, calculations and game values')}</h3>
          <p className="small muted">{t('LEGACY is a fictional educational game inspired by real NASA science. It is not a NASA-operated mission or a certified engineering or medical simulator. Every number carries a label:')}</p>
          <div className="stack-sm">
            <div className="row">
              <ProvenanceBadge p="verified" />
              <span className="small">{t('Historical or scientific information with a cited NASA source.')}</span>
            </div>
            <div className="row">
              <ProvenanceBadge p="calculated" />
              <span className="small">{t('Calculated by a simplified model from declared assumptions.')}</span>
            </div>
            <div className="row">
              <ProvenanceBadge p="fictional" />
              <span className="small">{t('Fictional game-balance values: budgets, component prices, masses and capacities.')}</span>
            </div>
          </div>
          <div className="divider" />
          <h4>{t('Model assumptions (simplified)')}</h4>
          <ul className="small muted" style={{ margin: 0, paddingInlineStart: 18 }}>
            <li>{t('Housekeeping power: {w} Wh per sol for computers and avionics.', { w: MODEL.housekeepingWh })}</li>
            <li>{t('Driving up to {h} hours per sol; science up to {s} hours per sol.', { h: MODEL.driveHoursPerSol, s: MODEL.scienceHoursPerSol })}</li>
            <li>{t('The battery is never drained below {p}% (safety floor).', { p: MODEL.batteryFloor * 100 })}</li>
            <li>{t('Storage must hold two full sets of science data.')}</li>
            <li>{t('Map distances are compressed and terrain is illustrative, not a real elevation model.')}</li>
            <li>{t('NASA-reported historic mission costs are never the same thing as LEGACY budgets.')}</li>
          </ul>
          <button className="btn btn-sm" onClick={() => (close(), setView('credits'))}>
            {t('Sources & credits')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
