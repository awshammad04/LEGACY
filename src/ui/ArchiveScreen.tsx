import { useEffect } from 'react';
import { MISSIONS } from '../content/missions';
import { useGame, useT, useUi } from '../game/store';
import { say, stopNarration } from '../game/audio';
import { Modal, ProvenanceBadge, SourceLink } from './common';
import { Figure } from './Figure';

const ALL = MISSIONS.flatMap((m) => m.archive);

export function ArchiveScreen() {
  const t = useT();
  const unlocked = useGame((s) => s.profile.archive);
  const set = useUi((s) => s.set);
  return (
    <main className="home scroll" id="main">
      <section className="hero">
        <span className="eyebrow">{t('The Legacy Archive')}</span>
        <h1 style={{ fontSize: 36, marginTop: 8 }}>{t('Discover the past. Apply it to the future.')}</h1>
        <p className="tagline">{t('Every entry is an Interactive Memory: a short narrated story, an authentic NASA image, and a question that brings the lesson back into your mission.')}</p>
      </section>
      <div className="mission-grid">
        {ALL.map((a) => {
          const open = unlocked.includes(a.id);
          return (
            <article key={a.id} className="panel mission-card" style={{ minHeight: 0, opacity: open ? 1 : 0.55 }}>
              <div className="row between">
                <span className="num" style={{ color: 'var(--mars)' }}>
                  {t('MISSION')} 02
                </span>
                {open ? <ProvenanceBadge p={a.provenance} /> : <span className="pill">🔒 {t('Locked')}</span>}
              </div>
              <h3>{open ? t(a.title) : t('Undiscovered memory')}</h3>
              <p className="small muted">{open ? t(a.story).slice(0, 140) + '…' : t('Play The Martian Mystery to unlock this entry.')}</p>
              <div className="actions">
                <button className="btn btn-sm" disabled={!open} onClick={() => set({ archiveEntry: a.id })}>
                  {t('Open memory')}
                </button>
              </div>
            </article>
          );
        })}
        {MISSIONS.filter((m) => !m.playable).map((m) => (
          <article key={m.id} className="panel mission-card" style={{ minHeight: 0, opacity: 0.45, ['--accent' as string]: m.accent }}>
            <span className="num">
              {t('MISSION')} {m.number}
            </span>
            <h3>{t(m.title)}</h3>
            <p className="small muted">{t('Archive entries arrive with this mission\'s operations stage.')}</p>
          </article>
        ))}
      </div>
    </main>
  );
}

export function ArchiveMemoryModal() {
  const t = useT();
  const id = useUi((s) => s.archiveEntry);
  const set = useUi((s) => s.set);
  const a = ALL.find((x) => x.id === id);
  useEffect(() => {
    if (a) say(a.story, { en: 'Archive narrator (dramatized, fictional voice)' });
    return () => stopNarration();
  }, [a]);
  if (!a) return null;
  const close = () => set({ archiveEntry: undefined });
  return (
    <Modal onClose={close} labelledBy="mem-title" wide>
      <div className="modal-head">
        <div className="stack-sm">
          <span className="eyebrow">{t('Interactive Memory')}</span>
          <h2 id="mem-title">{t(a.title)}</h2>
        </div>
        <button className="btn btn-ghost icon-btn" onClick={close} aria-label={t('Close')}>
          ✕
        </button>
      </div>
      <div className="home-lower" style={{ gridTemplateColumns: a.image ? '1fr 1fr' : '1fr', marginTop: 12 }}>
        {a.image && <Figure file={a.image} alt={t(a.imageAlt ?? a.title)} />}
        <div className="stack">
          <p>{t(a.story)}</p>
          <div className="finding small">{t(a.explanation)}</div>
          <div className="feed-item small">
            <strong>{t('Bring it back to your mission')}:</strong> {t(a.applyQuestion)}
          </div>
          <div className="row between">
            <ProvenanceBadge p={a.provenance} />
            <SourceLink id={a.sourceId} />
          </div>
          <span className="tiny dim">{t('Narration is a fictional, synthetic narrator voice — not an authentic mission recording.')}</span>
        </div>
      </div>
    </Modal>
  );
}
