import * as THREE from 'three';
import { mulberry32 } from '../core/noise.js';
import { TILE, RADIUS, FARM_RADIUS } from '../core/constants.js';
import { GameState } from '../core/state.js';
import { scene } from '../engine/renderer.js';
import {
  seedNoise, buildTerrain, setTerrainData, repaintSeason,
  heightAtTile, moistureAtTile, classifyBiome, terrainHeightWorld
} from './terrain.js';
import {
  pushInstance, decorTreeTrunks, decorTreeLeaves, decorRocks,
  decorGrass, decorLeaves, decorPebbles
} from './decor.js';
import { PlacedObject } from '../entities/PlacedObject.js';
import { spawnEntity } from '../entities/WorldEntity.js';
import { resourceGroup, resourceObjects } from './resources.js';
import { buildMinimap } from '../ui/minimap.js';

export { resourceGroup, resourceObjects, extraPlacedObjects } from './resources.js';

let saveIdCounter = 0;

export function placeInteractive(defId, wx, wz){
  const obj = new PlacedObject(wx, wz, defId, `res_${saveIdCounter++}`);
  resourceGroup.add(obj.mesh);
  resourceObjects.push(obj);
  spawnEntity(obj);
  return obj;
}

export function generateWorld(){
  seedNoise(GameState.seed);
  const data = buildTerrain();
  setTerrainData(data);
  scene.add(data.mesh);
  repaintSeason();

  const TREE_CAP = 260, ROCK_CAP = 130, FIBER_CAP = 90;
  const rng = mulberry32(GameState.seed ^ 0x9e3779b9);

  for(let tz=-RADIUS; tz<=RADIUS; tz+=2){
    for(let tx=-RADIUS; tx<=RADIUS; tx+=2){
      const jx = tx + (rng()-0.5)*1.7;
      const jz = tz + (rng()-0.5)*1.7;
      const dist = Math.hypot(jx,jz);
      if(dist < FARM_RADIUS+3 || dist > RADIUS-2) continue;
      const h = heightAtTile(jx,jz), m = moistureAtTile(jx,jz);
      const biome = classifyBiome(h,m);
      const wx = jx*TILE, wz = jz*TILE;
      const wy = terrainHeightWorld(wx,wz);
      const roll = rng();
      if(biome==='rocky' || biome==='snowrock'){
        if(roll<0.16 && resourceObjects.filter(o=>o.def.id==='rock').length<ROCK_CAP){
          placeInteractive('rock', wx, wz);
        } else if(roll<0.5){
          pushInstance(decorRocks, wx, wy+0.3, wz, rng()*Math.PI*2, 0.6+rng()*0.8);
        }
      } else if(biome==='forest'){
        if(roll<0.2 && resourceObjects.filter(o=>o.def.id==='tree').length<TREE_CAP){
          placeInteractive('tree', wx, wz);
        } else if(roll<0.68){
          const s = 0.8+rng()*0.6;
          pushInstance(decorTreeTrunks, wx, wy+1.5*s, wz, rng()*Math.PI*2, s);
          pushInstance(decorTreeLeaves, wx, wy+4*s, wz, rng()*Math.PI*2, s);
          for(let k=0;k<2+Math.floor(rng()*3);k++){
            const lx = wx+(rng()-0.5)*7, lz = wz+(rng()-0.5)*7;
            pushInstance(decorLeaves, lx, terrainHeightWorld(lx,lz)+0.05, lz, rng()*Math.PI*2, 0.7+rng()*0.6,
              new THREE.Color().setHSL(0.08+rng()*0.06, 0.6, 0.45+rng()*0.15));
          }
        } else {
          for(let g=0;g<3;g++){
            pushInstance(decorGrass, wx+(rng()-0.5)*1.2, wy, wz+(rng()-0.5)*1.2, rng()*Math.PI*2, 0.55+rng()*0.45);
          }
        }
      } else if(biome==='tallgrass'){
        if(roll<0.85){
          const blades = 4 + Math.floor(rng()*4);
          for(let g=0;g<blades;g++){
            pushInstance(decorGrass, wx+(rng()-0.5)*1.6, wy, wz+(rng()-0.5)*1.6, rng()*Math.PI*2, 0.85+rng()*0.55);
          }
        } else if(roll<0.9 && resourceObjects.filter(o=>o.def.id==='fiber_patch').length<FIBER_CAP) placeInteractive('fiber_patch', wx, wz);
      } else if(biome==='grass'){
        if(roll<0.06 && resourceObjects.filter(o=>o.def.id==='fiber_patch').length<FIBER_CAP) placeInteractive('fiber_patch', wx, wz);
        else if(roll<0.55){
          const blades = 2 + Math.floor(rng()*3);
          for(let g=0;g<blades;g++){
            pushInstance(decorGrass, wx+(rng()-0.5)*1.4, wy, wz+(rng()-0.5)*1.4, rng()*Math.PI*2, 0.5+rng()*0.45);
          }
        }
      } else if(biome==='sand'){
        if(roll<0.06) pushInstance(decorPebbles, wx, wy+0.15, wz, rng()*Math.PI*2, 0.3+rng()*0.5);
      }
    }
  }
  decorTreeTrunks.instanceMatrix.needsUpdate = true;
  decorTreeLeaves.instanceMatrix.needsUpdate = true;
  decorRocks.instanceMatrix.needsUpdate = true;
  decorGrass.instanceMatrix.needsUpdate = true;
  decorLeaves.instanceMatrix.needsUpdate = true;
  if(decorLeaves.instanceColor) decorLeaves.instanceColor.needsUpdate = true;
  decorPebbles.instanceMatrix.needsUpdate = true;
  buildMinimap();
}
