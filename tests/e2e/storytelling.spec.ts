import { expect, test, type Page } from '@playwright/test';
import MOMENTS from '../../src/content/narration.json' with {type:'json'};
import ORIGINAL from '../../src/content/stories.json' with {type:'json'};
import AR from '../../src/game/ar.json' with {type:'json'};
import { MISSIONS } from '../../src/content/missions';
import { PACKAGES } from '../../src/content/packages';
import type { MissionId } from '../../src/core/types';

const ar=(text:string)=>(AR as Record<string,string>)[text];
test.use({viewport:{width:1440,height:900},launchOptions:{args:[]},actionTimeout:15_000});
const card=(page:Page)=>page.locator('.story-card');

async function initialize(page:Page, blockedAutoplay=false) {
  await page.addInitScript(blocked=>{
    const NativeAudio=window.Audio;
    (window as any).__storyClips=[];
    const AudioWrapper=function(src?:string){const clip=new NativeAudio(src);(window as any).__storyClips.push(clip);return clip;};
    AudioWrapper.prototype=NativeAudio.prototype;window.Audio=AudioWrapper as unknown as typeof Audio;
    const play=HTMLMediaElement.prototype.play;let deny=blocked;
    HTMLMediaElement.prototype.play=function(){if(deny){deny=false;return Promise.reject(new DOMException('Awaiting user interaction','NotAllowedError'));}return play.call(this);};
  },blockedAutoplay);
  await page.goto('/?test=1');await page.waitForFunction(()=>!!(window as any).__legacy);
  await page.evaluate(()=>{(window as any).__legacy.useGame.getState().setSettings({lang:'en',sfx:false,narration:false,storyNarration:true,storyVolume:0.8});});
}
const activeCount=(page:Page)=>page.evaluate(()=>(window as any).__storyClips.filter((clip:HTMLAudioElement)=>!clip.paused&&!clip.ended&&!!clip.currentSrc).length);
async function listen(page:Page,arabic=false){
  if(await card(page).getAttribute('data-playback')!=='playing')await card(page).getByRole('button',{name:arabic?ar('Listen'):'Listen',exact:true}).click();
  await expect(card(page)).toHaveAttribute('data-playback','playing');
  await expect.poll(()=>activeCount(page)).toBe(1);
}

for(const mission of MISSIONS)test(`${mission.id}: real Gemini recordings, both languages, controls and scene cleanup`,async({page},info)=>{
  const apiRequests:string[]=[];page.on('request',request=>{if(request.url().includes('generativelanguage.googleapis.com'))apiRequests.push(request.url());});
  await initialize(page,true);
  await page.evaluate(id=>(window as any).__legacy.useGame.getState().startMission(id),mission.id);
  const story=MOMENTS.stories.find(story=>story.siteId===`${mission.id.slice(0,2)}-intro`)!;
  await expect(card(page)).toHaveAttribute('data-story-id',story.siteId);
  await expect(card(page)).toHaveAttribute('data-playback','ready');
  await expect(card(page).locator('.story-text')).toHaveText(story.en);
  const panel=await card(page).boundingBox(), question=await page.locator('#q-prompt').boundingBox();
  expect(panel!.x).toBeGreaterThan(question!.x+question!.width);
  await listen(page);
  await card(page).getByRole('button',{name:'Pause',exact:true}).click();
  const time=await page.evaluate(()=>(window as any).__storyClips.at(-1).currentTime);
  await page.waitForTimeout(400);
  expect(await page.evaluate(()=>(window as any).__storyClips.at(-1).currentTime)).toBeCloseTo(time,1);
  await card(page).getByRole('button',{name:'Resume listening',exact:true}).click();
  await card(page).getByRole('button',{name:'Replay story',exact:true}).click();
  await expect(card(page)).toHaveAttribute('data-playback','playing');
  await card(page).getByRole('button',{name:'Pause',exact:true}).click();
  await expect(card(page)).toHaveAttribute('data-playback','paused');
  await card(page).getByRole('button',{name:'Resume listening',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__storyClips.at(-1).currentTime)).toBeLessThan(1);
  await card(page).getByText('Narration options',{exact:true}).click();
  await card(page).getByRole('button',{name:'Mute narration',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).__storyClips.at(-1).muted)).toBe(true);
  await card(page).getByRole('button',{name:'Unmute narration',exact:true}).click();
  const volume=card(page).getByRole('slider',{name:'Narration volume',exact:true});
  await volume.focus();await volume.press('Home');for(let i=0;i<7;i++)await volume.press('ArrowRight');
  expect(await page.evaluate(()=>(window as any).__storyClips.at(-1).volume)).toBeCloseTo(0.35);
  expect(await page.evaluate(()=>(window as any).__storyClips.length)).toBe(1);
  await page.screenshot({path:info.outputPath('english.png')});
  await page.getByRole('button',{name:'التبديل إلى العربية'}).click();
  await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  await expect(card(page).locator('.story-text')).toHaveText(story.ar);
  const rtlPanel=await card(page).boundingBox(), rtlQuestion=await page.locator('#q-prompt').boundingBox();
  expect(rtlPanel!.x+rtlPanel!.width).toBeLessThan(rtlQuestion!.x);
  await expect(card(page)).toHaveAttribute('data-playback','ready');
  expect(await activeCount(page)).toBe(0);await listen(page,true);
  expect(await page.evaluate(()=>(window as any).__storyClips[0].paused)).toBe(true);
  await page.screenshot({path:info.outputPath('arabic.png')});
  await card(page).getByRole('button',{name:ar('Skip narration'),exact:true}).click();await expect(card(page)).toHaveCount(0);
  await expect.poll(()=>activeCount(page)).toBe(0);
  // Start another mission while a story is playing; the previous source must be released.
  await page.evaluate(id=>(window as any).__legacy.useGame.getState().startMission(id),mission.id);
  await listen(page,true);
  const next=MISSIONS[(MISSIONS.indexOf(mission)+1)%MISSIONS.length];
  await page.evaluate(id=>(window as any).__legacy.useGame.getState().startMission(id),next.id);
  await expect(card(page)).toHaveAttribute('data-story-id',`${next.id.slice(0,2)}-intro`);
  expect(await activeCount(page)).toBeLessThanOrEqual(1);
  await page.evaluate(()=>(window as any).__legacy.useGame.getState().exitToHome());await expect(card(page)).toHaveCount(0);
  await expect.poll(()=>activeCount(page)).toBe(0);expect(apiRequests).toEqual([]);
});

