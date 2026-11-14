import { interiorCard, interiorFor, interiorStoryId } from '../content/interior';
import { useGame, useUi } from './store';

/** The mesh hotspot and its accessible HUD button use the same accepted action. */
export function examineInterior(topicId:string) {
  const {view,state,missionId,dispatch}=useGame.getState();
  if(view!=='mission'||state?.stage!=='interior'||!missionId)return;
  const topic=interiorFor(missionId).topics.find(t=>t.id===topicId);if(!topic)return;
  dispatch({type:'INTERIOR_EXAMINE',topicId});
  useUi.getState().set({learnCard:interiorCard(missionId,topic)});
  // Explicit examination/replay is allowed even when the story has already been heard.
  window.dispatchEvent(new CustomEvent('legacy:story',{detail:interiorStoryId(missionId,topic.id)}));
}
