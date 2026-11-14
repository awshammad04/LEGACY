import { WHEEL_RADIUS, steeringAngle, wheelTravel, smoothSteering } from './wheel-motion.js';
import { disposeOwnedTree } from './resources.js';

// Y-up, -Z forward, metres, heading radians clockwise from -Z.
// No keyboard handlers, render loop, DOM UI or simulation writes.
export function createRoverVisual(THREE, {heightAt, parkedCurvature=.35, maxCurvature=1.18/1.3, makeCanvas=()=>document.createElement('canvas')}={}) {
 if(typeof heightAt!=='function')throw new TypeError('Provide the HOST heightAt(x,z) callback.');
 const scene=new THREE.Group();scene.name='legacy:documentation-rover';
 const state={x:0,z:0,heading:0,speed:0,distance:0};
 let wheels=[],mast,shadow,rover,command={steer:0},first=true,disposed=false;
 const input=()=>command;
function mat(color, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.87, ...extra }); }
function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function box(parent, material, x, y, z, w, h, d) { return mesh(new THREE.BoxGeometry(w,h,d),material,parent,x,y,z); }
function strut(parent, material, a, b, radius = 0.055) {
  const v1 = new THREE.Vector3(...a), v2 = new THREE.Vector3(...b), delta = v2.clone().sub(v1);
  const m = mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),6),material,parent);
  m.position.copy(v1.add(v2).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  return m;
}

