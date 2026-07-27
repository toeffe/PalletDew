import * as THREE from 'three';
import { mulberry32, fbm, smoothstep, noise2D } from '../core/noise.js';
import {
  TILE, RADIUS, FARM_RADIUS, HEIGHT_SCALE, WATER_H, BASE_LAND_H
} from '../core/constants.js';
import { currentSeason } from '../core/state.js';
import { scene } from '../engine/renderer.js';

let seedOffX = 0, seedOffY = 0, seedOffM = 0;

export function seedNoise(seed){
  const r = mulberry32(seed);
  seedOffX = r()*9000; seedOffY = r()*9000; seedOffM = r()*9000 + 4000;
}

export function heightAtTile(tx, tz){
  let h = fbm((tx+seedOffX)*0.045, (tz+seedOffY)*0.045, 5);
  h = Math.pow(h, 1.25);
  const d = Math.hypot(tx,tz)/RADIUS;
  const falloff = 1 - smoothstep(0.55, 1.0, d);
  h *= Math.max(0, falloff);
  const distSpawn = Math.hypot(tx,tz);
  if(distSpawn < FARM_RADIUS + 6){
    const t = smoothstep(0, FARM_RADIUS+6, distSpawn);
    h = h*t*t + BASE_LAND_H*(1 - t*t);
  }
  return h;
}

export function moistureAtTile(tx, tz){
  return fbm((tx+seedOffM)*0.07, (tz+seedOffM)*0.07, 4);
}

export function terrainHeightWorld(wx, wz){
  const h = heightAtTile(wx/TILE, wz/TILE);
  return (h - WATER_H) * HEIGHT_SCALE;
}

export function classifyBiome(h, m){
  if(h < WATER_H - 0.05) return 'deepwater';
  if(h < WATER_H + 0.015) return 'sand';
  if(h > 0.86) return 'snowrock';
  if(h > 0.7) return 'rocky';
  if(m > 0.62) return 'forest';
  if(m > 0.42) return 'tallgrass';
  return 'grass';
}

export const BIOME_NAMES = ['deepwater','sand','grass','tallgrass','forest','rocky','snowrock'];
export const BIOME_CODE = { deepwater:0, sand:1, grass:2, tallgrass:3, forest:4, rocky:5, snowrock:6 };
export const BIOME_COLORS = {
  deepwater: new THREE.Color(0x1b4d5c), sand: new THREE.Color(0xe6d5a8),
  grass: new THREE.Color(0x4a8f3c), tallgrass: new THREE.Color(0x6aa53f),
  forest: new THREE.Color(0x2f6b34), rocky: new THREE.Color(0x8a8578),
  snowrock: new THREE.Color(0xe8ecec)
};
export const SEASON_TINTS = {
  spring: new THREE.Color(0x74c95a), summer: new THREE.Color(0x4a8f3c),
  fall: new THREE.Color(0xc98a3a), winter: new THREE.Color(0xe9eef0)
};

/** @type {{ mesh: THREE.Mesh, geo: THREE.BufferGeometry, biomeIds: Uint8Array, baseColors: Float32Array, originalY: Float32Array, tilledMask: Uint8Array, verts: number } | null} */
export let terrainData = null;

export function setTerrainData(data){ terrainData = data; }

export function buildTerrain(){
  const verts = RADIUS*2 + 1;
  const positions = new Float32Array(verts*verts*3);
  const colors = new Float32Array(verts*verts*3);
  const baseColors = new Float32Array(verts*verts*3);
  const originalY = new Float32Array(verts*verts);
  const biomeIds = new Uint8Array(verts*verts);
  const tilledMask = new Uint8Array(verts*verts);
  let idx = 0;
  for(let iz=0; iz<verts; iz++){
    for(let ix=0; ix<verts; ix++){
      const tx = ix - RADIUS, tz = iz - RADIUS;
      const h = heightAtTile(tx,tz);
      const m = moistureAtTile(tx,tz);
      const wy = (h - WATER_H) * HEIGHT_SCALE;
      positions[idx*3] = tx*TILE; positions[idx*3+1] = wy; positions[idx*3+2] = tz*TILE;
      originalY[idx] = wy;
      const biome = classifyBiome(h,m);
      biomeIds[idx] = BIOME_CODE[biome];
      const jitter = (noise2D(tx*0.3+9.1, tz*0.3+4.7)-0.5)*0.14;
      const c = BIOME_COLORS[biome].clone();
      const hsl = {h:0,s:0,l:0}; c.getHSL(hsl);
      c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l+jitter,0,1));
      colors[idx*3]=c.r; colors[idx*3+1]=c.g; colors[idx*3+2]=c.b;
      baseColors[idx*3]=c.r; baseColors[idx*3+1]=c.g; baseColors[idx*3+2]=c.b;
      idx++;
    }
  }
  const indices = [];
  for(let iz=0; iz<verts-1; iz++){
    for(let ix=0; ix<verts-1; ix++){
      const a = iz*verts+ix, b=a+1, c=a+verts, d=c+1;
      indices.push(a,c,b, b,c,d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.92, metalness:0.02 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return { mesh, geo, biomeIds, baseColors, originalY, tilledMask, verts };
}

export function repaintSeason(){
  if(!terrainData) return;
  const { geo, biomeIds, baseColors, tilledMask } = terrainData;
  const tint = SEASON_TINTS[currentSeason()];
  const colorAttr = geo.attributes.color;
  for(let i=0;i<biomeIds.length;i++){
    if(tilledMask[i]) continue;
    const biome = BIOME_NAMES[biomeIds[i]];
    const r0=baseColors[i*3], g0=baseColors[i*3+1], b0=baseColors[i*3+2];
    let r=r0,g=g0,b=b0;
    if(biome==='grass'||biome==='tallgrass'||biome==='forest'){
      const f = 0.55;
      r = r0 + (tint.r-r0)*f; g = g0 + (tint.g-g0)*f; b = b0 + (tint.b-b0)*f;
    } else if((biome==='rocky'||biome==='snowrock') && currentSeason()==='winter'){
      r = r0 + (1-r0)*0.5; g = g0 + (1-g0)*0.5; b = b0 + (1-b0)*0.5;
    }
    colorAttr.array[i*3]=r; colorAttr.array[i*3+1]=g; colorAttr.array[i*3+2]=b;
  }
  colorAttr.needsUpdate = true;
}
