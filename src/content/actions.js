import { defineAction, CropRegistry } from '../core/registry.js';
import { currentSeason, log } from '../core/state.js';
import { canPlaceBed, ensureDirtMesh, setTileDirtLook, removeDirtMesh } from '../world/farm.js';
import { Crop } from '../entities/Crop.js';
import { PlacedObject } from '../entities/PlacedObject.js';
import { spawnEntity } from '../entities/WorldEntity.js';
import { extraPlacedObjects } from '../world/resources.js';
import { useEnergy, consumeIfEmpty } from '../systems/inventory.js';
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
}

export { makePlantAction, makePlaceAction };
