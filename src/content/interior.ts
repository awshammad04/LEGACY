import type { CruiseStep, LearnCard, MissionId } from '../core/types';
import DATA from './interior.json' with {type:'json'};

export interface InteriorTopic {
  id: string;
  title: {en:string;ar:string};
  prompt: {en:string;ar:string};
  learn: {en:string;ar:string};
  sourceId: string;
  options: CruiseStep['options'];
}
export interface InteriorConfig {
  missionId: MissionId;
  destination: 'moon'|'mars'|'orbit';
  topics: InteriorTopic[];
}
export const INTERIORS=DATA.missions as InteriorConfig[];
export const interiorFor=(id:MissionId)=>INTERIORS.find(m=>m.missionId===id)!;
export const interiorStoryId=(id:MissionId,topic:string)=>`${id.slice(0,2)}-interior-${topic}`;
export function interiorCard(id:MissionId,topic:InteriorTopic):LearnCard {
  return {compact:true,id:interiorStoryId(id,topic.id),name:topic.title,what:topic.learn,does:topic.prompt,why:topic.learn,
    connection:{en:'Explore the equipment, then try the short practice question. Your mission design and assessment scores are unchanged.',ar:'استكشف المعدات ثم جرّب السؤال التدريبي القصير. لا يتغير تصميم مهمتك أو درجات التقييم.'},sourceId:topic.sourceId,provenance:topic.sourceId==='legacy-game-model'?'fictional':'verified'};
}
