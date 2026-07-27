import { defineAction, CropRegistry } from '../core/registry.js';
import { currentSeason, log, GameState } from '../core/state.js';
import { canPlaceBed, ensureDirtMesh, setTileDirtLook, removeDirtMesh } from '../world/farm.js';
import { Crop } from '../entities/Crop.js';
import { PlacedObject } from '../entities/PlacedObject.js';
import { spawnEntity } from '../entities/WorldEntity.js';
import { spawnPallet } from '../entities/Pallet.js';
import { extraPlacedObjects } from '../world/resources.js';
import { Player } from '../entities/player.js';
import { useEnergy, consumeIfEmpty, clearCarried } from '../systems/inventory.js';
import { updateUI } from '../ui/hud.js';

function makePlantAction(cropId){
  const cropDef = CropRegistry.get(cropId);
  return {
    id:`plant_${cropId}`, name:`Plant ${cropDef.name}`,
    canUse: (tile, item) => tile.tilled && !tile.crop && !tile.object && item && item.count>0 && cropDef.seasons.includes(currentSeason()),
    onUse: (tile, item) => {
      const crop = new Crop(tile, cropId);
      tile.crop = crop; spawnEntity(crop);
      item.count--; consumeIfEmpty(item);
      updateUI(); log(`Planted ${cropDef.name}`);
    }
  };
}

function makePlaceAction(itemId, objId){
  return {
    id:`place_${objId}`, name:`Place ${objId}`,
    canUse: (tile, item) => tile.tilled===false && !tile.object && !tile.crop && item && item.count>0,
    onUse: (tile, item) => {
      const obj = new PlacedObject(tile.wx, tile.wz, objId);
      tile.object = obj; spawnEntity(obj);
      extraPlacedObjects.push(obj);
      item.count--; consumeIfEmpty(item);
      updateUI(); log(`Placed ${obj.def.name}`);
    }
  };
}

function makeFreePlaceAction(itemId, objId){
  return {
    id:`place_${objId}`, name:`Place ${objId}`,
    canUse: () => false,
    onUse: () => {},
    freePlace: true,
    itemId,
    objId,
  };
}

export function placeFreeObject(objId, wx, wz){
  const obj = new PlacedObject(wx, wz, objId);
  spawnEntity(obj);
  extraPlacedObjects.push(obj);
  return obj;
}

const FREE_PLACE_MAP = {
  place_solar_panel: 'solar_panel',
  place_battery: 'battery',
  place_charge_dock: 'charge_dock',
};

export function freePlaceAt(wx, wz, item){
  if(!item?.useAction) return false;
  const objId = FREE_PLACE_MAP[item.useAction];
  if(!objId) return false;
  placeFreeObject(objId, wx, wz);
  item.count--;
  consumeIfEmpty(item);
  updateUI();
  log(`Placed ${objId.replace(/_/g,' ')}.`);
  return true;
}

export function dropOrPlacePallet(){
  if(GameState.carried?.id === 'pallet_item'){
    const dist = 1.8;
    const wx = Player.x + Math.sin(Player.facing) * dist;
    const wz = Player.z + Math.cos(Player.facing) * dist;
    spawnPallet(wx, wz);
    clearCarried();
    updateUI();
    log('Placed pallet.');
    return true;
  }
  return false;
}

export function registerActions(){
  defineAction({
    id:'till', name:'Till Soil',
    canUse: (tile) => canPlaceBed(tile),
    onUse: (tile) => {
      tile.tilled = true; tile.watered = false;
      ensureDirtMesh(tile);
      setTileDirtLook(tile);
      useEnergy(2);
    }
  });
  defineAction({
    id:'water', name:'Water',
    canUse: (tile) => tile.tilled,
    onUse: (tile) => {
      tile.watered = true;
      ensureDirtMesh(tile);
      setTileDirtLook(tile);
      if(tile.crop) tile.crop.watered = true;
      useEnergy(1);
    }
  });
  defineAction({
    id:'clear', name:'Clear',
    canUse: (tile) => tile.tilled || tile.crop,
    onUse: (tile) => {
      if(tile.crop){ tile.crop.destroy(); tile.crop = null; }
      tile.tilled = false; tile.watered = false;
      removeDirtMesh(tile);
      useEnergy(2);
    }
  });
  defineAction({
    id:'harvest', name:'Harvest',
    canUse: (tile) => tile.crop && tile.crop.stage >= tile.crop.def.stages,
    onUse: (tile) => { if(tile.crop) tile.crop.harvest(); }
  });
  defineAction(makePlantAction('turnip'));
  defineAction(makePlantAction('potato'));
  defineAction(makePlantAction('carrot'));
  defineAction(makePlantAction('pumpkin'));
  defineAction(makePlaceAction('chest_item','chest'));
  defineAction(makePlaceAction('scarecrow_item','scarecrow'));
  defineAction(makePlaceAction('lamp_item','lamp_post'));
  defineAction(makeFreePlaceAction('solar_panel_item','solar_panel'));
  defineAction(makeFreePlaceAction('battery_item','battery'));
  defineAction(makeFreePlaceAction('charge_dock_item','charge_dock'));
}

export { makePlantAction, makePlaceAction, makeFreePlaceAction };