function createRover() {
  const g=new THREE.Group();scene.add(g);
  const cream=mat('#c9c5b6',{metalness:.25,roughness:.6}), trim=mat('#3d4140',{metalness:.65,roughness:.45}), black=mat('#292724'), gold=mat('#ac8550',{metalness:.7,roughness:.4}), panel=mat('#162d41',{metalness:.65,roughness:.25}),white=mat('#e3d8c3');
  box(g,gold,0,1.08,0,1.52,.65,2.12);box(g,cream,0,1.48,-.15,1.72,.25,2.45);
  box(g,trim,0,1.66,.4,.9,.18,.72);
  box(g,white,0,1.7,-.85,1.3,.1,.35);
  [-1,1].forEach(side=>{
    box(g,cream,side*1.3,1.52,.12,.91,.06,2.28);
    for(let i=0;i<3;i++)for(let j=0;j<7;j++)box(g,panel,side*1.3+(i-1)*.26,1.56,(j-3)*.29+.12,.24,.016,.27);
    [-1.2,0,1.2].forEach(z=>{
      const mount=new THREE.Group();g.add(mount);mount.position.set(side*1.13,.5,z);const steering=new THREE.Group();mount.add(steering);const wheel=new THREE.Group();steering.add(wheel);wheel.userData={mount,steering,home:{x:side*1.13,z},steer:0};
      const tire=mesh(new THREE.CylinderGeometry(.48,.48,.36,32),black,wheel);tire.rotation.z=Math.PI/2;
      const hub=mesh(new THREE.CylinderGeometry(.25,.25,.38,12),gold,wheel);hub.rotation.z=Math.PI/2;
      for(let k=0;k<24;k++){const a=k/24*Math.PI*2;const tread=box(wheel,trim,0,Math.cos(a)*.475,Math.sin(a)*.475,.39,.045,.11);tread.rotation.x=a;}
      const arm=strut(g,trim,[side*.65,1.15,z*.55],[side*1.13,.5,z],.065);wheel.userData.arm=arm;wheel.userData.armAnchor=new THREE.Vector3(side*.65,1.15,z*.55);
      wheels.push(wheel);for(let j=0;j<6;j++){const a=j/6*Math.PI*2;strut(wheel,gold,[side*.2,0,0],[side*.2,Math.cos(a)*.23,Math.sin(a)*.23],.022);}
      // A valve/index on the rotating hub makes rolling readable despite repeated tread.
      box(wheel,white,side*.204,.17,0,.025,.075,.055);
    });
  });
  strut(g,cream,[0,1.58,-.64],[0,2.65,-.64],.085);
  mast=new THREE.Group();g.add(mast);mast.position.set(0,2.75,-.64);
  box(mast,cream,0,0,0,.76,.3,.36);
  [-.22,.22].forEach(x=>{
    const lens=mesh(new THREE.CylinderGeometry(.1,.12,.12,12),trim,mast,x,.015,-.22);lens.rotation.x=Math.PI/2;
    const glass=mesh(new THREE.CircleGeometry(.077,16),new THREE.MeshBasicMaterial({color:'#8ec8c1'}),mast,x,.015,-.286);glass.rotation.y=Math.PI;
  });
  strut(g,trim,[.6,1.62,.86],[.6,2.2,.86],.024);
  const antenna=mesh(new THREE.CylinderGeometry(.28,.15,.08,16),white,g,.6,2.25,.86);antenna.rotation.z=.2;
  box(g,trim,0,1.17,-1.25,.8,.25,.17);
  [-.35,.35].forEach(x=>mesh(new THREE.SphereGeometry(.065,8,6),new THREE.MeshBasicMaterial({color:'#dbe9c5'}),g,x,1.36,-1.28));
  for(let j=0;j<10;j++)box(g,trim,(j-4.5)*.13,1.12,1.08,.06,.42,.07);
  for(const side of [-1,1]){strut(g,gold,[side*.7,1.3,-.8],[side*.7,1.6,.75],.025);for(let j=0;j<5;j++)mesh(new THREE.SphereGeometry(.025,6,4),trim,g,side*.82,1.64,j*.45-.9);}
  const cable=new THREE.CatmullRomCurve3([new THREE.Vector3(.18,1.65,-.3),new THREE.Vector3(.22,1.8,-.6),new THREE.Vector3(.12,2.3,-.68),new THREE.Vector3(.1,2.65,-.63)]);
  mesh(new THREE.TubeGeometry(cable,16,.025,6,false),black,g);
  const sticker=box(g,trim,0,1.83,.42,.5,.025,.33);
  sticker.rotation.y=.1;

  const texCanvas=makeCanvas();texCanvas.width=128;texCanvas.height=64;
  const c=texCanvas.getContext('2d');c.fillStyle='#d9debf';c.font='bold 22px monospace';c.textAlign='center';c.fillText('LGC–01',64,40);
  const label=mesh(new THREE.PlaneGeometry(.65,.32),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(texCanvas),transparent:true}),g,0,1.17,-1.343);label.rotation.y=Math.PI;
  // Soft contact shadow complements the directional wheel shadows.
  const shadowCanvas=makeCanvas();shadowCanvas.width=64;shadowCanvas.height=64;
  const sc=shadowCanvas.getContext('2d'),gradient=sc.createRadialGradient(32,32,6,32,32,32);gradient.addColorStop(0,'rgba(20,27,24,.5)');gradient.addColorStop(1,'rgba(20,27,24,0)');sc.fillStyle=gradient;sc.fillRect(0,0,64,64);
  shadow=mesh(new THREE.PlaneGeometry(5,6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),scene);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
  return g;
}

