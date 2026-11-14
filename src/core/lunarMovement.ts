import { WORLD_LIMIT } from './explore';

export interface SurfaceCollider { x: number; z: number; radius: number; top?: number }
export interface LunarMotion { vx: number; vz: number; lift: number; verticalSpeed: number; jumpHeld: boolean; grounded: boolean }
export const newLunarMotion = (): LunarMotion => ({vx:0,vz:0,lift:0,verticalSpeed:0,jumpHeld:false,grounded:true});
export const WALK_RADIUS = 0.36;

/** Camera-relative input, normalized so diagonals do not move faster. */
export function lunarDirection(forward: number, right: number, cameraX: number, cameraZ: number) {
  const length = Math.hypot(cameraX,cameraZ) || 1;
  const x = cameraX/length*forward-cameraZ/length*right;
  const z = cameraZ/length*forward+cameraX/length*right;
  const magnitude = Math.hypot(x,z);
  return magnitude > 0 ? {x:x/magnitude,z:z/magnitude} : {x:0,z:0};
}

/** Small swept steps prevent tunnelling; sliding preserves control beside a rock or parked vehicle. */
export function lunarSurfaceStep(x:number,z:number,dx:number,dz:number,colliders:readonly SurfaceCollider[],height:(x:number,z:number)=>number,slopeLimit:number) {
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/0.16));
  let distance=0,slopeSum=0,blocked=false;
  for(let i=0;i<count;i++) {
    let nx=Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,x+dx/count));
    let nz=Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,z+dz/count));
    for(let pass=0;pass<3;pass++) for(const c of colliders) {
      const radius=c.radius+WALK_RADIUS;
      let a=nx-c.x,b=nz-c.z,d=Math.hypot(a,b);
      if(d>=radius)continue;
      if(d<1e-6){a=x-c.x;b=z-c.z;d=Math.hypot(a,b);if(d<1e-6){a=1;b=0;d=1;}}
      nx=c.x+a/d*radius;nz=c.z+b/d*radius;
    }
    const step=Math.hypot(nx-x,nz-z);
    const rise=height(nx,nz)-height(x,z);
    const slope=Math.atan2(Math.abs(rise),Math.max(step,1e-6))*180/Math.PI;
    if(rise>0 && slope>slopeLimit){blocked=true;break;}
    // A tiny step down a steep face should not let the astronaut drop through a cliff.
    if(rise < -0.28){blocked=true;break;}
    distance+=step;slopeSum+=slope*step;x=nx;z=nz;
  }
  return {x,z,distance,slope:distance?slopeSum/distance:0,blocked};
}

/** A restrained lunar hop. Horizontal collisions remain active while airborne. */
export function advanceLunarMotion(m:LunarMotion, direction:{x:number;z:number}, dt:number, brisk:boolean, jump:boolean, paused:boolean) {
  if(paused){m.vx=0;m.vz=0;m.jumpHeld=jump;return;}
  const speed=brisk?3.7:2.65;
  const blend=1-Math.exp(-dt*(direction.x||direction.z?9:15));
  m.vx+=(direction.x*speed-m.vx)*blend;m.vz+=(direction.z*speed-m.vz)*blend;
  if(Math.hypot(m.vx,m.vz)<0.015){m.vx=0;m.vz=0;}
  if(jump&&!m.jumpHeld&&m.grounded){m.verticalSpeed=1.1;m.grounded=false;}
  m.jumpHeld=jump;
  if(!m.grounded){
    m.lift+=m.verticalSpeed*dt-0.5*1.62*dt*dt;m.verticalSpeed-=1.62*dt;
    if(m.lift<=0){m.lift=0;m.verticalSpeed=0;m.grounded=true;}
  }
}

export function angleDelta(from:number,to:number){return Math.atan2(Math.sin(to-from),Math.cos(to-from));}
