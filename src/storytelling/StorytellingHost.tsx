import { useEffect } from 'react';
import { getMission } from '../content/missions';
import { useGame } from '../game/store';
import { useLive } from '../game/live';
import { clearControlSubtitles } from '../game/audio';
import { StoryCard } from '../ui/screens/StoryCard';
import { BY_STORY, isSiteStory, missionStoryId, recordingUrl, storyMission } from './catalog';
import { narration } from './player';
import { storyForChange } from './triggers';

type Game = ReturnType<typeof useGame.getState>;
const context = (game: Game) => `${game.view}:${game.missionId??''}:${game.seed}:${game.state?.stage??''}`;
const HEARD = 'legacy.v1.storiesHeard';
const SEEN = 'legacy.v1.narrationSeen';
const history = (key: string): string[] => {
  try {const value=JSON.parse(localStorage.getItem(key)??'[]');return Array.isArray(value)?value.filter(id=>typeof id==='string'):[];} catch {return [];}
};
const remember = (key: string, id: string) => {
  try {localStorage.setItem(key,JSON.stringify([...new Set([...history(key),id])].slice(-250)));} catch {/* unavailable storage does not interrupt play */}
};
let hostGeneration = 0;

/** One mounted adapter for accepted game events, site discovery and explicit story replay. */
export function StorytellingHost() {
  useEffect(() => {
    const generation=++hostGeneration;
    let pending: ReturnType<typeof setTimeout> | undefined;
    let lastRoutine=0;
    const inMemory=new Set<string>();
    const cancelPending=()=>{if(pending)clearTimeout(pending);pending=undefined;};
    const open=(id:string, manual=false)=>{
      const game=useGame.getState(), story=BY_STORY.get(id);
      if(!story||game.view!=='mission'||!game.state||!game.missionId)return;
      const owner=storyMission(story);
      if(owner&&owner!==game.missionId)return;
      const site=isSiteStory(id);
      if(site&&(game.state.stage!=='surface'||!getMission(game.missionId).sites?.some(s=>s.id===id)))return;
      const stamp=site?id:`${game.missionId}:${game.seed}:${id}`;
      const key=site?HEARD:SEEN;
      if(!manual&&(history(key).includes(stamp)||inMemory.has(stamp)))return;
      const critical=id.endsWith('-intro')||id.endsWith('-ending')||id==='mission-launch'||id.startsWith('control-');
      const current=narration.getSnapshot();
      if(!manual&&site&&(game.state.pendingEvent||(current.story?.siteId.startsWith('control-')&&current.status!=='ended')))return;
      if(!manual&&!site&&!critical&&((current.story&&current.status!=='ended')||Date.now()-lastRoutine<12_000))return;
      inMemory.add(stamp);remember(key,stamp);
      if(!manual)lastRoutine=Date.now();
      clearControlSubtitles();
      narration.open(story,game.settings.lang,recordingUrl(story,game.settings.lang),game.settings.storyNarration);
    };
    const syncSettings=(game:Game)=>{
      narration.setMuted(!game.settings.storyNarration);
      narration.setVolume(game.settings.storyVolume);
    };
    const handle=(next:Game,previous:Game)=>{
      const changed=context(next)!==context(previous);
      if(changed){cancelPending();lastRoutine=0;narration.stop();clearControlSubtitles();}
      if(next.settings!==previous.settings)syncSettings(next);
      if(next.settings.lang!==previous.settings.lang){
        clearControlSubtitles();
        const story=narration.getSnapshot().story;
        if(story)narration.open(story,next.settings.lang,recordingUrl(story,next.settings.lang),false);
      }
      if(next.view!=='mission'||!next.state||!next.missionId)return;
      const entered=previous.view!=='mission'||previous.missionId!==next.missionId||previous.seed!==next.seed;
      if(entered&&next.actions.length===0){open(missionStoryId(next.missionId,'intro'));return;}
      if(previous.state&&next.actions.length===previous.actions.length+1&&next.seed===previous.seed&&next.missionId===previous.missionId){
        const id=storyForChange(getMission(next.missionId),previous.state,next.state,next.actions.at(-1));
        if(id){
          // Coalesce synchronous review/launch actions, rather than starting two overlapping clips.
          cancelPending();const scope=context(next);
          pending=setTimeout(()=>{pending=undefined;if(context(useGame.getState())===scope)open(id);},0);
        }
      }
    };
    syncSettings(useGame.getState());
    const unsubscribe=useGame.subscribe(handle);
    const unsubscribeSites=useLive.subscribe((next,previous)=>{
      const game=useGame.getState();
      if(game.view==='mission'&&game.state?.stage==='surface'&&next.nearSiteId&&next.nearSiteId!==previous.nearSiteId)open(next.nearSiteId);
    });
    const replay=(event:Event)=>{const id=(event as CustomEvent<string>).detail;if(typeof id==='string')open(id,true);};
    const key=(event:KeyboardEvent)=>{
      if(event.key.toLowerCase()!=='t'||event.repeat||event.ctrlKey||event.metaKey)return;
      if(['INPUT','TEXTAREA','SELECT'].includes((event.target as HTMLElement)?.tagName))return;
      const id=useLive.getState().nearSiteId;
      if(id&&isSiteStory(id))narration.getSnapshot().story?.siteId===id?narration.stop():open(id,true);
    };
    window.addEventListener('legacy:story',replay);window.addEventListener('keydown',key);
    const game=useGame.getState();
    if(game.view==='mission'&&game.missionId&&game.state&&game.actions.length===0&&!narration.getSnapshot().story)open(missionStoryId(game.missionId,'intro'));
    return ()=>{
      cancelPending();unsubscribe();unsubscribeSites();
      window.removeEventListener('legacy:story',replay);window.removeEventListener('keydown',key);
      // React Strict Mode immediately reattaches; actual unmount releases the single audio owner.
      queueMicrotask(()=>{if(hostGeneration===generation)narration.stop();});
    };
  },[]);
  return <StoryCard />;
}
