import { describe, expect, it } from 'vitest';
import { MISSIONS, M4 } from '../content/missions';
import { PACKAGES } from '../content/packages';
import { replay, step } from '../core/reducer';
import type { Action } from '../core/types';
import { BY_STORY, recordingUrl, storyMission } from './catalog';
import { storyForChange } from './triggers';
import { SOURCES } from '../content/sources';

describe('verified story catalog',()=>{
  it('has unique bilingual stories and only registered source references',()=>{
    for(const [id,story] of BY_STORY){
      expect(story.siteId).toBe(id);expect(story.en.length).toBeGreaterThan(20);expect(story.ar.length).toBeGreaterThan(20);
      for(const source of story.sourceIds??[])expect(SOURCES.some(entry=>entry.id===source),source).toBe(true);
    }
  });
  it.each(MISSIONS)('$id has its own introduction, discovery and ending',mission=>{
    for(const type of ['intro','discovery','ending']){
      const story=BY_STORY.get(`${mission.id.slice(0,2)}-${type}`)!;
      expect(storyMission(story)).toBe(mission.id);
    }
  });
  it('keeps original Opportunity narration and valid English/Arabic recordings',()=>{
    const story=BY_STORY.get('m3-opportunity')!;
    expect(story.en).toContain('Opportunity landed on Mars in January 2004.');
    expect(recordingUrl(story,'en')).toContain('m3-opportunity-en.mp3?v=');
    expect(recordingUrl(story,'ar')).toContain('m3-opportunity-ar.mp3?v=');
    expect(recordingUrl({...story,en:'Changed text.'},'en')).toBeUndefined();
  });
});

describe.each(MISSIONS)('$id accepted gameplay cues',mission=>{
  const design=PACKAGES[mission.id]![1].design;
  const actions:Action[]=[{type:'ANSWER_PRE_QUIZ',answers:{}},{type:'SET_PRIORITY',hypothesisId:mission.hypotheses[0].id},{type:'ADVANCE',to:'workshop'},
    ...Object.entries(design.selections).map(([slot,optionId])=>({type:'SELECT_COMPONENT',slot,optionId}) as Action),
    ...design.addons.map(optionId=>({type:'TOGGLE_ADDON',optionId}) as Action)];
  it('narrates review and launch only after valid actions',()=>{
    const before=replay(mission,1,actions);
    expect(storyForChange(mission,before,before,{type:'CONFIRM_LAUNCH'})).toBeUndefined();
    const review=step(mission,before,{type:'REQUEST_REVIEW'},actions.length);
    expect(storyForChange(mission,before,review,{type:'REQUEST_REVIEW'})).toBe('engineering-check');
    const launch=step(mission,review,{type:'CONFIRM_LAUNCH'},actions.length+1);
    expect(storyForChange(mission,review,launch)).toBe('mission-launch');
  });
  it('uses a mission-specific discovery and ending without inventing a result',()=>{
    const before=replay(mission,1,actions);
    const found={...before,evidence:{...before.evidence,observations:[{id:'existing-measurement',quality:'good' as const,sol:1}]}};
    expect(storyForChange(mission,before,found)).toBe(`${mission.id.slice(0,2)}-discovery`);
    expect(storyForChange(mission,found,{...found,stage:'debrief'})).toBe(`${mission.id.slice(0,2)}-ending`);
  });
});

it('telescope stories require actual pointing, spectrum or three different observing nights',()=>{
  const before=replay(M4,1,[]);
  const pointed={...before,scope:{night:1,hoursLeft:5,pointed:true,images:[]}};
  expect(storyForChange(M4,before,pointed)).toBe('m4-supernova');
  expect(storyForChange(M4,pointed,{...pointed,scope:{...pointed.scope,spectrum:'good'}})).toBe('m4-spectrum');
  const image=(night:number)=>({night,filter:'visible' as const,exposure:0.5,snr:12,quality:'good' as const});
  expect(storyForChange(M4,pointed,{...pointed,scope:{...pointed.scope,images:[image(1),image(1),image(1)]}})).toBeUndefined();
  expect(storyForChange(M4,pointed,{...pointed,scope:{...pointed.scope,images:[image(1),image(2),image(3)]}})).toBe('m4-light-curve');
});
