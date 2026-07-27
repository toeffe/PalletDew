import './style.css';
import './engine/sky.js';
import './world/water.js';
import './world/decor.js';

import { GameState, log } from './core/state.js';
import { ItemRegistry } from './core/registry.js';
import { saveGame, loadSaveData } from './core/save.js';
import { registerAllContent } from './content/register.js';
import { setInventoryChangeHandler, giveStartingInventory } from './systems/inventory.js';
import { pickWeather } from './systems/time.js';
import { generateWorld } from './world/generate.js';
import {
  getOrCreateFarmTile, ensureDirtMesh, setTileDirtLook
} from './world/farm.js';
import { resourceObjects, extraPlacedObjects } from './world/resources.js';
import { Crop } from './entities/Crop.js';
import { PlacedObject } from './entities/PlacedObject.js';
import { spawnEntity } from './entities/WorldEntity.js';
import { Player } from './entities/player.js';
import { updateUI } from './ui/hud.js';
import { initCraftPanel } from './ui/craftPanel.js';
import { initMenu } from './ui/menu.js';
import { initInput } from './engine/input.js';
import { animate } from './engine/loop.js';

registerAllContent();
setInventoryChangeHandler(updateUI);
initInput();
initMenu();
initCraftPanel();

function applySave(data){
  GameState.seed = data.seed;
  GameState.day = data.day; GameState.hour = data.hour; GameState.minute = data.minute;
  GameState.gold = data.gold; GameState.energy = data.energy; GameState.weather = data.weather || 'clear';
  GameState.selectedSlot = data.selectedSlot || 0;
  GameState.inventory = data.inventory.map(i => ({ ...ItemRegistry.get(i.id), count:i.count }));
  generateWorld();

  (data.farmTiles||[]).forEach(saved => {
    const tile = getOrCreateFarmTile(saved.x, saved.y);
    if(!tile) return;
    tile.tilled = saved.tilled; tile.watered = saved.watered;
    if(tile.tilled){
      ensureDirtMesh(tile);
      setTileDirtLook(tile);
    }
    if(saved.cropId){
      const crop = new Crop(tile, saved.cropId);
      crop.stage = saved.stage; crop.watered = tile.watered; crop.refreshMesh();
      tile.crop = crop; spawnEntity(crop);
    }
    if(saved.objectId){
      const obj = new PlacedObject(tile.wx, tile.wz, saved.objectId);
      tile.object = obj; spawnEntity(obj); extraPlacedObjects.push(obj);
    }
  });
  (data.removedResourceIds||[]).forEach(id => {
    const obj = resourceObjects.find(o => o.saveId===id);
    if(obj && !obj.dead) obj.destroy();
  });
  (data.extraPlaced||[]).forEach(p => {
    const obj = new PlacedObject(p.wx, p.wz, p.id);
    spawnEntity(obj); extraPlacedObjects.push(obj);
  });

  Player.x = data.playerX; Player.z = data.playerZ;
  log('Save loaded. Welcome back!');
}

function initNewGame(){
  giveStartingInventory();
  GameState.weather = pickWeather();
  generateWorld();
  log('A new island rises from the sea...');
  log(`Weather: ${GameState.weather}.`);
}

const existing = loadSaveData();
if(existing){ applySave(existing); } else { initNewGame(); }
updateUI();

document.getElementById('loading').style.display = 'none';
animate();
setInterval(() => { document.getElementById('time') && saveGame(true); }, 30000);
window.addEventListener('beforeunload', () => saveGame(true));
