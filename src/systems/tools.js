import { ActionRegistry } from '../core/registry.js';
import { TILE } from '../core/constants.js';
import { Player } from '../entities/player.js';
import { getFarmTile } from '../world/farm.js';
import { getSelectedItem } from './inventory.js';

export function useToolOnFarmTile(tile){
  const item = getSelectedItem();
  if(!item) return;
  const dist = Math.hypot(tile.wx-Player.x, tile.wz-Player.z);
  if(dist > TILE*3.5) return;
  if(item.useAction){
    const action = ActionRegistry.get(item.useAction);
    if(action && (!action.canUse || action.canUse(tile,item))){ action.onUse(tile,item); return; }
  }
  if(tile.object && tile.object.def.onInteract) tile.object.def.onInteract(tile.object, item);
}

export function tryHarvest(){
  const tx = Math.floor(Player.x/TILE);
  const tz = Math.floor(Player.z/TILE);
  const candidates = [
    getFarmTile(tx, tz),
    getFarmTile(tx + Math.sign(Player.dir.x||0), tz + Math.sign(Player.dir.z||0))
  ];
  for(const tile of candidates){
    if(tile && tile.crop){ tile.crop.harvest(); return; }
  }
}
