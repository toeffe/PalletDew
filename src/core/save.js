import { SAVE_KEY } from './constants.js';
import { GameState, log } from './state.js';
import { farmTiles } from '../world/farm.js';
import { resourceObjects, extraPlacedObjects } from '../world/resources.js';
import { Player } from '../entities/player.js';

export function hasSave(){
  try { return !!localStorage.getItem(SAVE_KEY); } catch(e){ return false; }
}

export function saveGame(quiet){
  try {
    const farmTileList = [];
    for(const t of farmTiles.values()){
      if(t.tilled || t.crop || t.object){
        farmTileList.push({ x:t.x, y:t.y, tilled:t.tilled, watered:t.watered,
          cropId: t.crop ? t.crop.def.id : null, stage: t.crop ? t.crop.stage : 0,
          objectId: t.object ? t.object.def.id : null });
      }
    }
    const removedResourceIds = resourceObjects.filter(o=>o.dead).map(o=>o.saveId);
    const extraPlaced = extraPlacedObjects.map(o=>({ id:o.def.id, wx:o.position.x, wz:o.position.z }));
    const data = {
      seed: GameState.seed, day: GameState.day, hour: GameState.hour, minute: GameState.minute,
      gold: GameState.gold, energy: GameState.energy, weather: GameState.weather,
      selectedSlot: GameState.selectedSlot,
      inventory: GameState.inventory.map(i=>({ id:i.id, count:i.count })),
      playerX: Player.x, playerZ: Player.z,
      farmTiles: farmTileList, removedResourceIds, extraPlaced
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    if(!quiet) log('Game saved.');
  } catch(e){ console.error('Save failed', e); }
}

export function loadSaveData(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e){ return null; }
}
