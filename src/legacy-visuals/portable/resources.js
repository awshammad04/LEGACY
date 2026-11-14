// Use only on the kit-owned group, never on the host scene.
export function disposeOwnedTree(root,{textures=false,skipMaterials=new Set()}={}) {
 const geometries=new Set(),materials=new Set(),maps=new Set();
 root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (o.material?Array.isArray(o.material)?o.material:[o.material]:[])){if(!skipMaterials.has(m))materials.add(m);if(textures)for(const v of Object.values(m))if(v?.isTexture)maps.add(v);}});
 for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of maps)t.dispose();root.clear();
}
