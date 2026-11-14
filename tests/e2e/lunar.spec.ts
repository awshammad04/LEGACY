import { expect, test, type Page } from '@playwright/test';
import { M1 } from '../../src/content/missions';
import { PACKAGES } from '../../src/content/packages';
import { rockField } from '../../src/core/explore';
import { slopeDeg } from '../../src/core/terrain';

test.use({viewport:{width:1440,height:900},launchOptions:{args:[]},actionTimeout:15_000});
async function moon(page:Page, walkers=false) {
  await page.goto('/?test=1');
  await page.waitForFunction(()=>!!(window as any).__legacy);
  await page.evaluate(({design,priority,cruise,sites})=>{
    localStorage.setItem('legacy.v1.storiesHeard',JSON.stringify(sites));
    const g=(window as any).__legacy.useGame.getState;
    g().setSettings({quality:'high',sfx:false,narration:false,reducedMotion:false});
    g().startMission('m1-apollo');
    g().dispatch({type:'ANSWER_PRE_QUIZ',answers:{}});g().dispatch({type:'SET_PRIORITY',hypothesisId:priority});g().dispatch({type:'ADVANCE',to:'workshop'});
    for(const [slot,optionId] of Object.entries(design.selections))g().dispatch({type:'SELECT_COMPONENT',slot,optionId});
    for(const optionId of design.addons)g().dispatch({type:'TOGGLE_ADDON',optionId});
    g().dispatch({type:'REQUEST_REVIEW'});g().dispatch({type:'CONFIRM_LAUNCH'});g().dispatch({type:'ADVANCE',to:'orbit'});g().dispatch({type:'ADVANCE',to:'cruise'});
    for(const s of cruise)g().dispatch({type:'CREW_CHOICE',stepId:s.id,optionId:s.options[0].id});
    g().dispatch({type:'ADVANCE',to:'surface'});
  },{design:PACKAGES['m1-apollo']!.find(p=>p.id===(walkers?'walkers':'rover-team'))!.design,priority:M1.hypotheses[0].id,cruise:M1.cruise!,sites:M1.sites!.map(s=>s.id)});
  await page.getByRole('button',{name:"Let's go!",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__legacyLive.getState().pos[0])).toBe(-54);
}
const live=(page:Page)=>page.evaluate(()=>{
  const {pos,speed,locomotion,grounded,altitude}=(window as any).__legacyLive.getState();return {pos,speed,locomotion,grounded,altitude};
});
async function hold(page:Page,keys:string[],ms=900){for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(ms);for(const k of keys)await page.keyboard.up(k);await page.waitForTimeout(350);}

test('lunar rover, camera-relative EVA, hop, pause, save/continue and reboarding',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await moon(page);
  await expect.poll(async()=>(await live(page)).locomotion).toBe('rover');
  await page.screenshot({path:info.outputPath('rover.png')});
  await hold(page,['KeyW'],900);await hold(page,['Space'],300);
  await page.getByRole('button',{name:/Step off and walk/}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__legacy.useGame.getState().state.ops.onFoot)).toBe(true);
  const start=await live(page);
  await hold(page,['KeyW']);
  const forward=await live(page);
  expect(Math.hypot(forward.pos[0]-start.pos[0],forward.pos[1]-start.pos[1])).toBeGreaterThan(1);
  await expect.poll(async()=>(await live(page)).locomotion).toBe('idle');
  await page.screenshot({path:info.outputPath('on-foot.png')});
  // Rotate the existing OrbitControls camera, then compare the direction of W travel.
  await page.mouse.move(850,440);await page.mouse.down();await page.mouse.move(1120,470,{steps:18});await page.mouse.up();await page.waitForTimeout(300);
  const rotated=await live(page);await hold(page,['KeyW']);const afterRotate=await live(page);
  const a=[forward.pos[0]-start.pos[0],forward.pos[1]-start.pos[1]],b=[afterRotate.pos[0]-rotated.pos[0],afterRotate.pos[1]-rotated.pos[1]];
  expect((a[0]*b[0]+a[1]*b[1])/(Math.hypot(...a)*Math.hypot(...b))).toBeLessThan(0.9);
  await page.keyboard.down('Space');await expect.poll(async()=>(await live(page)).grounded).toBe(false);
  await page.screenshot({path:info.outputPath('lunar-hop.png')});await page.keyboard.up('Space');
  await expect.poll(async()=>(await live(page)).grounded).toBe(true);
  await page.keyboard.press('j');await expect(page.getByRole('heading',{name:'Echoes of Apollo',exact:true})).toBeVisible();
  const paused=await live(page);await hold(page,['KeyW'],500);const still=await live(page);
  expect(Math.hypot(still.pos[0]-paused.pos[0],still.pos[1]-paused.pos[1])).toBeLessThan(0.02);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'التبديل إلى العربية'}).click();await page.screenshot({path:info.outputPath('arabic-eva.png')});await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  await page.getByRole('button',{name:'Switch to English'}).click();
  await page.keyboard.down('KeyD');await page.waitForTimeout(500);
  await page.getByRole('button',{name:/LEGACY.*return to Mission Control home/}).click();await page.keyboard.up('KeyD');
  const saved=await page.evaluate(()=>(window as any).__legacy.useGame.getState().state);
  await page.reload();await page.waitForFunction(()=>!!(window as any).__legacy);
  await page.evaluate(()=>(window as any).__legacy.useGame.getState().continueMission('m1-apollo'));
  expect(await page.evaluate(()=>(window as any).__legacy.useGame.getState().state)).toEqual(saved);
  await expect.poll(async()=>(await live(page)).locomotion).toBe('idle');
  // Walk back near the parked vehicle using the same persisted, distance-limited boarding rule.
  await page.evaluate(()=>{const g=(window as any).__legacy.useGame.getState;const s=g().state;g().dispatch({type:'DRIVE',dist:0,slopeAvg:0,boostFrac:0,bumps:0,pos:[s.ops.buggyPos[0],s.ops.buggyPos[1]+3],heading:0});});
  await expect(page.getByRole('button',{name:/Climb aboard the lunar rover/})).toBeVisible();await page.keyboard.press('b');
  await expect.poll(()=>page.evaluate(()=>(window as any).__legacy.useGame.getState().state.ops.onFoot)).toBe(false);
  expect(errors).toEqual([]);
});

