// Inject the host's THREE namespace. Do not load a second Three.js installation.
export function createMarsMaterials(THREE,options={}) {
 const {textureLoader=new THREE.TextureLoader(),vertexColors=false,anisotropy=8}=options;
 const base=new URL(options.assetBaseURL??'../assets/',import.meta.url);
 const owned=[],pending=[];
 function tex(name,repeat,color=false){
  let resolve,reject;pending.push(new Promise((a,b)=>{resolve=a;reject=b;}));
  const t=textureLoader.load(new URL(name+'.jpg',base).href,resolve,undefined,reject);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=anisotropy;if(color)t.colorSpace=THREE.SRGBColorSpace;owned.push(t);return t;
 }
 const sand=tex('sand-color',32,true),sn=tex('sand-normal',32),sr=tex('sand-roughness',32);
 const rock=tex('rock-color',1.5,true),rn=tex('rock-normal',1.5),rr=tex('rock-roughness',1.5);
 const ground=new THREE.MeshStandardMaterial({color:vertexColors?'#ffffff':'#bc9273',map:sand,normalMap:sn,roughnessMap:sr,normalScale:new THREE.Vector2(.55,.55),roughness:1,vertexColors});
 const rocks=[0x9a7b65,0x7c6a5e,0xb1957b].map(color=>new THREE.MeshStandardMaterial({color,map:rock,normalMap:rn,normalScale:new THREE.Vector2(.8,.8),roughnessMap:rr,roughness:1}));
 let disposed=false;
 return {ground,rocks,ready:Promise.all(pending),dispose(){if(disposed)return;disposed=true;ground.dispose();rocks.forEach(m=>m.dispose());owned.forEach(t=>t.dispose());}};
}
