import { describe,expect,it } from 'vitest';
import { MISSIONS } from '../content/missions';
import { interiorFor } from '../content/interior';
import { PACKAGES } from '../content/packages';
import { replay,step,whatIfDesign } from './reducer';
import type { Action,MissionDefinition } from './types';

const launchActions=(m:MissionDefinition):Action[]=>{
  const d=PACKAGES[m.id]![1].design;
  return [{type:'ANSWER_PRE_QUIZ',answers:{}},{type:'SET_PRIORITY',hypothesisId:m.hypotheses[0].id},{type:'ADVANCE',to:'workshop'},
    ...Object.entries(d.selections).map(([slot,optionId])=>({type:'SELECT_COMPONENT',slot,optionId}) as Action),...d.addons.map(optionId=>({type:'TOGGLE_ADDON',optionId}) as Action),{type:'REQUEST_REVIEW'},{type:'CONFIRM_LAUNCH'}];
};
describe.each(MISSIONS)('$id post-launch orientation',mission=>{
  it('requires launch authorization and keeps teaching separate from resources and assessment scores',()=>{
    const initial=replay(mission,81,[]);
    expect(step(mission,initial,{type:'ADVANCE',to:'interior'},0)).toBe(initial);
    const launched=replay(mission,81,launchActions(mission));
    let s=step(mission,launched,{type:'ADVANCE',to:'interior'},30);
    expect(s.stage).toBe('interior');
    expect(step(mission,s,{type:'FINISH_INTERIOR'},31)).toBe(s);
    expect(step(mission,s,{type:'ADVANCE',to:'surface'},31)).toBe(s);
    for(const topic of interiorFor(mission.id).topics){
      expect(step(mission,s,{type:'INTERIOR_NEXT'},32)).toBe(s);
      s=step(mission,s,{type:'INTERIOR_ANSWER',topicId:topic.id,optionId:'other'},33);
      expect(step(mission,s,{type:'INTERIOR_ANSWER',topicId:topic.id,optionId:'best'},34)).toBe(s);
      s=step(mission,s,{type:'INTERIOR_NEXT'},35);
    }
    expect(s.quiz).toEqual(launched.quiz);expect(s.design).toEqual(launched.design);expect(s.ops).toEqual(launched.ops);expect(s.crew).toEqual(launched.crew);expect(s.flags).toEqual(launched.flags);expect(s.evidence).toEqual(launched.evidence);
    const done=step(mission,s,{type:'FINISH_INTERIOR'},36);
    expect(done.stage).toBe(mission.id==='m4-cosmic-photographer'?'observe':'orbit');
    expect(step(mission,done,{type:'FINISH_INTERIOR'},37)).toBe(done);
    if(mission.type!=='crewed')expect(done.crew).toBeUndefined();
    if(mission.type==='telescope')expect(done.scope).toEqual({night:1,hoursLeft:mission.telescope!.hoursPerNight,pointed:false,images:[]});
  });
  it('persists answer feedback, skips exactly once, and replays old version-1 action logs',()=>{
    const actions:Action[]=[...launchActions(mission),{type:'ADVANCE',to:'interior'},{type:'INTERIOR_EXAMINE',topicId:interiorFor(mission.id).topics[0].id},{type:'INTERIOR_ANSWER',topicId:interiorFor(mission.id).topics[0].id,optionId:'best'}];
    const saved=replay(mission,81,actions);expect(saved.interior?.answers).toHaveProperty(interiorFor(mission.id).topics[0].id,'best');
    expect(replay(mission,81,JSON.parse(JSON.stringify(actions)))).toEqual(saved);
    const skipped=step(mission,saved,{type:'FINISH_INTERIOR',skip:true},40);expect(skipped.interior?.skipped).toBe(true);
    expect(step(mission,skipped,{type:'FINISH_INTERIOR',skip:true},41)).toBe(skipped);
    const legacy=replay(mission,81,[...launchActions(mission),{type:'ADVANCE',to:mission.id==='m4-cosmic-photographer'?'observe':'orbit'}]);
    expect(legacy.stage).toBe(skipped.stage);expect(legacy.ops).toEqual(skipped.ops);expect(legacy.scope).toEqual(skipped.scope);expect(legacy.quiz).toEqual(skipped.quiz);
    const comparison=whatIfDesign(mission,81,[...actions,{type:'FINISH_INTERIOR',skip:true}],[]);
    expect(comparison.passedReview).toBe(true);expect(comparison.alternative.interior).toEqual(skipped.interior);expect(comparison.alternative.quiz).toEqual(skipped.quiz);
  });
});
