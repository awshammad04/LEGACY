import { stopNarration, useSubtitles } from '../game/audio';
import { useGame, useT } from '../game/store';

/** Mission Control messages: compact, bottom corner, closable. */
export function Subtitles() {
  const t = useT();
  const line = useSubtitles((s) => s.line);
  const on = useGame((s) => s.settings.subtitles);
  if (!line || !on) return null;
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
