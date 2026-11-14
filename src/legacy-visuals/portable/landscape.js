import { createMarsMaterials } from './materials.js';
import { disposeOwnedTree } from './resources.js';

// Adds only a visual group. Your host remains responsible for collisions and mission logic.
export function createMarsLandscape(T, options) {
 const { heightAt, surfaceAt, obstacles=[], bounds, addDistantRelief=false, includeSky=false, gravelCount=3600, segments=300 }=options;
 if(typeof heightAt!=='function'||typeof surfaceAt!=='function'||!bounds)throw new TypeError('Provide the HOST heightAt, surfaceAt, obstacles and bounds.');
 const extent=options.extent??Math.max(480,Math.max(bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ)*3.5);
 const centerX=(bounds.minX+bounds.maxX)/2,centerZ=(bounds.minZ+bounds.maxZ)/2;
 const scene=new T.Group();scene.name='legacy:mars-landscape';
 const OBSTACLES=obstacles;
 const materials=createMarsMaterials(T,{...options,vertexColors:true});
 const geo=new T.PlaneGeometry(extent,extent,segments,segments);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position,cols=[],c=new T.Color();
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i)+centerX,z=pos.getZ(i)+centerZ,edge=addDistantRelief?Math.max(Math.abs(x-centerX)-(bounds.maxX-bounds.minX)/2-7,Math.abs(z-centerZ)-(bounds.maxZ-bounds.minZ)/2-11,0):0;pos.setX(i,x);pos.setZ(i,z);
  const escarp=edge>0?Math.pow(Math.min(1,edge/45),2)*(12+7*Math.sin(x*.038)+6*Math.cos(z*.041)+8*Math.sin(x*.087+z*.031)**2):0;
  pos.setY(i,heightAt(x,z)+escarp);
  c.set(surfaceAt(x,z)==='rough'?'#83634f':'#bc9273');
  const v=.83+.10*Math.sin(x*.035+z*.029)+.07*Math.cos(z*.08)+.04*Math.sin(x*.7+z*.5);
  c.multiplyScalar(v);cols.push(c.r,c.g,c.b);
 }
 geo.setAttribute('color',new T.Float32BufferAttribute(cols,3));geo.computeVertexNormals();
 const {ground:material,rocks:rms}=materials;
 const floor=new T.Mesh(geo,material);floor.receiveShadow=true;scene.add(floor);
 let seed=44391;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 function shape(seed){const g=new T.SphereGeometry(1,24,16),p=g.attributes.position;
  for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const f=.84+.07*Math.sin(x*9+y*7+seed)+.06*Math.sin(z*11-x*4+seed);p.setXYZ(i,x*f,y*f,z*f);}
  g.computeVertexNormals();return g;}
 const shapes=[shape(1),shape(3),shape(7)];
 OBSTACLES.forEach((o,i)=>{if(o.kind==='beacon')return;const m=new T.Mesh(shapes[i%3],rms[i%3]);m.position.set(o.x,heightAt(o.x,o.z)+o.r*.17,o.z);m.scale.set(o.r,o.r*(.8+(i%3)*.07),o.r);m.rotation.y=rand()*6.28;m.castShadow=m.receiveShadow=true;scene.add(m);
  // Stratified detail follows the same conservative collider envelope.
  if(i%3===0){for(let j=0;j<3;j++){const cap=new T.Mesh(shapes[(i+j)%3],rms[(i+1)%3]);cap.position.set(o.x,heightAt(o.x,o.z)+o.r*(.1+j*.22),o.z);cap.scale.set(o.r*.82,o.r*.12,o.r*.78);cap.rotation.y=m.rotation.y;cap.castShadow=cap.receiveShadow=true;scene.add(cap);}}
 });
 const gravel=new T.InstancedMesh(shapes[0],rms[1],gravelCount),dummy=new T.Object3D();
 for(let i=0;i<gravelCount;i++){const x=bounds.minX+rand()*(bounds.maxX-bounds.minX),z=bounds.minZ+rand()*(bounds.maxZ-bounds.minZ),s=.025+rand()**4*.23;dummy.position.set(x,heightAt(x,z)+s*.22,z);dummy.scale.set(s*1.4,s*.6,s);dummy.rotation.set(rand(),rand()*6,rand());dummy.updateMatrix();gravel.setMatrixAt(i,dummy.matrix);}
 gravel.receiveShadow=true;scene.add(gravel);

 if(includeSky){
 const sky=new T.Mesh(new T.SphereGeometry(490,40,24),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{sun:{value:new T.Vector3(-.65,.38,-.45).normalize()}},vertexShader:'varying vec3 dir;void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 dir;uniform vec3 sun;void main(){vec3 d=normalize(dir);float h=smoothstep(-.08,.65,d.y);vec3 c=mix(vec3(.69,.50,.37),vec3(.30,.27,.25),h);float s=max(dot(d,sun),0.);c+=vec3(.46,.35,.22)*pow(s,18.)+vec3(.8,.71,.54)*pow(s,1800.);gl_FragColor=vec4(c,1.);}'}));sky.renderOrder=-10;scene.add(sky);
 }
 let disposed=false;
 return {root:scene,floor,materials,ready:materials.ready,dispose(){if(disposed)return;disposed=true;scene.removeFromParent();disposeOwnedTree(scene,{skipMaterials:new Set([materials.ground,...materials.rocks])});materials.dispose();}};
}
