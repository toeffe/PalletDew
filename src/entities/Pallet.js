import * as THREE from 'three';
import { ItemRegistry } from '../core/registry.js';
import { PALLET_SLOTS } from '../core/constants.js';
import { GameState, log } from '../core/state.js';
import { resourceGroup } from '../world/resources.js';
import { terrainHeightWorld } from '../world/terrain.js';
import { addItem, setCarried, clearCarried } from '../systems/inventory.js';
import { WorldEntity, spawnEntity } from './WorldEntity.js';
import { openTransferPanel } from '../ui/transferPanel.js';
import { updateUI } from '../ui/hud.js';
import { VehicleControl } from '../systems/vehicleControl.js';

export const pallets = [];
let nextPalletId = 1;

export class Pallet extends WorldEntity {
  constructor(wx, wz, contents=null, saveId=null){
    const wy = terrainHeightWorld(wx, wz);
    super(wx, wy, wz);
    this.saveId = saveId || `pal_${nextPalletId++}`;
    const m = String(this.saveId).match(/(\d+)$/);
    if(m) nextPalletId = Math.max(nextPalletId, parseInt(m[1],10)+1);
    this.contents = contents ? contents.map(c => c ? { ...c } : null) : Array(PALLET_SLOTS).fill(null);
    this.attachedToMulli = false;
    this.mesh = buildPalletMesh();
    this.mesh.position.set(wx, wy, wz);
    this.mesh.traverse(c => { c.userData.entityRef = this; if(c.isMesh){ c.castShadow=true; c.receiveShadow=true; } });
    this.cargoGroup = new THREE.Group();
    this.mesh.add(this.cargoGroup);
    resourceGroup.add(this.mesh);
    this.refreshCargoVisual();
  }

  setWorldPos(wx, wz){
    const wy = terrainHeightWorld(wx, wz);
    this.position.set(wx, wy, wz);
    if(!this.attachedToMulli) this.mesh.position.set(wx, wy, wz);
  }

  canAccept(itemId, count=1){
    const def = ItemRegistry.get(itemId);
    if(!def) return false;
    const max = def.maxPalletStack ?? 1;
    const existing = this.contents.find(s => s && s.id === itemId && s.count < max);
    if(existing) return true;
    return this.contents.some(s => !s);
  }

  load(itemId, count=1){
    const def = ItemRegistry.get(itemId);
    if(!def) return 0;
    const max = def.maxPalletStack ?? 1;
    let remaining = count;
    for(const slot of this.contents){
      if(remaining <= 0) break;
      if(slot && slot.id === itemId && slot.count < max){
        const add = Math.min(max - slot.count, remaining);
        slot.count += add;
        remaining -= add;
      }
    }
    while(remaining > 0){
      const idx = this.contents.findIndex(s => !s);
      if(idx < 0) break;
      const add = Math.min(max, remaining);
      this.contents[idx] = { id: itemId, count: add };
      remaining -= add;
    }
    this.refreshCargoVisual();
    return count - remaining;
  }

  unloadSlot(slotIndex){
    const slot = this.contents[slotIndex];
    if(!slot) return null;
    this.contents[slotIndex] = null;
    this.refreshCargoVisual();
    return slot;
  }

  interact(){
    // If attached to Mulli, just show info — dropping is done via E on the Mulli
    if(this.attachedToMulli){
      log('Pallet is being towed. Press E on the Mulli to drop it.');
      return;
    }

    if(GameState.carried){
      const { id, count } = GameState.carried;
      const added = this.load(id, count);
      if(added > 0){
        if(added >= count) clearCarried();
        else GameState.carried.count -= added;
        log(`Loaded onto pallet.`);
        updateUI();
        return;
      }
      log('Pallet cannot hold that.');
      return;
    }

    openTransferPanel({
      title: 'Pallet',
      slots: this.contents,
      onChange: () => this.refreshCargoVisual(),
      allowLarge: true,
    });
  }

  refreshCargoVisual(){
    while(this.cargoGroup.children.length){
      const c = this.cargoGroup.children[0];
      this.cargoGroup.remove(c);
      c.traverse(ch => { if(ch.geometry) ch.geometry.dispose(); if(ch.material) ch.material.dispose(); });
    }
    let i = 0;
    for(const slot of this.contents){
      if(!slot) continue;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.4 + Math.min(0.8, slot.count * 0.05), 0.55),
        new THREE.MeshStandardMaterial({ color: 0xb87333, flatShading: true })
      );
      const row = i % 2;
      const col = Math.floor(i / 2);
      box.position.set(-0.3 + row * 0.6, 0.35 + box.geometry.parameters.height/2, -0.9 + col * 0.6);
      this.cargoGroup.add(box);
      i++;
    }
  }

  destroy(){
    const idx = pallets.indexOf(this);
    if(idx >= 0) pallets.splice(idx, 1);
    super.destroy();
  }
}

function buildPalletMesh(){
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8b6914, flatShading: true, roughness: 0.9 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x6b4a0a, flatShading: true, roughness: 0.9 });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 2.4), wood);
  deck.position.y = 0.2;
  g.add(deck);

  for(let i = 0; i < 5; i++){
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.24), wood);
    board.position.set(0, 0.29, -0.96 + i * 0.48);
    g.add(board);
  }

  for(let i = -1; i <= 1; i++){
    const runner = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 2.4), darkWood);
    runner.position.set(i * 0.7, 0.09, 0);
    g.add(runner);
  }

  for(let i = 0; i < 3; i++){
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.2), wood);
    board.position.set(0, 0.025, -0.6 + i * 0.6);
    g.add(board);
  }

  return g;
}

export function spawnPallet(wx, wz, contents=null, saveId=null){
  const p = new Pallet(wx, wz, contents, saveId);
  pallets.push(p);
  spawnEntity(p);
  return p;
}

export function clearPallets(){
  for(const p of [...pallets]) p.destroy();
  pallets.length = 0;
  nextPalletId = 1;
}

export function findNearestPallet(wx, wz, radius){
  let best = null, bestD = radius;
  for(const p of pallets){
    if(p.dead || p.attachedToMulli) continue;
    const d = Math.hypot(p.position.x - wx, p.position.z - wz);
    if(d < bestD){ best = p; bestD = d; }
  }
  return best;
}