import { stopNarration, useSubtitles } from '../game/audio';
import { useGame, useT } from '../game/store';
import { useSyncExternalStore } from 'react';
import { narration } from '../storytelling/player';

/** Mission Control messages: compact, bottom corner, closable. */
export function Subtitles() {
  const t = useT();
  const line = useSubtitles((s) => s.line);
  const on = useGame((s) => s.settings.subtitles);
  const story=useSyncExternalStore(narration.subscribe,()=>narration.getSnapshot().story);
  // The shared launch cinematic shows its own Mission Control captions.
  const cinematic = useGame((s) => s.view === 'mission' && s.state?.stage === 'launch');
  if (!line || !on || cinematic || story) return null;
  return (
    <div className="subtitles" role="status" aria-live="polite">
      <div className="box fade-in" key={line.id}>
        <div className="row between" style={{ alignItems: 'flex-start', gap: 8 }}>
          <span className="who">📡 {line.from}</span>
          <button className="sub-close" onClick={stopNarration} aria-label={t('Close')}>
            ✕
          </button>
        </div>
        <span>{line.text}</span>
      </div>
    </div>
  );
}
