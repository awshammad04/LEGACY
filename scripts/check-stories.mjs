// Offline asset integrity check. Does not read credentials or contact Gemini.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'src/content',name),'utf8'));
const original=read('stories.json'), added=read('narration.json'), manifest=read('story-recordings.json');
const stories=[...original.stories,...added.stories];
const ids=new Set();let recordings=0,bytes=0;
for(const story of stories){
  if(ids.has(story.siteId))throw Error('Duplicate story: '+story.siteId);
  ids.add(story.siteId);
  for(const lang of ['en','ar']){
    const id=story.siteId+'-'+lang,entry=manifest.assets[id];
    if(!story[lang]||entry?.text!==story[lang]||entry.voice!==original.voice)throw Error('Transcript/voice mismatch: '+id);
    const audio=fs.readFileSync(path.join(root,'public/assets/stories',id+'.mp3'));
    if(audio.length<512||createHash('sha256').update(audio).digest('hex')!==entry.sha256)throw Error('Recording integrity failed: '+id);
    recordings++;bytes+=audio.length;
  }
}
if(Object.keys(manifest.assets).length!==recordings)throw Error('Recording manifest contains stale entries.');
console.log(JSON.stringify({stories:ids.size,recordings,bytes,matchingTranscripts:true,matchingHashes:true,voice:original.voice}));
