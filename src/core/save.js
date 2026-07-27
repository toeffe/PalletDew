import { SAVE_KEY } from './constants.js';
import { GameState, log } from './state.js';
import { farmTiles } from '../world/farm.js';
import { resourceObjects, extraPlacedObjects } from '../world/resources.js';
import { Player } from '../entities/player.js';
import { pallets } from '../entities/Pallet.js';
import { groundItems } from '../entities/GroundItem.js';
import { Mulli } from '../entities/Mulli.js';
import { serializePower } from '../systems/power.js';

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
    const extraPlaced = extraPlacedObjects.filter(o=>!o.dead).map(o=>({
      id: o.def.id,
      wx: o.position.x,
      wz: o.position.z,
      contents: o.contents || null,
      powerNodeId: o.powerNodeId || null,
    }));

    const power = serializePower();
    let attachedPalletIndex = null;
    if(Mulli?.attachedPallet){
      attachedPalletIndex = pallets.indexOf(Mulli.attachedPallet);
      if(attachedPalletIndex < 0) attachedPalletIndex = null;
    }

    const data = {
      seed: GameState.seed, day: GameState.day, hour: GameState.hour, minute: GameState.minute,
      gold: GameState.gold, energy: GameState.energy, weather: GameState.weather,
      selectedSlot: GameState.selectedSlot,
      hotbar: GameState.hotbar.map(s => s ? { id:s.id, count:s.count } : null),
      backpack: GameState.backpack.map(s => s ? { id:s.id, count:s.count } : null),
      carried: GameState.carried,
      playerX: Player.x, playerZ: Player.z,
      farmTiles: farmTileList, removedResourceIds, extraPlaced,
      pallets: pallets.filter(p=>!p.dead).map(p => ({
        id: p.saveId, wx: p.position.x, wz: p.position.z, contents: p.contents,
      })),
      groundItems: groundItems.filter(g=>!g.dead).map(g => ({
        id: g.itemId, count: g.count, wx: g.position.x, wz: g.position.z,
      })),
      mulli: Mulli ? {
        wx: Mulli.x, wz: Mulli.z, rotY: Mulli.rotY, charge: Mulli.charge,
        attachedPalletIndex,
      } : null,
      powerNodes: power.powerNodes,
      cables: power.cables,
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

/** Also try legacy v5 key for silent upgrade */
export function loadSaveDataWithFallback(){
  let data = loadSaveData();
  if(data) return data;
  for(const key of ['harvest_isle_save_v6', 'harvest_isle_save_v5']){
    try {
      const raw = localStorage.getItem(key);
      if(raw) return JSON.parse(raw);
    } catch(e){}
  }
  return null;
}
