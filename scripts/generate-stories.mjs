// Generates the narrated site stories (English + Arabic) with Gemini text-to-speech.
// Run once, offline from the game:  node scripts/generate-stories.mjs [--force]
// The API key is read from GEMINI_API_KEY in .env.local (git-ignored) and is NEVER shipped to the browser:
// the game only loads the resulting MP3 files from public/assets/stories/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Mp3Encoder } from '@breezystack/lamejs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = fs.existsSync(path.join(root, '.env.local')) ? fs.readFileSync(path.join(root, '.env.local'), 'utf8') : '';
const KEY = process.env.GEMINI_API_KEY || (env.match(/^GEMINI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) throw new Error('Set GEMINI_API_KEY in .env.local');

const { stories, voice, model } = JSON.parse(fs.readFileSync(path.join(root, 'src/content/stories.json'), 'utf8'));
const outDir = path.join(root, 'public/assets/stories');
fs.mkdirSync(outDir, { recursive: true });
const force = process.argv.includes('--force');

const STYLE = {
  en: 'Read this aloud as a warm, calm documentary narrator for curious teenagers. Unhurried, clear, with gentle wonder:\n\n',
  ar: 'اقرأ النص التالي بالعربية الفصحى بصوت راوٍ وثائقي دافئ وهادئ لجمهور من الشباب، بإيقاع غير متعجّل ونطق واضح:\n\n',
};

// Free-tier quotas are per model and per day, so fall back through the available voice models.
const MODELS = [model, 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts'];
const exhausted = new Set();

async function tts(text, lang) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const m = MODELS.find((x) => !exhausted.has(x));
    if (!m) throw new Error('every voice model has used its daily quota — try again tomorrow');
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: STYLE[lang] + text }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
        }),
      });
      const j = await r.json();
      if (r.status === 429 && /PerDay/.test(JSON.stringify(j))) {
        console.warn(`  ${m}: daily quota used — switching model`);
        exhausted.add(m);
        attempt--;
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
      const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (!part) throw new Error('no audio in response');
      return { buf: Buffer.from(part.inlineData.data, 'base64'), mime: part.inlineData.mimeType, model: m };
    } catch (e) {
      console.warn(`  attempt ${attempt} (${m}) failed: ${e.message}`);
      await new Promise((res) => setTimeout(res, 4000 * attempt));
    }
  }
  throw new Error('giving up');
}

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

for (const s of stories) {
  for (const lang of ['en', 'ar']) {
    const file = path.join(outDir, `${s.siteId}-${lang}.mp3`);
    if (fs.existsSync(file) && !force) {
      console.log(`skip ${path.basename(file)}`);
      continue;
    }
    const t0 = Date.now();
    const res = await tts(s[lang], lang);
    const { mp3, seconds } = toMp3(res);
    fs.writeFileSync(file, mp3);
    console.log(`${path.basename(file)}  [${res.model}]  ${seconds.toFixed(1)} s  ${(mp3.length / 1024).toFixed(0)} KB  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
}
console.log('done');
