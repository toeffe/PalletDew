import { keys } from './keys.js';
import * as THREE from 'three';
import { TILE } from '../core/constants.js';
import { GameState, log } from '../core/state.js';
import { scene, camera } from './renderer.js';
import { BED_SIZE, getOrCreateFarmTile, canPlaceBed, BED_HEIGHT } from '../world/farm.js';
import { terrainHeightWorld, terrainData } from '../world/terrain.js';
import { Player } from '../entities/player.js';
import { resourceGroup } from '../world/resources.js';
import { getSelectedItem, consumeSelected } from '../systems/inventory.js';
import { useToolOnFarmTile, tryHarvest } from '../systems/tools.js';
import { sleep } from '../systems/time.js';
import { updateUI } from '../ui/hud.js';
import { isMenuOpen, toggleMenu } from '../ui/menu.js';
import { connectNodes, disconnectCable, getNodeAtEntity } from '../systems/power.js';
import { freePlaceAt, dropOrPlacePallet } from '../content/actions.js';
import { dropCarriedAt } from '../entities/GroundItem.js';
import { Mulli } from '../entities/Mulli.js';
import { closeTransferPanel, isTransferOpen } from '../ui/transferPanel.js';
import { closeSplitPanel } from '../ui/hotbar.js';
import { toggleInventory, setInventoryOpen, isInventoryOpen } from '../ui/inventoryPanel.js';
import { HOTBAR_SIZE } from '../core/constants.js';

export { keys };
export const raycaster = new THREE.Raycaster();
export const mouse = new THREE.Vector2();
export let hoveredFarmTile = null;

let pendingConnection = null; // power node

const highlightGeo = new THREE.PlaneGeometry(BED_SIZE * 1.05, BED_SIZE * 1.05);
highlightGeo.rotateX(-Math.PI / 2);
export const highlightMesh = new THREE.Mesh(highlightGeo, new THREE.MeshBasicMaterial({
  color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4
}));
scene.add(highlightMesh); highlightMesh.visible = false;

function cancelConnectMode(){
  pendingConnection = null;
  GameState.connectHint = null;
  updateUI();
}

function raycastEntity(){
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(resourceGroup.children, true);
  if(!hits.length){
    const cableHits = raycaster.intersectObjects(scene.children, true);
    for(const h of cableHits){
      let obj = h.object;
      while(obj && !obj.userData.isCable && !obj.userData.entityRef) obj = obj.parent;
      if(obj?.userData.isCable) return { cableId: obj.userData.cableId };
      if(obj?.userData.entityRef) return { entity: obj.userData.entityRef };
    }
    return null;
  }
  let obj = hits[0].object;
  while(obj && !obj.userData.entityRef && !obj.userData.isCable) obj = obj.parent;
  if(!obj) return null;
  if(obj.userData.isCable) return { cableId: obj.userData.cableId };
  return { entity: obj.userData.entityRef };
}

function terrainHitPoint(){
  if(!terrainData) return null;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(terrainData.mesh);
  if(!hits.length) return null;
  return hits[0].point;
}