const frameUp=new THREE.Vector3(),frameForward=new THREE.Vector3(),frameRight=new THREE.Vector3(),basis=new THREE.Matrix4(),localWheel=new THREE.Vector3();
let lastWheelDistance=0,lastWheelHeading=0,lastWheelX=state.x,lastWheelZ=state.z;
const armDirection=new THREE.Vector3(),armAxis=new THREE.Vector3(0,1,0);
function resetWheelMotion(){lastWheelDistance=state.distance;lastWheelHeading=state.heading;lastWheelX=state.x;lastWheelZ=state.z;wheels.forEach(w=>{w.rotation.x=0;w.userData.steer=0;w.userData.steering.rotation.y=0;});}
function updateVehicle(dt) {
  const h=heightAt(state.x,state.z),e=.6;
  frameUp.set(-(heightAt(state.x+e,state.z)-heightAt(state.x-e,state.z))/(2*e),1,-(heightAt(state.x,state.z+e)-heightAt(state.x,state.z-e))/(2*e)).normalize();
  frameForward.set(Math.sin(state.heading),0,-Math.cos(state.heading));frameForward.addScaledVector(frameUp,-frameForward.dot(frameUp)).normalize();
  const back=frameForward.clone().negate();frameRight.crossVectors(frameUp,back).normalize();basis.makeBasis(frameRight,frameUp,back);rover.quaternion.setFromRotationMatrix(basis);rover.position.set(state.x,h+.04,state.z);rover.updateMatrixWorld(true);
  const travelled=Math.max(0,state.distance-lastWheelDistance);
  const headingDelta=travelled>1e-7?Math.atan2(Math.sin(state.heading-lastWheelHeading),Math.cos(state.heading-lastWheelHeading)):0;
  const midHeading=lastWheelHeading+headingDelta*.5;
  const projection=(state.x-lastWheelX)*Math.sin(midHeading)-(state.z-lastWheelZ)*Math.cos(midHeading);
  const signedDistance=travelled*Math.sign(projection);
  const command=input();
  const rawCurvature=Math.abs(signedDistance)>1e-7?headingDelta/signedDistance:command.steer*parkedCurvature;
  const curvature=THREE.MathUtils.clamp(rawCurvature,-maxCurvature,maxCurvature);
  wheels.forEach(w=>{
    const data=w.userData,m=data.mount,home=data.home;
    m.position.set(home.x,.5,home.z);
    localWheel.copy(m.position);rover.localToWorld(localWheel);
    const offset=heightAt(localWheel.x,localWheel.z)+WHEEL_RADIUS-localWheel.y;
    m.position.y+=THREE.MathUtils.clamp(offset/frameUp.y,-.42,.42);
    if(dt>0){
      data.steer=smoothSteering(data.steer,steeringAngle(curvature,home.x,home.z),dt);
      data.steering.rotation.y=-data.steer;
      const rolled=wheelTravel(signedDistance,headingDelta,home.x,home.z,data.steer);
      w.rotation.x=THREE.MathUtils.euclideanModulo(w.rotation.x-rolled/WHEEL_RADIUS,Math.PI*2);
    }
    // Suspension links follow each wheel hub without spinning or steering the chassis.
    const anchor=data.armAnchor,arm=data.arm;
    armDirection.subVectors(m.position,anchor);
    arm.position.copy(anchor).add(m.position).multiplyScalar(.5);
    arm.quaternion.setFromUnitVectors(armAxis,armDirection.clone().normalize());
    arm.scale.y=armDirection.length()/arm.geometry.parameters.height;
  });
  lastWheelDistance=state.distance;lastWheelHeading=state.heading;lastWheelX=state.x;lastWheelZ=state.z;
  shadow.position.set(state.x,h+.045,state.z);shadow.rotation.z=-state.heading;
}

 rover=createRover();
 function reset(pose){
  state.x=pose.x;state.z=pose.z;state.heading=pose.heading;state.speed=pose.speed??0;state.distance=0;
  command={steer:pose.steer??0};resetWheelMotion();first=false;updateVehicle(0);
 }
 function update(pose, dt){
  if(disposed)throw new Error('Cannot update a disposed rover visual.');
  if(!Number.isFinite(pose.x)||!Number.isFinite(pose.z)||!Number.isFinite(pose.heading))throw new TypeError('Provide finite x, z and heading.');
  if(first){reset(pose);return;}
  if(pose.paused)return;
  const x0=state.x,z0=state.z,h0=state.heading;
  const distance=Math.hypot(pose.x-x0,pose.z-z0);
  const dh=Math.atan2(Math.sin(pose.heading-h0),Math.cos(pose.heading-h0));
  const mid=h0+dh*.5;
  state.x=pose.x;state.z=pose.z;state.heading=pose.heading;state.distance+=distance;
  const signed=distance*Math.sign((pose.x-x0)*Math.sin(mid)-(pose.z-z0)*Math.cos(mid));
  state.speed=pose.speed??(dt>0?signed/dt:0);command={steer:pose.steer??0};
  updateVehicle(Math.max(0,Math.min(.1,dt)));
 }
 return {root:scene,rover,wheels,update,reset,dispose(){if(disposed)return;disposed=true;scene.removeFromParent();disposeOwnedTree(scene,{textures:true});}};
}
