import type { Action, MissionDefinition, MissionState } from '../core/types';
import { missionStoryId } from './catalog';
import { interiorStoryId } from '../content/interior';

/** Only accepted gameplay changes generate narrative cues; no invented results or polling loop. */
export function storyForChange(mission: MissionDefinition, before: MissionState, after: MissionState, action?: Action): string | undefined {
  if(before===after)return;
  if(after.stage==='interior'&&(action?.type==='INTERIOR_ANSWER'||action?.type==='INTERIOR_EXAMINE'))return interiorStoryId(mission.id,action.topicId);
  if(after.stage==='debrief'&&before.stage!=='debrief')return missionStoryId(mission.id,'ending');
  if(after.stage==='launch'&&before.stage!=='launch'&&after.launched)return 'mission-launch';
  if(after.pendingEvent&&after.pendingEvent!==before.pendingEvent)return 'control-warning';
  if(action?.type==='REQUEST_REVIEW'&&after.stage==='review')return 'engineering-check';
  if(action?.type==='EVENT_CHOICE') {
    const event=mission.events.find(event=>event.id===action.eventId);
    const option=event?.options.find(option=>option.id===action.optionId);
    if(option?.unsafe)return 'control-risk';
    if(event?.best===action.optionId)return 'control-safety';
  }
  if(action?.type==='CREW_CHOICE') {
    const step=mission.cruise?.find(step=>step.id===action.stepId);
    if(step?.options.find(option=>option.id===action.optionId)?.unsafe)return 'control-risk';
  }
  if(mission.id==='m4-cosmic-photographer') {
    if(!before.scope?.spectrum&&after.scope?.spectrum)return 'm4-spectrum';
    const nights=(s:MissionState)=>new Set(s.scope?.images.map(image=>image.night)).size;
    if(nights(before)<3&&nights(after)>=3)return 'm4-light-curve';
    if(!before.scope?.pointed&&after.scope?.pointed)return 'm4-supernova';
  }
  if(before.evidence.observations.length===0&&after.evidence.observations.length>0)return missionStoryId(mission.id,'discovery');
}
