import { TILE, RADIUS } from '../core/constants.js';
import { terrainHeightWorld } from '../world/terrain.js';
import { entities } from './WorldEntity.js';
import { PlacedObject } from './PlacedObject.js';

export function isBlocked(nx, nz){
  if(Math.hypot(nx, nz) > (RADIUS - 2) * TILE) return true;
  if(terrainHeightWorld(nx, nz) < -0.8) return true;
  for(const e of entities){
    if(e instanceof PlacedObject && e.def?.collision && !e.dead){
      if(Math.abs(nx - e.position.x) < 1.6 && Math.abs(nz - e.position.z) < 1.6) return true;
    }
  }
  return false;
}
