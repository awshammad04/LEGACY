// Generate verified English/Arabic recordings ahead of time. The browser never calls Gemini.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Mp3Encoder } from '@breezystack/lamejs';
import { existingKey, geminiVoice } from './gemini-tts.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const original=JSON.parse(fs.readFileSync(path.join(root,'src/content/stories.json'),'utf8'));
const added=JSON.parse(fs.readFileSync(path.join(root,'src/content/narration.json'),'utf8'));
const {voice,model}=original;
const interior=JSON.parse(fs.readFileSync(path.join(root,'src/content/interior.json'),'utf8'));
const stories=[...original.stories,...added.stories,...interior.missions.flatMap(m=>m.topics.map(t=>({siteId:m.missionId.slice(0,2)+'-interior-'+t.id,...t.learn})))];
const outDir=path.join(root,'public/assets/stories');
fs.mkdirSync(outDir,{recursive:true});
const manifestFile=path.join(root,'src/content/story-recordings.json');
const manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8')):{version:1,voice,assets:{}};
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const force=process.argv.includes('--force');
const only=arg('--only','').split(',').filter(Boolean);
const ids=arg('--ids','').split(',').filter(Boolean); // exact recordings to (re)generate, e.g. m1-heritage-en
const maxRequests=Math.max(0,Math.min(100,Number(arg('--max-requests','64'))));
const hash=value=>createHash('sha256').update(value).digest('hex');
let client,generated=0,cached=0,failed=0;
const save=()=>fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');

/** WAV (or raw 16-bit PCM) → mono MP3 at 48 kbps (~6 KB per second of speech). */
function toMp3({ buf, mime }) {
  let rate = Number((mime.match(/rate=(\d+)/) || [])[1]) || 24000;
  let pcm = buf;
  if (buf.slice(0, 4).toString() === 'RIFF') {
    rate = buf.readUInt32LE(24);
    let off = 12;
    while (off < buf.length - 8) {
      const id = buf.slice(off, off + 4).toString();
      const size = buf.readUInt32LE(off + 4);
      if (id === 'data') {
        pcm = buf.slice(off + 8, off + 8 + size);
        break;
      }
      off += 8 + size;
    }
  }
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  const enc = new Mp3Encoder(1, rate, 48);
  const chunks = [];
  for (let i = 0; i < samples.length; i += 1152) {
    const b = enc.encodeBuffer(samples.subarray(i, i + 1152));
    if (b.length) chunks.push(Buffer.from(b));
  }
  chunks.push(Buffer.from(enc.flush()));
  return { mp3: Buffer.concat(chunks), seconds: samples.length / rate };
}

for(const s of stories)for(const lang of ['en','ar']) {
  const id=s.siteId+'-'+lang,file=path.join(outDir,id+'.mp3');
  const entry=manifest.assets[id];
  if(!force&&fs.existsSync(file)&&(!entry||(entry.text===s[lang]&&entry.sha256===hash(fs.readFileSync(file))))) {
    if(!entry)manifest.assets[id]={text:s[lang],sha256:hash(fs.readFileSync(file)),model:'existing-recording',voice};
    cached++;continue;
  }
  if(only.length&&!only.includes(s.siteId))continue;
  if(ids.length&&!ids.includes(id))continue;
  try {
    client??=geminiVoice({key:existingKey(root),model,voice,maxRequests});
    const result=await client.synthesize(s[lang],lang);
    const {mp3,seconds}=toMp3(result);
    if(seconds<0.25||mp3.length<512)throw Error('Empty voice response.');
    const temporary=file+'.tmp';fs.writeFileSync(temporary,mp3);fs.renameSync(temporary,file);
    manifest.assets[id]={text:s[lang],sha256:hash(mp3),seconds,model:result.model,voice};
    generated++;save();console.log(id+': generated '+seconds.toFixed(1)+' seconds ('+result.model+').');
  } catch {
    failed++;console.warn(id+': audio unavailable; verified text remains available.');
    if(client&&client.requests>=maxRequests)break;
  }
}
save();console.log(JSON.stringify({generated,cached,failed,requests:client?.requests??0}));
if(failed)process.exitCode=2;
