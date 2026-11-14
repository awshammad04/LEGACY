import {expect,test,type Page} from '@playwright/test';
import {MISSIONS} from '../../src/content/missions';
import {interiorFor} from '../../src/content/interior';
import {PACKAGES} from '../../src/content/packages';
test.use({viewport:{width:1440,height:900},launchOptions:{args:[]},actionTimeout:15_000});
const game=(page:Page)=>page.evaluate(()=>{const {state,actions,seed}=(window as any).__legacy.useGame.getState();return {state,actions,seed};});
async function enter(page:Page,id:string){
  const m=MISSIONS.find(m=>m.id===id)!;
  await page.goto('/?test=1');await page.waitForFunction(()=>!!(window as any).__legacy);
  await page.evaluate(({id,priority,design})=>{
    const g=(window as any).__legacy.useGame.getState;g().setSettings({sfx:false,storyNarration:true,reducedMotion:false,lang:'en'});g().startMission(id);
    g().dispatch({type:'ANSWER_PRE_QUIZ',answers:{}});g().dispatch({type:'SET_PRIORITY',hypothesisId:priority});g().dispatch({type:'ADVANCE',to:'workshop'});
    for(const [slot,optionId] of Object.entries(design.selections))g().dispatch({type:'SELECT_COMPONENT',slot,optionId});
    for(const optionId of design.addons)g().dispatch({type:'TOGGLE_ADDON',optionId});
  },{id,priority:m.hypotheses[0].id,design:PACKAGES[m.id]![1].design});
  await page.getByRole('button',{name:/LAUNCH MISSION/}).click();await expect(page.locator('.lx-hud')).toBeVisible();
  const before=await game(page);await page.getByRole('button',{name:'Skip cinematic',exact:true}).click();
  await expect(page.locator('.interior-hud')).toBeVisible();expect((await game(page)).actions.slice(before.actions.length)).toEqual([{type:'ADVANCE',to:'interior'}]);
  await expect(page.locator('canvas').first()).toBeVisible();return before;
}

