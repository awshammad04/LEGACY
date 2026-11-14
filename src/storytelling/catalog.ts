import ORIGINAL from '../content/stories.json';
import MOMENTS from '../content/narration.json';
import MANIFEST from '../content/story-recordings.json';
import { INTERIORS, interiorStoryId } from '../content/interior';
import type { Lang, LText, MissionId } from '../core/types';

export interface Story {
  siteId: string;
  missionId?: string;
  title: LText;
  en: string;
  ar: string;
  sourceIds?: string[];
}
interface Recording { text: string; sha256: string; voice: string; model: string }
const interiorStories:Story[]=INTERIORS.flatMap(m=>m.topics.map(topic=>({siteId:interiorStoryId(m.missionId,topic.id),missionId:m.missionId,title:topic.title,en:topic.learn.en,ar:topic.learn.ar,sourceIds:[topic.sourceId]})));
export const STORIES: Story[] = [...ORIGINAL.stories, ...MOMENTS.stories,...interiorStories];
export const BY_STORY = new Map(STORIES.map(story => [story.siteId, story]));
const recordings = MANIFEST.assets as Record<string, Recording>;
export const isSiteStory = (id: string) => ORIGINAL.stories.some(story => story.siteId === id);
export function storyMission(story: Story): MissionId | undefined {
  if (story.missionId) return story.missionId as MissionId;
  if (story.siteId.startsWith('m1-')) return 'm1-apollo';
  if (story.siteId.startsWith('m3-')) return 'm3-lost-rover';
  if (story.siteId.startsWith('site-')) return 'm2-martian-mystery';
  return undefined;
}
export function recordingUrl(story: Story, lang: Lang) {
  const recording = recordings[`${story.siteId}-${lang}`];
  // An edited transcript must never play a stale recording with different subtitles.
  if (!recording || recording.text !== story[lang]) return undefined;
  return `${import.meta.env.BASE_URL}assets/stories/${story.siteId}-${lang}.mp3?v=${recording.sha256.slice(0,12)}`;
}
export const missionStoryId = (id: MissionId, kind: 'intro' | 'discovery' | 'ending') => `${id.slice(0,2)}-${kind}`;
