// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../game/store';
import { useLive } from '../game/live';
import { MISSIONS } from '../content/missions';
import { narration } from './player';
import { StorytellingHost } from './StorytellingHost';
import { BY_STORY } from './catalog';

const clips: MockAudio[]=[];
class MockAudio {
  src='';preload='';volume=1;muted=false;currentTime=0;duration=30;
  onplay:(()=>void)|null=null;onpause:(()=>void)|null=null;onended:(()=>void)|null=null;ontimeupdate:(()=>void)|null=null;onerror:(()=>void)|null=null;
  constructor(){clips.push(this);}
  play=vi.fn(async()=>{this.onplay?.();});pause=vi.fn(()=>this.onpause?.());load=vi.fn();removeAttribute=vi.fn(()=>{this.src='';});
}
beforeEach(()=>{
  localStorage.clear();clips.length=0;vi.stubGlobal('Audio',MockAudio);
  useGame.getState().exitToHome();useGame.getState().setSettings({lang:'en',storyNarration:true,storyVolume:0.6});
  useLive.getState().set({nearSiteId:undefined});
});
afterEach(()=>{cleanup();narration.stop();vi.unstubAllGlobals();});

describe('shared storytelling host',()=>{
  it.each(MISSIONS)('$id speaks the correct introduction, switches language safely, and stops on exit',async mission=>{
    render(<StorytellingHost />);
    act(()=>useGame.getState().startMission(mission.id));
    const id=`${mission.id.slice(0,2)}-intro`;
    await waitFor(()=>expect(narration.getSnapshot().story?.siteId).toBe(id));
    expect(clips).toHaveLength(1);expect(clips[0].play).toHaveBeenCalledTimes(1);
    act(()=>useGame.getState().setSettings({lang:'ar'}));
    expect(clips[0].src).toBe('');expect(narration.getSnapshot().lang).toBe('ar');
    expect(clips[1].play).not.toHaveBeenCalled();
    expect(document.querySelector('.story-text')?.textContent).toBe(BY_STORY.get(id)!.ar);
    act(()=>useGame.getState().exitToHome());
    expect(narration.getSnapshot().story).toBeNull();expect(clips[1].src).toBe('');
  });
  it('does not create duplicate audio or lose the active story under Strict Mode',()=>{
    useGame.getState().startMission('m3-lost-rover');
    render(<StrictMode><StorytellingHost /></StrictMode>);
    expect(clips).toHaveLength(1);expect(narration.getSnapshot().story?.siteId).toBe('m3-intro');
  });
  it('preserves site discovery history and permits explicit replay without changing the save',()=>{
    render(<StorytellingHost />);
    act(()=>{
      useGame.getState().startMission('m3-lost-rover');
      const state=useGame.getState().state!;
      useGame.setState({state:{...state,stage:'surface'}});
      useLive.getState().set({nearSiteId:'m3-opportunity'});
    });
    expect(narration.getSnapshot().story?.siteId).toBe('m3-opportunity');
    const save=useGame.getState().saves['m3-lost-rover'];
    const count=clips.length;
    act(()=>{useLive.getState().set({nearSiteId:undefined});useLive.getState().set({nearSiteId:'m3-opportunity'});});
    expect(clips).toHaveLength(count);
    act(()=>window.dispatchEvent(new CustomEvent('legacy:story',{detail:'m3-opportunity'})));
    expect(clips).toHaveLength(count+1);expect(useGame.getState().saves['m3-lost-rover']).toBe(save);
    act(()=>useGame.getState().startMission('m4-cosmic-photographer'));
    act(()=>window.dispatchEvent(new CustomEvent('legacy:story',{detail:'m3-opportunity'})));
    expect(narration.getSnapshot().story?.siteId).toBe('m4-intro');
  });
});