// Implement/verify Mission 02 first; the same host then serves 03, 04 and the Apollo regression.
for(const id of ['m2-martian-mystery','m3-lost-rover','m4-cosmic-photographer','m1-apollo'] as const){
test(`${id}: cabin, camera, equipment, questions, Arabic, reload and completion`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const launched=await enter(page,id),config=interiorFor(id);
  await expect(page.locator('.interior-hud')).toHaveAttribute('data-virtual',String(id!=='m1-apollo'));
  if(id!=='m1-apollo')await expect(page.getByText('Virtual engineering view — uncrewed mission',{exact:true})).toBeVisible();
  await page.waitForTimeout(750);
  await page.screenshot({path:info.outputPath('interior-english.png')});
  const before=await page.screenshot();
  await page.mouse.move(900,350);await page.mouse.down();await page.mouse.move(1100,400,{steps:20});await page.mouse.up();await page.waitForTimeout(500);
  expect(await page.screenshot()).not.toEqual(before);
  await page.getByRole('button',{name:'Earth window',exact:true}).click();await page.waitForTimeout(350);
  await page.screenshot({path:info.outputPath('earth-window.png')});
  await page.getByRole('button',{name:config.destination==='mars'?'Mars window':config.destination==='moon'?'Moon window':'Starfield window',exact:true}).click();await page.waitForTimeout(350);
  await page.screenshot({path:info.outputPath('window-look.png')});
  await page.getByRole('button',{name:'Forward console',exact:true}).click();await page.waitForTimeout(350);
  // Reduced motion steadies the inherited floating camera before clicking the native 3D console marker.
  await page.evaluate(()=>(window as any).__legacy.useGame.getState().setSettings({reducedMotion:true}));
  // Accessible equipment interaction shares the exact action used by the 3D hotspot.
  await page.waitForTimeout(500);
  await page.locator('canvas').first().click({position:{x:720,y:430}});
  await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog')).toContainText(config.topics[0].learn.en);
  await page.getByRole('button',{name:'Back to mission',exact:true}).click();
  await expect(page.locator('.story-card')).toHaveAttribute('data-story-id',`${id.slice(0,2)}-interior-${config.topics[0].id}`);
  // Missing recordings are an explicit text fallback while generation is unavailable.
  const status=await page.locator('.story-card').getAttribute('data-playback');
  if(id!=='m1-apollo'){
    if(status!=='playing')await page.locator('.story-card').getByRole('button',{name:'Listen',exact:true}).click();
    await expect(page.locator('.story-card')).toHaveAttribute('data-playback','playing');
  }
  await page.locator('.story-card').getByRole('button',{name:'Skip narration',exact:true}).click();
  await page.locator('.interior-question').getByRole('button',{name:new RegExp(config.topics[0].options[1].label.en)}).click();
  await expect(page.locator('.interior-question .feed-item[role="status"]')).toHaveText(config.topics[0].options[1].result.en);
  const saved=await game(page);await page.reload();await page.waitForFunction(()=>!!(window as any).__legacy);
  await page.evaluate(id=>(window as any).__legacy.useGame.getState().continueMission(id),id);
  expect(await game(page)).toEqual(saved);await expect(page.locator('.interior-question .feed-item[role="status"]')).toHaveText(config.topics[0].options[1].result.en);
  await page.getByRole('button',{name:'التبديل إلى العربية'}).click();await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  await expect(page.locator('#step-t')).toHaveText(config.topics[0].title.ar);
  await page.locator('.interior-question').getByRole('button',{name:'استمع إلى الشرح',exact:true}).click();
  await expect(page.locator('.story-card .story-text')).toHaveText(config.topics[0].learn.ar);
  if(id==='m2-martian-mystery'||id==='m3-lost-rover')await expect(page.locator('.story-card')).toHaveAttribute('data-playback','playing');
  else await expect(page.locator('.story-card')).toHaveAttribute('data-playback','unavailable');
  await page.screenshot({path:info.outputPath('interior-arabic.png')});
  await page.getByRole('button',{name:'Switch to English',exact:true}).click();
  await page.locator('.interior-question').getByRole('button',{name:'Continue',exact:true}).click();
  for(const topic of config.topics.slice(1)){
    await page.locator('.interior-question').getByRole('button',{name:new RegExp(topic.options[0].label.en)}).click();
    await expect(page.locator('.interior-question .feed-item[role="status"]')).toHaveText(topic.options[0].result.en);
    await page.locator('.interior-question').getByRole('button',{name:'Continue',exact:true}).click();
  }
  const ready=await game(page);expect(ready.state.quiz).toEqual(launched.state.quiz);expect(ready.state.ops).toEqual(launched.state.ops);expect(ready.state.crew).toEqual(launched.state.crew);expect(ready.state.evidence).toEqual(launched.state.evidence);expect(ready.state.design).toEqual(launched.state.design);
  await page.getByRole('button',{name:'Continue to mission operations',exact:true}).click();
  const done=await game(page);expect(done.state.stage).toBe(id==='m4-cosmic-photographer'?'observe':'orbit');
  expect(done.actions.slice(ready.actions.length)).toEqual([{type:'FINISH_INTERIOR'}]);
  await page.evaluate(()=>(window as any).__legacy.useGame.getState().dispatch({type:'FINISH_INTERIOR'}));expect(await game(page)).toEqual(done);
  expect(errors).toEqual([]);
});
test(`${id}: skip exits once to the correct operations stage`,async({page})=>{
  await enter(page,id);const before=await game(page);
  await page.locator('.interior-context').getByRole('button',{name:'Skip orientation',exact:true}).click();
  const after=await game(page);expect(after.actions.slice(before.actions.length)).toEqual([{type:'FINISH_INTERIOR',skip:true}]);
  expect(after.state.stage).toBe(id==='m4-cosmic-photographer'?'observe':'orbit');
  await page.evaluate(()=>(window as any).__legacy.useGame.getState().dispatch({type:'FINISH_INTERIOR',skip:true}));expect(await game(page)).toEqual(after);
});
}
