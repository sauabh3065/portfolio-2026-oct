import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const cache=new Map();
const loadTS=async path=>{
  const url=new URL(path,import.meta.url);
  if(cache.has(url.href))return import(await cache.get(url.href));
  const promise=(async()=>{
    const source=readFileSync(url,'utf8');
    let {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}});
    for(const match of [...outputText.matchAll(/from "([^"]+)"/g)]){
      const name=match[1];
      const resolved=name.startsWith('.') ? await moduleURL(new URL(name+'.ts',url)) : import.meta.resolve(name);
      outputText=outputText.replace(`from "${name}"`,`from "${resolved}"`);
    }
    return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  })();
  cache.set(url.href,promise);
  return import(await promise);
};
const moduleURL=async url=>{await loadTS(url);return cache.get(url.href)};
const {createRiggedDragon}=await loadTS('../lib/dragon-model.ts');
const {sampleFlight}=await loadTS('../lib/dragon-flight.ts');
// These tests exercise real skeletal deformation without a GPU. Only the canvas
// used to recolor the material is stubbed; the rig and animation data are real.
globalThis.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(16*16*4)}),putImageData(){}})})};
globalThis.ProgressEvent=class{constructor(type,init){this.type=type;Object.assign(this,init)}};
const binary=readFileSync(new URL('../public/models/dragon/dragon.glb',import.meta.url));
const size=binary.readUInt32LE(12), json=JSON.parse(binary.subarray(20,20+size));
json.materials=[{}];json.images=[];json.textures=[];
json.buffers[0].uri=`data:application/octet-stream;base64,${binary.subarray(28+size).toString('base64')}`;
const asset=await new GLTFLoader().parseAsync(JSON.stringify(json),'');
asset.scene.traverse(o=>{if(o.isSkinnedMesh)o.material=new THREE.MeshBasicMaterial({map:new THREE.Texture({})})});

export { loadTS, asset, createRiggedDragon, sampleFlight, THREE };