test('walking-only crew can investigate protected Apollo history and finish their mission',async({page},info)=>{
  await moon(page,true);await expect.poll(async()=>(await live(page)).locomotion).toBe('idle');
  await hold(page,['KeyW','KeyD']);expect((await live(page)).speed).toBeLessThanOrEqual(2.8);
  await page.screenshot({path:info.outputPath('walking-only.png')});
  await page.evaluate(()=>{const g=(window as any).__legacy.useGame.getState;g().dispatch({type:'DRIVE',dist:200,slopeAvg:3,boostFrac:0,bumps:0,pos:[-161,45],heading:Math.PI});});
  await expect(page.locator('.prompt',{hasText:'Apollo 15 Site'})).toBeVisible();await page.keyboard.press('e');
  await expect(page.locator('.action-panel')).toBeVisible();await page.getByRole('button',{name:/Photograph the Apollo 15 site/}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__legacy.useGame.getState().state.evidence.observations.length)).toBe(1);
  await page.screenshot({path:info.outputPath('apollo-interaction.png')});await page.keyboard.press('Escape');await page.keyboard.press('f');
  await page.getByRole('button',{name:/Send summary to Earth/}).click();await expect(page.getByText('Heritage Protector')).toBeVisible();
  expect(await page.evaluate(()=>(window as any).__legacy.useGame.getState().state.ops.keepOutViolations)).toBe(0);
});

test('lunar rover presentation and grounded collision with real scene rocks',async({page},info)=>{
  await moon(page);
  const heading=await page.evaluate(()=>(window as any).__legacyLive.getState().heading);
  await hold(page,['KeyA'],500);
  expect(await page.evaluate(()=>(window as any).__legacyLive.getState().heading)).toBeCloseTo(heading);
  await page.mouse.move(840,450);await page.mouse.down();await page.mouse.move(1080,485,{steps:20});await page.mouse.up();await page.waitForTimeout(400);
  await page.screenshot({path:info.outputPath('rover-three-quarter.png')});
  await page.getByRole('button',{name:/Step off and walk/}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__legacy.useGame.getState().state.ops.onFoot)).toBe(true);
  const rock=rockField(M1).find(r=>r.s>1.5&&Math.abs(r.x)<290&&Math.abs(r.z)<290&&Math.hypot(r.x+54,r.z+164)>50&&slopeDeg(r.x-r.s-4,r.z,r.x+4,r.z)<8)!;
  expect(rock).toBeTruthy();
  await page.evaluate(r=>{const g=(window as any).__legacy.useGame.getState;g().dispatch({type:'DRIVE',dist:0,slopeAvg:0,boostFrac:0,bumps:0,pos:[r.x-r.s-2.5,r.z],heading:0});},rock);
  await page.waitForTimeout(400);const start=await live(page);await hold(page,['KeyW'],2800);
  let at=await live(page);
  expect(at.pos[0]-start.pos[0]).toBeGreaterThan(0.7);
  expect(at.pos[0]).toBeLessThan(rock.x);
  expect(Math.hypot(at.pos[0]-rock.x,at.pos[1]-rock.z)).toBeGreaterThan(rock.s);
  expect(Math.hypot(at.pos[0]-rock.x,at.pos[1]-rock.z)).toBeLessThan(rock.s+1.2);
  await hold(page,['KeyW','Space'],700);await expect.poll(async()=>(await live(page)).grounded).toBe(true);
  at=await live(page);expect(at.pos[0]).toBeLessThan(rock.x);expect(Math.hypot(at.pos[0]-rock.x,at.pos[1]-rock.z)).toBeGreaterThan(rock.s);
  await page.screenshot({path:info.outputPath('rock-collision.png')});
});
