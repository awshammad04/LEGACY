import { useEffect, useRef, useState } from 'react';
import STORIES from '../../content/stories.json';
import type { LText } from '../../core/types';
import { useGame, useT } from '../../game/store';
import { useLive } from '../../game/live';
import { sfx, stopNarration } from '../../game/audio';

/** Narrated site stories: voiced with Gemini TTS ahead of time (see scripts/generate-stories.mjs). */
interface Story {
  siteId: string;
  title: LText;
  en: string;
  ar: string;
}
const BY_SITE = new Map<string, Story>((STORIES.stories as Story[]).map((s) => [s.siteId, s]));
export const hasStory = (siteId?: string) => !!siteId && BY_SITE.has(siteId);

const HEARD_KEY = 'legacy.v1.storiesHeard';
const heard = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(HEARD_KEY) ?? '[]');
  } catch {
    return [];
  }
};
const markHeard = (id: string) => {
  try {
    localStorage.setItem(HEARD_KEY, JSON.stringify([...new Set([...heard(), id])]));
  } catch {
    /* storage unavailable */
  }
};

const audioUrl = (siteId: string, lang: string) => `${import.meta.env.BASE_URL}assets/stories/${siteId}-${lang}.mp3`;

/** Opens a site's story the first time the player arrives; `T` (or the button) replays it nearby. */
export function SiteStories() {
  const nearSiteId = useLive((s) => s.nearSiteId);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!nearSiteId || !BY_SITE.has(nearSiteId) || heard().includes(nearSiteId)) return;
    markHeard(nearSiteId);
    setOpen(nearSiteId);
  }, [nearSiteId]);
  useEffect(() => {
    const onReplay = (e: Event) => setOpen((e as CustomEvent<string>).detail);
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 't' || e.repeat) return;
      const id = useLive.getState().nearSiteId;
      if (id && BY_SITE.has(id)) setOpen((cur) => (cur === id ? null : id));
    };
    window.addEventListener('legacy:story', onReplay);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('legacy:story', onReplay);
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  if (!open) return null;
  const story = BY_SITE.get(open);
  return story ? <StoryCard key={open} story={story} onClose={() => setOpen(null)} /> : null;
}

export const replayStory = (siteId: string) => window.dispatchEvent(new CustomEvent('legacy:story', { detail: siteId }));

function StoryCard({ story, onClose }: { story: Story; onClose: () => void }) {
  const t = useT();
  const lang = useGame((s) => s.settings.lang);
  // Stories use recorded AI voices, so they follow the game's sound setting, not the robotic-narrator toggle
  const soundOn = useGame((s) => s.settings.sfx);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    const a = new Audio(audioUrl(story.siteId, lang));
    audio.current = a;
    a.preload = 'auto';
    a.onplay = () => setPlaying(true);
    a.onpause = () => setPlaying(false);
    a.onended = () => {
      setPlaying(false);
      setProgress(1);
    };
    a.ontimeupdate = () => a.duration && setProgress(a.currentTime / a.duration);
    a.onerror = () => setFailed(true);
    if (soundOn) {
      stopNarration();
      a.play().catch(() => setPlaying(false)); // autoplay may be blocked until the player interacts
    }
    return () => {
      // Detach handlers first: clearing src fires an error event that must not reach the next audio
      a.onplay = a.onpause = a.onended = a.ontimeupdate = a.onerror = null;
      a.pause();
      a.removeAttribute('src');
      a.load();
      audio.current = null;
    };
  }, [story.siteId, lang, soundOn]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    sfx('click');
    if (a.paused) {
      stopNarration();
      if (a.ended) a.currentTime = 0;
      void a.play();
    } else a.pause();
  };

  return (
    <aside className="story-card panel fade-in" aria-labelledby="story-title" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="row between" style={{ alignItems: 'flex-start', gap: 8 }}>
        <div className="stack-sm" style={{ gap: 2 }}>
          <span className="eyebrow">📖 {t('Story of this place')}</span>
          <h3 id="story-title">{t(story.title)}</h3>
        </div>
        <button className="btn btn-ghost icon-btn" onClick={onClose} aria-label={t('Close')}>
          ✕
        </button>
      </div>
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        {!failed && (
          <button className="btn btn-sm btn-primary" onClick={toggle}>
            {playing ? `⏸ ${t('Pause')}` : progress > 0 && progress < 1 ? `▶ ${t('Resume listening')}` : `▶ ${t('Listen')}`}
          </button>
        )}
        <div className="story-bar" aria-hidden="true">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>
      <p className="story-text">{lang === 'ar' ? story.ar : story.en}</p>
      <span className="tiny dim">{t('Narration voiced with Gemini text-to-speech (AI voice). Facts from NASA mission records.')}</span>
    </aside>
  );
}
