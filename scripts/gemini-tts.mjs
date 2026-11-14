// Server/build tooling only. Never import this module into the Vite application.
import fs from 'node:fs';
import path from 'node:path';

export function existingKey(root) {
  const envFile = path.join(root, '.env.local');
  const env = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
  const value = process.env.GEMINI_API_KEY || env.match(/^\s*GEMINI_API_KEY\s*=\s*(.+)$/m)?.[1]?.trim();
  if (!value) throw new Error('Existing Gemini configuration is unavailable. Text fallback remains available.');
  return value.replace(/^(['"])(.*)\1$/, '$2');
}

const STYLE = {
  en: 'Warm, calm documentary narration for curious teenagers. Clear, natural English. Read only the supplied transcript, without adding or changing facts.',
  ar: 'راوٍ وثائقي دافئ وهادئ للشباب. عربية فصحى واضحة وطبيعية. اقرأ النص المرفق فقط دون إضافة حقائق أو تغييرها.',
};

/** One bounded client, reusing the configured model, Charon voice, and Gemini REST API. */
export function geminiVoice({key, model, voice, maxRequests = 64, minIntervalMs = 5000}) {
  const models = [...new Set([model, 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts'])];
  const unavailable = new Set();
  let requests = 0, lastRequest = 0;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  return {
    get requests() { return requests; },
    async synthesize(text, lang) {
      for (let attempt = 0; attempt < 3;) {
        const selected = models.find(name => !unavailable.has(name));
        if (!selected || requests >= maxRequests) throw new Error('Gemini generation request limit reached; retaining verified text.');
        await sleep(Math.max(0, minIntervalMs - (Date.now() - lastRequest)));
        lastRequest = Date.now(); requests++;
        const modern = selected.startsWith('gemini-3.8-');
        // 3.8 separates style metadata from its verbatim transcript; older models retain the existing API.
        const body = modern ? {
          model: selected,
          input: [{type:'user_input', content:[{type:'text', text, annotations:[{type:'speech_metadata', style:STYLE[lang]}]}]}],
          response_format:{type:'audio'}, generation_config:{speech_config:[{voice}]},
        } : {
          contents:[{parts:[{text:STYLE[lang]+'\n\n'+text}]}],
          generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}},
        };
        try {
          const response = await fetch(modern ? 'https://generativelanguage.googleapis.com/v1beta/interactions' :
            `https://generativelanguage.googleapis.com/v1beta/models/${selected}:generateContent`, {
            method:'POST', headers:{'x-goog-api-key':key,'content-type':'application/json'},
            body:JSON.stringify(body), signal:AbortSignal.timeout(90_000),
          });
          const result = await response.json();
          if ([400,404].includes(response.status)) { unavailable.add(selected); console.warn(`Voice model unavailable: ${selected} (HTTP ${response.status}).`); continue; }
          if (response.status === 401 || response.status === 403) throw new Error('Existing Gemini credentials are not authorized.');
          if (response.status === 429) {
            if (/PerDay|per.day|daily/i.test(JSON.stringify(result))) { unavailable.add(selected); continue; }
            attempt++; await sleep(Math.min(60_000, Math.max(22_000, Number(response.headers.get('retry-after') || 0)*1000))); continue;
          }
          if (!response.ok) { attempt++; console.warn(`Voice generation retry (HTTP ${response.status}).`); continue; }
          const audio = modern ? result.steps?.filter(step=>step.type==='model_output').flatMap(step=>step.content??[]).find(part=>part.type==='audio') :
            result.candidates?.[0]?.content?.parts?.find(part=>part.inlineData)?.inlineData;
          if (!audio?.data) { attempt++; continue; }
          return {buf:Buffer.from(audio.data,'base64'),mime:audio.mime_type??audio.mimeType??'audio/pcm;rate=24000',model:selected};
        } catch (error) {
          // Do not log response bodies, request headers, credentials, or raw network errors.
          if (error.message === 'Existing Gemini credentials are not authorized.') throw error;
          attempt++; console.warn('Voice generation was interrupted; retrying within the request limit.');
        }
      }
      throw new Error('Gemini voice temporarily unavailable; retaining verified text.');
    },
  };
}
