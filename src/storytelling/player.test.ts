import { describe, expect, it, vi } from 'vitest';
import { NarrationPlayer } from './player';
import type { Story } from './catalog';

const story:Story={siteId:'m3-opportunity',title:{en:'Opportunity'},en:'Verified English.',ar:'نص عربي موثّق.'};
class FakeAudio {
  src='';preload='';volume=1;muted=false;currentTime=0;duration=20;paused=true;
  onplay:(()=>void)|null=null;onpause:(()=>void)|null=null;onended:(()=>void)|null=null;
  ontimeupdate:(()=>void)|null=null;onerror:(()=>void)|null=null;
  error?:Error;
  play=vi.fn(async()=>{if(this.error){const error=this.error;this.error=undefined;throw error;}if(this.paused){this.paused=false;this.onplay?.();}});
  pause=vi.fn(()=>{if(!this.paused){this.paused=true;this.onpause?.();}});
  load=vi.fn();
  removeAttribute=vi.fn(()=>{this.src='';});
}
const setup=()=>{
  const clips:FakeAudio[]=[];
  const player=new NarrationPlayer(()=>{const clip=new FakeAudio();clips.push(clip);return clip as unknown as HTMLAudioElement;});
  return {player,clips};
};
describe('shared recorded narration',()=>{
  it('owns one active audio source and ignores old playback callbacks',async()=>{
    const {player,clips}=setup();player.open(story,'en','english.mp3',true);
    const stale=clips[0].onended;
    player.open(story,'ar','arabic.mp3',false);
    expect(clips[0].pause).toHaveBeenCalled();expect(clips[0].src).toBe('');
    stale?.();expect(player.getSnapshot().lang).toBe('ar');expect(player.getSnapshot().status).toBe('ready');
    expect(clips[1].play).not.toHaveBeenCalled();await player.play();expect(player.getSnapshot().status).toBe('playing');
  });
  it('pauses, resumes, replays, mutes, changes volume and skips',async()=>{
    const {player,clips}=setup();player.open(story,'en','story.mp3');await player.play();
    clips[0].currentTime=8;clips[0].ontimeupdate?.();expect(player.getSnapshot().progress).toBe(0.4);
    player.pause();expect(player.getSnapshot().status).toBe('paused');await player.play();expect(clips[0].currentTime).toBe(8);
    player.setMuted(true);player.setVolume(2);expect(clips[0].muted).toBe(true);expect(clips[0].volume).toBe(1);
    player.setVolume(0.25);player.setMuted(false);expect(clips[0].volume).toBe(0.25);
    player.replay();expect(clips[0].currentTime).toBe(0);expect(player.getSnapshot().progress).toBe(0);
    expect(player.getSnapshot().status).toBe('playing');
    player.stop();expect(player.getSnapshot().story).toBeNull();expect(clips[0].src).toBe('');
  });
  it('recovers from autoplay restrictions with an explicit click',async()=>{
    const {player,clips}=setup();player.open(story,'en','story.mp3');
    clips[0].error=Object.assign(new Error('blocked'),{name:'NotAllowedError'});
    await player.play();expect(player.getSnapshot().status).toBe('ready');await player.play();expect(player.getSnapshot().status).toBe('playing');
  });
  it('retains verified text when audio is missing or a network error occurs',()=>{
    const {player,clips}=setup();player.open(story,'ar',undefined,true);
    expect(player.getSnapshot().story?.ar).toBe(story.ar);expect(player.getSnapshot().status).toBe('unavailable');expect(clips).toHaveLength(0);
    player.open(story,'en','broken.mp3');clips[0].onerror?.();
    expect(player.getSnapshot().status).toBe('unavailable');expect(player.getSnapshot().story?.en).toBe(story.en);expect(clips[0].src).toBe('');
  });
  it('does not resurrect playback after leaving a scene during a pending play',async()=>{
    const {player,clips}=setup();player.open(story,'en','story.mp3');
    let resolve:()=>void=()=>{};clips[0].play.mockImplementationOnce(()=>new Promise<void>(done=>{resolve=done;}));
    const pending=player.play();player.stop();resolve();await pending;
    expect(player.getSnapshot().status).toBe('idle');expect(clips[0].pause).toHaveBeenCalledTimes(2);
  });
});