async function operations(page:Page,id:MissionId){
  const mission=MISSIONS.find(mission=>mission.id===id)!;
  await initialize(page);
  await page.evaluate(({id,priority,design,cruise})=>{
    const g=(window as any).__legacy.useGame.getState;
    g().startMission(id);g().dispatch({type:'ANSWER_PRE_QUIZ',answers:{}});g().dispatch({type:'SET_PRIORITY',hypothesisId:priority});g().dispatch({type:'ADVANCE',to:'workshop'});
    for(const [slot,optionId] of Object.entries(design.selections))g().dispatch({type:'SELECT_COMPONENT',slot,optionId});
    for(const optionId of design.addons)g().dispatch({type:'TOGGLE_ADDON',optionId});
    g().dispatch({type:'REQUEST_REVIEW'});g().dispatch({type:'CONFIRM_LAUNCH'});
    if(id==='m4-cosmic-photographer')g().dispatch({type:'ADVANCE',to:'observe'});
    else {g().dispatch({type:'ADVANCE',to:'orbit'});
      if(id==='m1-apollo'){g().dispatch({type:'ADVANCE',to:'cruise'});for(const step of cruise)g().dispatch({type:'CREW_CHOICE',stepId:step.id,optionId:step.options[0].id});g().dispatch({type:'ADVANCE',to:'surface'});}
      else if(id==='m2-martian-mystery'){g().dispatch({type:'ADVANCE',to:'landingSite'});g().dispatch({type:'CHOOSE_LANDING_SITE',siteId:'site-delta'});}
      else g().dispatch({type:'ADVANCE',to:'surface'});
    }
  },{id,priority:mission.hypotheses[0].id,design:PACKAGES[id]![1].design,cruise:mission.cruise??[]});
  if(id!=='m4-cosmic-photographer')await page.getByRole('button',{name:"Let's go!",exact:true}).click();
}

