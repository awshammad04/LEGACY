import { useSubtitles } from '../game/audio';
import { useGame } from '../game/store';

export function Subtitles() {
  const line = useSubtitles((s) => s.line);
  const on = useGame((s) => s.settings.subtitles);
  if (!line || !on) return null;
  return (
    <div className="subtitles" role="status" aria-live="polite">
      <div className="box fade-in" key={line.id}>
        <span className="who">{line.from}:</span>
        {line.text}
      </div>
    </div>
  );
}
