import { useSyncExternalStore } from 'react';
import { useGame, useT } from '../../game/store';
import { narration } from '../../storytelling/player';
import { BY_STORY, isSiteStory } from '../../storytelling/catalog';

export const hasStory = (siteId?: string) => !!siteId && isSiteStory(siteId) && BY_STORY.has(siteId);
export const replayStory = (siteId: string) => window.dispatchEvent(new CustomEvent('legacy:story', {detail:siteId}));

/** Mission 03's story card, now controlled by the single shared narration player. */
export function StoryCard() {
  const t=useT();
  const state=useSyncExternalStore(narration.subscribe,narration.getSnapshot);
  const setSettings=useGame(s=>s.setSettings);
  const stage=useGame(s=>s.state?.stage);
  const {story,lang,status,progress,muted,volume}=state;
  if(!story)return null;
  const site=isSiteStory(story.siteId);
  return <aside className={`story-card panel fade-in ${site?'':'story-milestone'} ${stage==='surface'?'story-surface':''} ${stage==='launch'?'story-launch':''}`} aria-labelledby="story-title" dir={lang==='ar'?'rtl':'ltr'} data-story-id={story.siteId} data-playback={status}>
    <div className="row between" style={{alignItems:'flex-start',gap:8}}>
      <div className="stack-sm" style={{gap:2}}>
        <span className="eyebrow">📖 {t(site?'Story of this place':'Mission story')}</span>
        <h3 id="story-title">{t(story.title)}</h3>
      </div>
      <button className="btn btn-ghost icon-btn" onClick={()=>narration.stop()} aria-label={t('Close')}>✕</button>
    </div>
    <div className="row-wrap" style={{gap:6}}>
      {status!=='unavailable'&&<button className="btn btn-sm btn-primary" onClick={()=>status==='playing'?narration.pause():void narration.play()}>
        {t(status==='playing'?'Pause':status==='paused'?'Resume listening':'Listen')}
      </button>}
      <button className="btn btn-sm" onClick={()=>narration.replay()} disabled={status==='unavailable'}>{t('Replay story')}</button>
      <button className="btn btn-sm" onClick={()=>narration.stop()}>{t('Skip narration')}</button>
    </div>
    <details className="story-options"><summary>{t('Narration options')}</summary>
      <button className="btn btn-sm" aria-pressed={muted} onClick={()=>setSettings({storyNarration:muted})}>{t(muted?'Unmute narration':'Mute narration')}</button>
      <label className="story-volume small">{t('Narration volume')}
        <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e=>setSettings({storyVolume:Number(e.target.value)})} />
      </label>
    </details>
    <div className="story-bar" role="progressbar" aria-label={t('Narration progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress*100)}><span style={{width:`${Math.round(progress*100)}%`}} /></div>
    {status==='unavailable'&&<span className="tiny muted" role="status">{t('Narration unavailable. You can still read the verified story and continue playing.')}</span>}
    <p className="story-text" lang={lang}>{story[lang]}</p>
    <span className="tiny dim">{t('Narration voiced with Gemini text-to-speech (AI voice). Facts from NASA mission records.')}</span>
  </aside>;
}
