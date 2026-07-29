import './style.css';
import './engine/sky.js';
import './world/water.js';
import './world/decor.js';

import { GameState, log } from './core/state.js';
import { BATTERY_MAX_CHARGE, PANEL_OUTPUT_RATE } from './core/constants.js';
import { saveGame, loadSaveDataWithFallback } from './core/save.js';
import { registerAllContent } from './content/register.js';
import { setInventoryChangeHandler, giveStartingInventory, loadInventoryFromSave } from './systems/inventory.js';
import { pickWeather } from './systems/time.js';
import {
  clearPowerGraph, registerNode, restoreCable, connectNodes, powerNodes,
} from './systems/power.js';
import { generateWorld } from './world/generate.js';
import {
  getOrCreateFarmTile, ensureDirtMesh, setTileDirtLook
} from './world/farm.js';
import { resourceObjects, extraPlacedObjects } from './world/resources.js';
import { Crop } from './entities/Crop.js';
import { PlacedObject } from './entities/PlacedObject.js';
import { spawnEntity } from './entities/WorldEntity.js';
import { Player } from './entities/player.js';
import { spawnPallet, clearPallets, pallets } from './entities/Pallet.js';
import { restoreGroundItems, clearGroundItems } from './entities/GroundItem.js';
import { spawnMulli, clearMulli, Mulli } from './entities/Mulli.js';
import { placeFreeObject } from './content/actions.js';
import { updateUI } from './ui/hud.js';
import { initCraftPanel } from './ui/craftPanel.js';
import { initMenu } from './ui/menu.js';
import { initInventoryPanel } from './ui/inventoryPanel.js';
import { initInput } from './engine/input.js';
import { animate } from './engine/loop.js';
import { VehicleControl } from './systems/vehicleControl.js';

registerAllContent();
setInventoryChangeHandler(updateUI);
initInput();
initMenu();
initCraftPanel();
initInventoryPanel();

function clearLogistics(){
  clearPowerGraph();
  clearPallets();
  clearGroundItems();
  clearMulli();
  VehicleControl.suppressPlayerMove = false;
  VehicleControl.unhitchPallet = null;
  extraPlacedObjects.length = 0;
}

function spawnStarterKit(){
  // Panel, battery, dock near farm spawn (player ~0,14)
  const panel = placeFreeObject('solar_panel', -4, 10);
  const batt = placeFreeObject('battery', 0, 8);
  const dock = placeFreeObject('charge_dock', 4, 10);
  // onPlace already registered nodes — connect them
  if(panel.powerNodeId && batt.powerNodeId) connectNodes(panel.powerNodeId, batt.powerNodeId);
  if(batt.powerNodeId && dock.powerNodeId) connectNodes(batt.powerNodeId, dock.powerNodeId);
  const battNode = powerNodes.get(batt.powerNodeId);
  if(battNode) battNode.charge = 120;

  spawnPallet(6, 12);
  spawnMulli(4, 12, { charge: 80, rotY: 0 });
  log('Solar starter kit ready — park Mulli on the dock to charge.');
}

function applySave(data){
  clearLogistics();
  GameState.seed = data.seed;
  GameState.day = data.day; GameState.hour = data.hour; GameState.minute = data.minute;
  GameState.gold = data.gold; GameState.energy = data.energy; GameState.weather = data.weather || 'clear';
  loadInventoryFromSave(data);
  GameState.carried = data.carried || null;
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

  // Power nodes first (may also come from placed objects)
  clearPowerGraph();
  const powerKinds = new Set(['solar_panel','battery','charge_dock']);
  (data.extraPlaced||[]).forEach(p => {
    const obj = new PlacedObject(p.wx, p.wz, p.id);
    if(p.contents) obj.contents = p.contents.map(c => c ? { ...c } : null);
    spawnEntity(obj); extraPlacedObjects.push(obj);
    // Re-bind power node id if saved
    if(powerKinds.has(p.id) && p.powerNodeId && obj.powerNodeId){
      // onPlace created a new id — remap cables later using positions
    }
  });

  // If save has explicit powerNodes, rebuild graph from that (authoritative)
  if(data.powerNodes?.length){
    clearPowerGraph();
    // Destroy auto-registered nodes from onPlace — re-register with saved ids
    for(const o of extraPlacedObjects){
      if(powerKinds.has(o.def?.id)){
        o.powerNodeId = null;
      }
    }
    for(const n of data.powerNodes){
      const entity = extraPlacedObjects.find(o =>
        o.def?.id === n.kind && Math.hypot(o.position.x - n.wx, o.position.z - n.wz) < 0.5
      );
      const node = registerNode(n.kind, n.wx, n.wz, {
        id: n.id,
        charge: n.charge,
        maxCharge: n.kind === 'battery' ? BATTERY_MAX_CHARGE : 0,
        outputRate: n.kind === 'solar_panel' ? PANEL_OUTPUT_RATE : 0,
        entity,
      });
      if(entity){
        entity.powerNodeId = node.id;
        entity.refreshChargeVisual = (ratio) => {
          if(entity._fillMesh){
            entity._fillMesh.scale.y = Math.max(0.05, ratio);
            entity._fillMesh.position.y = 0.15 + ratio * 0.6;
          }
        };
        if(n.kind === 'battery'){
          entity.mesh.traverse(c => { if(c.userData?.isFill) entity._fillMesh = c; });
          entity.refreshChargeVisual(n.charge / BATTERY_MAX_CHARGE);
        }
        if(n.kind === 'solar_panel'){
          entity.mesh.traverse(c => { if(c.userData?.isChargeIndicator) entity._chargeIndicator = c; });
          entity.mesh.traverse(c => { if(c.userData?.isChargeLight) entity._chargeLight = c; });
          entity.refreshChargeVisual(0);
        }
      }
    }
    for(const c of data.cables || []){
      restoreCable(c.id, c.a, c.b);
    }
  }

  clearPallets();
  (data.pallets||[]).forEach(p => spawnPallet(p.wx, p.wz, p.contents, p.id));

  restoreGroundItems(data.groundItems || []);

  if(data.mulli){
    spawnMulli(data.mulli.wx, data.mulli.wz, {
      rotY: data.mulli.rotY,
      charge: data.mulli.charge,
    });
    const idx = data.mulli.attachedPalletIndex;
    if(Mulli && idx != null && pallets[idx]){
      Mulli.hitch(pallets[idx]);
    }
  }

  Player.x = data.playerX; Player.z = data.playerZ;
  log('Save loaded. Welcome back!');
}

function initNewGame(){
  clearLogistics();
  giveStartingInventory();
  GameState.weather = pickWeather();
  generateWorld();
  spawnStarterKit();
  log('A new island rises from the sea...');
  log(`Weather: ${GameState.weather}.`);
}

const existing = loadSaveDataWithFallback();
if(existing){ applySave(existing); } else { initNewGame(); }
updateUI();

document.getElementById('loading').style.display = 'none';
animate();
setInterval(() => { document.getElementById('time') && saveGame(true); }, 30000);
window.addEventListener('beforeunload', () => saveGame(true));
