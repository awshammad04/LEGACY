import { describe, expect, it } from 'vitest';
import { advanceLunarMotion, angleDelta, lunarDirection, lunarSurfaceStep, newLunarMotion } from './lunarMovement';
import { WORLD_LIMIT } from './explore';

describe('lunar EVA movement',()=>{
  it('uses the camera frame and normalizes diagonals',()=>{
    expect(lunarDirection(1,0,0,-1)).toEqual({x:0,z:-1});
    expect(lunarDirection(0,1,0,-1)).toEqual({x:1,z:0});
    const diagonal=lunarDirection(1,1,1,0);
    expect(Math.hypot(diagonal.x,diagonal.z)).toBeCloseTo(1);
    expect(lunarDirection(1,0,1,0)).toEqual({x:1,z:0});
  });
  it('accelerates and settles consistently across frame rates',()=>{
    const run=(fps:number)=>{
      const m=newLunarMotion();
      for(let i=0;i<fps;i++)advanceLunarMotion(m,{x:1,z:0},1/fps,false,false,false);
      expect(m.vx).toBeGreaterThan(2.6);
      for(let i=0;i<fps/2;i++)advanceLunarMotion(m,{x:0,z:0},1/fps,false,false,false);
      expect(m.vx).toBe(0);return m;
    };
    expect(run(30)).toEqual(run(120));
  });
  it('hops once per press and lands without accumulating height',()=>{
    const m=newLunarMotion();let peak=0;
    for(let i=0;i<240;i++){advanceLunarMotion(m,{x:0,z:0},1/120,false,true,false);peak=Math.max(peak,m.lift);}
    expect(peak).toBeGreaterThan(0.3);expect(peak).toBeLessThan(0.4);
    expect(m.grounded).toBe(true);expect(m.lift).toBe(0);
    advanceLunarMotion(m,{x:0,z:0},1/60,false,false,false);
    advanceLunarMotion(m,{x:0,z:0},1/60,false,true,false);
    expect(m.grounded).toBe(false);
  });
  it('freezes a hop and all horizontal movement when a panel pauses play',()=>{
    const m=newLunarMotion();advanceLunarMotion(m,{x:1,z:0},0.1,false,true,false);
    const height=m.lift;advanceLunarMotion(m,{x:1,z:0},0.1,false,false,true);
    expect(m.lift).toBe(height);expect(m.vx).toBe(0);
  });
  it('cannot tunnel through rocks or parked hardware even on a long step',()=>{
    const result=lunarSurfaceStep(0,0,20,0,[{x:4,z:0,radius:1}],()=>0,20);
    expect(result.x).toBeCloseTo(2.64);expect(result.z).toBe(0);
    const slide=lunarSurfaceStep(2.64,0,0.3,0.5,[{x:4,z:0,radius:1}],()=>0,20);
    expect(Math.hypot(slide.x-4,slide.z)).toBeGreaterThanOrEqual(1.36-1e-6);
    expect(slide.z).toBeGreaterThan(0);
  });
  it('rejects excessive slopes and unsafe drops, and respects world bounds',()=>{
    expect(lunarSurfaceStep(0,0,1,0,[],x=>x,15).blocked).toBe(true);
    expect(lunarSurfaceStep(0,0,1,0,[],x=>x>0.2?-3:0,15).blocked).toBe(true);
    expect(lunarSurfaceStep(WORLD_LIMIT-0.1,0,5,0,[],()=>0,15).x).toBe(WORLD_LIMIT);
    expect(angleDelta(Math.PI-0.1,-Math.PI+0.1)).toBeCloseTo(0.2);
  });
});