for(const [id,siteId,pos] of [
  ['m1-apollo','m1-heritage',[-161,45]],
  ['m2-martian-mystery','site-rock',[62,-244]],
  ['m3-lost-rover','m3-opportunity',[50,-250]],
] as const)test(`${id}: exploration story, replay history and save preservation`,async({page},info)=>{
  await operations(page,id);
  await page.evaluate(pos=>{
    const g=(window as any).__legacy.useGame.getState;
    g().dispatch({type:'DRIVE',dist:0,slopeAvg:0,boostFrac:0,bumps:0,pos,heading:0});
  },[...pos]);
  const mission=MISSIONS.find(m=>m.id===id)!;
  for(let i=0;i<5;i++){
    const pending=await page.evaluate(()=>(window as any).__legacy.useGame.getState().state.pendingEvent);
    if(!pending)break;
    const event=mission.events.find(event=>event.id===pending)!;
    await page.evaluate(({eventId,optionId})=>(window as any).__legacy.useGame.getState().dispatch({type:'EVENT_CHOICE',eventId,optionId}),{eventId:pending,optionId:event.best??event.options[0].id});
  }
  await expect.poll(()=>page.evaluate(()=>(window as any).__legacyLive.getState().nearSiteId)).toBe(siteId);
  const original=ORIGINAL.stories.find(story=>story.siteId===siteId)!;
  await page.locator('.prompt').filter({hasText:'Story'}).click();
  await expect(card(page)).toHaveAttribute('data-story-id',siteId);await expect(card(page).locator('.story-text')).toHaveText(original.en);
  await listen(page);await page.screenshot({path:info.outputPath('site-story.png')});
  const saved=await page.evaluate(()=>(window as any).__legacy.useGame.getState().saves);
  await card(page).getByRole('button',{name:'Skip narration',exact:true}).click();
  await page.keyboard.press('t');await expect(card(page)).toHaveAttribute('data-story-id',siteId);
  expect(await page.evaluate(()=>(window as any).__legacy.useGame.getState().saves)).toEqual(saved);
});

test('Mission 04 tells stories for real pointing, observations, spectrum, light curve and ending',async({page},info)=>{
  await operations(page,'m4-cosmic-photographer');
  await page.getByRole('button',{name:/Point at the Pinwheel Galaxy/}).click();
  await expect(card(page)).toHaveAttribute('data-story-id','m4-supernova');await listen(page);
  await page.screenshot({path:info.outputPath('telescope-story.png')});
  await card(page).getByRole('button',{name:'Skip narration',exact:true}).click();
  await page.evaluate(()=>{(window as any).__storyClock=Date.now;Date.now=()=>((window as any).__storyClock())+20_000;});
  await page.getByRole('button',{name:/3. Take image/}).click();
  await expect(card(page)).toHaveAttribute('data-story-id','m4-discovery');
  await card(page).getByRole('button',{name:'Skip narration',exact:true}).click();
  await page.evaluate(()=>{Date.now=()=>((window as any).__storyClock())+40_000;});
  const spectrum=page.getByRole('button',{name:/Take a spectrum/});
  if(await spectrum.count()) {await spectrum.click();await expect(card(page)).toHaveAttribute('data-story-id','m4-spectrum');await card(page).getByRole('button',{name:'Skip narration',exact:true}).click();}
  for(let night=2;night<=3;night++){
    await page.getByRole('button',{name:/Next night/}).click();
    const pending=await page.evaluate(()=>(window as any).__legacy.useGame.getState().state.pendingEvent);
    if(pending)await page.evaluate(eventId=>(window as any).__legacy.useGame.getState().dispatch({type:'EVENT_CHOICE',eventId,optionId:'safe'}),pending);
    if(await card(page).count())await card(page).getByRole('button',{name:'Skip narration',exact:true}).click();
    await page.evaluate(n=>{Date.now=()=>((window as any).__storyClock())+n;},60_000*night);
    await page.getByRole('button',{name:/Point at the Pinwheel Galaxy/}).click();await page.getByRole('button',{name:/3. Take image/}).click();
  }
  await expect(card(page)).toHaveAttribute('data-story-id','m4-light-curve');
  await card(page).getByRole('button',{name:'Skip narration',exact:true}).click();
  await page.getByRole('button',{name:/Send results/}).click();await page.getByRole('button',{name:/brightness changed over the nights/}).click();
  await expect(card(page)).toHaveAttribute('data-story-id','m4-ending');
});

test('missing audio falls back to the verified text without changing mission progress',async({page})=>{
  await page.route('**/assets/stories/m4-intro-en.mp3*',route=>route.abort());await initialize(page);
  await page.evaluate(()=>(window as any).__legacy.useGame.getState().startMission('m4-cosmic-photographer'));
  await expect(card(page)).toHaveAttribute('data-playback','unavailable');
  await expect(card(page).locator('.story-text')).toHaveText(MOMENTS.stories.find(story=>story.siteId==='m4-intro')!.en);
  expect(await page.evaluate(()=>(window as any).__legacy.useGame.getState().state.stage)).toBe('quizPre');
  await card(page).getByRole('button',{name:'Skip narration',exact:true}).click();await expect(card(page)).toHaveCount(0);
});
