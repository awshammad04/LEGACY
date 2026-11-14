// Opt-in settings for a rover scene. The host owns the renderer, camera and render loop.
export function createMarsLighting(THREE,{scene,renderer,configureRenderer=true,pixelRatio=1}={}) {
 const old={background:scene.background,fog:scene.fog};
 const previous=renderer?{outputColorSpace:renderer.outputColorSpace,toneMapping:renderer.toneMapping,toneMappingExposure:renderer.toneMappingExposure,shadowEnabled:renderer.shadowMap.enabled,shadowType:renderer.shadowMap.type,pixelRatio:renderer.getPixelRatio()}:null;
 const root=new THREE.Group();root.name='legacy:mars-lighting';scene.add(root);
 const ambient=new THREE.HemisphereLight('#c6ccce','#584031',1.5);
 const sun=new THREE.DirectionalLight('#ffddb0',3);sun.position.set(-60,48,-38);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-48,right:48,top:48,bottom:-48,far:150});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;
 root.add(ambient,sun,sun.target);
 scene.background=new THREE.Color('#bd9574');scene.fog=new THREE.FogExp2('#bd9574',.0032);
 if(renderer&&configureRenderer){renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setPixelRatio(Math.min(pixelRatio,1.75));}
 let disposed=false;
 return {root,sun,updateFocus({x,y=0,z}){sun.position.set(x-60,48,z-38);sun.target.position.set(x,y,z);},setQuality(low){sun.castShadow=!low;if(renderer&&configureRenderer){renderer.shadowMap.enabled=!low;renderer.setPixelRatio(low?1:Math.min(pixelRatio,1.75));} },dispose(){if(disposed)return;disposed=true;root.removeFromParent();scene.background=old.background;scene.fog=old.fog;sun.dispose();if(renderer&&configureRenderer){Object.assign(renderer,{outputColorSpace:previous.outputColorSpace,toneMapping:previous.toneMapping,toneMappingExposure:previous.toneMappingExposure});renderer.shadowMap.enabled=previous.shadowEnabled;renderer.shadowMap.type=previous.shadowType;renderer.setPixelRatio(previous.pixelRatio);}}};
}
