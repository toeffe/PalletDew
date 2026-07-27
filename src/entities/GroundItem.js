import * as THREE from 'three';
import { ItemRegistry } from '../core/registry.js';
import { GameState, log } from '../core/state.js';
import { resourceGroup } from '../world/resources.js';
import { terrainHeightWorld } from '../world/terrain.js';
import { addItem, setCarried, clearCarried } from '../systems/inventory.js';
import { WorldEntity, spawnEntity, entities } from './WorldEntity.js';
import { updateUI } from '../ui/hud.js';

export const groundItems = [];

export class GroundItem extends WorldEntity {
  constructor(wx, wz, itemId, count=1){
    const wy = terrainHeightWorld(wx, wz);
    super(wx, wy, wz);
    this.itemId = itemId;
    this.count = count;
    const def = ItemRegistry.get(itemId);
    this.def = def;
    this.mesh = buildGroundMesh(def);
    this.mesh.position.set(wx, wy + 0.35, wz);
    this.mesh.traverse(c => { c.userData.entityRef = this; });
    resourceGroup.add(this.mesh);
  }

  interact(){
    const def = this.def;
    if(!def) return;
    if(def.canCarryByHand && (def.size === 'large' || def.size === 'medium')){
      if(GameState.carried){ log('Hands are full.'); return; }
      if(setCarried(this.itemId, this.count)){
        log(`Picked up ${def.name}.`);
        this.destroy();
        updateUI();
      }
      return;
    }
    if(addItem(this.itemId, this.count)){
      log(`Picked up ${def.name}.`);
      this.destroy();
      updateUI();
    }
  }

  destroy(){
    const idx = groundItems.indexOf(this);
    if(idx >= 0) groundItems.splice(idx, 1);
    super.destroy();
  }
}

function buildGroundMesh(def){
  const g = new THREE.Group();
  const color = def?.size === 'large' ? 0xc4a35a : (def?.size === 'medium' ? 0x6b8cae : 0x7ec850);
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85 })
  );
  box.position.y = 0.35;
  g.add(box);
  return g;
}

export function spawnGroundItem(wx, wz, itemId, count=1){
  const g = new GroundItem(wx, wz, itemId, count);
  groundItems.push(g);
  spawnEntity(g);
  return g;
}

export function dropCarriedAt(wx, wz){
  if(!GameState.carried) return false;
  const { id, count } = GameState.carried;
  clearCarried();
  spawnGroundItem(wx, wz, id, count);
  updateUI();
  return true;
}

export function clearGroundItems(){
  for(const g of [...groundItems]) g.destroy();
  groundItems.length = 0;
}

export function restoreGroundItems(list){
  clearGroundItems();
  for(const g of list || []){
    spawnGroundItem(g.wx, g.wz, g.id, g.count);
  }
}