export function initInput(){
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape'){
      e.preventDefault();
      if(pendingConnection){ cancelConnectMode(); return; }
      if(isInventoryOpen()){ setInventoryOpen(false); return; }
      if(isTransferOpen()){ closeTransferPanel(); return; }
      closeSplitPanel();
      toggleMenu();
      return;
    }
    if(isMenuOpen()) return;

    // Inventory toggle (I) — works even when inventory is open
    if(e.key.toLowerCase() === 'i' && !e.ctrlKey && !e.metaKey && !e.altKey){
      e.preventDefault();
      if(isTransferOpen()) closeTransferPanel();
      toggleInventory();
      return;
    }

    if(isInventoryOpen()){
      if(e.key>='1' && e.key<='9'){
        const idx = parseInt(e.key)-1;
        if(idx < HOTBAR_SIZE){ GameState.selectedSlot = idx; updateUI(); }
      }
      return;
    }

    keys[e.key.toLowerCase()] = true;
    if(e.key>='1' && e.key<='9'){
      const idx = parseInt(e.key)-1;
      if(idx < HOTBAR_SIZE){
        GameState.selectedSlot = idx;
        cancelConnectMode();
        updateUI();
      }
    }
    if(e.key.toLowerCase()==='e') tryHarvest();
    if(e.key===' '){ e.preventDefault(); sleep(); }
    if(e.key.toLowerCase()==='g'){
      if(dropOrPlacePallet()) return;
      if(GameState.carried){
        const dist = 1.5;
        const wx = Player.x + Math.sin(Player.facing) * dist;
        const wz = Player.z + Math.cos(Player.facing) * dist;
        dropCarriedAt(wx, wz);
        log('Dropped item.');
      }
    }
  });
  document.addEventListener('keyup', e => {
    if(e.key === 'Escape') return;
    keys[e.key.toLowerCase()] = false;
  });

  window.addEventListener('mousemove', e => {
    mouse.x = (e.clientX/window.innerWidth)*2-1;
    mouse.y = -(e.clientY/window.innerHeight)*2+1;
  });
  window.addEventListener('mousedown', e => {
    if(isMenuOpen() || isInventoryOpen()) return;
    if(e.target.closest('.slot') || e.target.closest('button') || e.target.closest('#craft-panel') || e.target.closest('#transfer-panel') || e.target.closest('#split-panel') || e.target.closest('#inventory-panel')) return;

    if(Mulli?.mounted){
      const hit = raycastEntity();
      if(hit?.entity === Mulli) Mulli.interact();
      return;
    }

    const selected = getSelectedItem();

    if(selected?.id === 'cable_item'){
      const hit = raycastEntity();
      if(hit?.cableId){
        disconnectCable(hit.cableId, true);
        log('Cable removed.');
        updateUI();
        return;
      }
      const node = hit?.entity ? getNodeAtEntity(hit.entity) : null;
      if(!node){
        if(pendingConnection) log('Click a power node.');
        return;
      }
      if(!pendingConnection){
        pendingConnection = node;
        GameState.connectHint = 'Select second node to link · Esc cancel';
        updateUI();
        return;
      }
      if(pendingConnection.id === node.id){
        log('Pick a different node.');
        return;
      }
      const cable = connectNodes(pendingConnection.id, node.id);
      if(cable){
        consumeSelected(1);
        log('Cable connected.');
      }
      cancelConnectMode();
      return;
    }

    if(selected?.useAction?.startsWith('place_') && ['place_solar_panel','place_battery','place_charge_dock'].includes(selected.useAction)){
      const pt = terrainHitPoint();
      if(pt){
        const dist = Math.hypot(pt.x - Player.x, pt.z - Player.z);
        if(dist < TILE * 5){
          freePlaceAt(pt.x, pt.z, selected);
          return;
        }
      }
    }

    if(hoveredFarmTile){ useToolOnFarmTile(hoveredFarmTile); return; }

    const hit = raycastEntity();
    if(hit?.cableId){
      disconnectCable(hit.cableId, true);
      log('Cable removed.');
      updateUI();
      return;
    }
    if(hit?.entity){
      const ent = hit.entity;
      const dist = Math.hypot(ent.position.x-Player.x, ent.position.z-Player.z);
      const mx = ent.x ?? ent.position.x;
      const mz = ent.z ?? ent.position.z;
      const d2 = Math.hypot(mx-Player.x, mz-Player.z);
      if(Math.min(dist, d2) < TILE*4 && !ent.dead) ent.interact(getSelectedItem());
    }
  });
}

export function updateRaycast(){
  if(isMenuOpen() || isInventoryOpen()){
    hoveredFarmTile = null;
    highlightMesh.visible = false;
    document.getElementById('tooltip').style.display = 'none';
    return;
  }
  raycaster.setFromCamera(mouse, camera);
  hoveredFarmTile = null;
  highlightMesh.visible = false;
  document.getElementById('tooltip').style.display = 'none';
  if(!terrainData) return;
  const hits = raycaster.intersectObject(terrainData.mesh);
  if(hits.length === 0) return;
  const p = hits[0].point;
  const tx = Math.floor(p.x / TILE);
  const tz = Math.floor(p.z / TILE);
  const tile = getOrCreateFarmTile(tx, tz);
  if(!tile) return;
  hoveredFarmTile = tile;
  const ground = terrainHeightWorld(tile.wx, tile.wz);
  const wy = tile.tilled ? ground + BED_HEIGHT + 0.04 : ground + 0.06;
  highlightMesh.position.set(tile.wx, wy, tile.wz);
  highlightMesh.visible = true;
  const tt = document.getElementById('tooltip');
  let txt = `<strong>${tile.type.toUpperCase()}</strong>`;
  if(tile.tilled) txt += '<br>🌱 Flower bed';
  if(tile.watered) txt += ' 💧 Wet';
  if(tile.crop) txt += `<br>🌿 ${tile.crop.def.name} (${tile.crop.stage}/${tile.crop.def.stages})`;
  if(tile.object) txt += `<br>📦 ${tile.object.def.name}`;
  if(!tile.tilled && !canPlaceBed(tile)) txt += '<br><span style="color:#e88">✗ Too close to water or blocked</span>';
  if(GameState.connectHint) txt += `<br><span style="color:#8cf">${GameState.connectHint}</span>`;
  tt.innerHTML = txt; tt.style.display = 'block';
  tt.style.left = (window.innerWidth/2 + mouse.x*window.innerWidth/2 + 15)+'px';
  tt.style.top = (window.innerHeight/2 - mouse.y*window.innerHeight/2 - 10)+'px';
}
