import { keys } from './keys.js';
import * as THREE from 'three';
import { TILE } from '../core/constants.js';
import { GameState } from '../core/state.js';
import { scene, camera } from './renderer.js';
import { BED_SIZE, getOrCreateFarmTile, canPlaceBed, BED_HEIGHT } from '../world/farm.js';
import { terrainHeightWorld, terrainData } from '../world/terrain.js';
import { Player } from '../entities/player.js';
import { resourceGroup } from '../world/resources.js';
import { getSelectedItem } from '../systems/inventory.js';
import { useToolOnFarmTile, tryHarvest } from '../systems/tools.js';
import { sleep } from '../systems/time.js';
import { updateUI } from '../ui/hud.js';
import { isMenuOpen, toggleMenu } from '../ui/menu.js';

export { keys };
export const raycaster = new THREE.Raycaster();
export const mouse = new THREE.Vector2();
export let hoveredFarmTile = null;

const highlightGeo = new THREE.PlaneGeometry(BED_SIZE * 1.05, BED_SIZE * 1.05);
highlightGeo.rotateX(-Math.PI / 2);
export const highlightMesh = new THREE.Mesh(highlightGeo, new THREE.MeshBasicMaterial({
  color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4
}));
scene.add(highlightMesh); highlightMesh.visible = false;

export function initInput(){
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape'){
      e.preventDefault();
      toggleMenu();
      return;
    }
    if(isMenuOpen()) return;

    keys[e.key.toLowerCase()] = true;
    if(e.key>='1' && e.key<='9'){
      const idx = parseInt(e.key)-1;
      if(idx < GameState.inventory.length){ GameState.selectedSlot = idx; updateUI(); }
    }
    if(e.key.toLowerCase()==='e') tryHarvest();
    if(e.key===' '){ e.preventDefault(); sleep(); }
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
    if(isMenuOpen()) return;
    if(e.target.closest('.slot') || e.target.closest('button') || e.target.closest('#craft-panel')) return;
    if(hoveredFarmTile){ useToolOnFarmTile(hoveredFarmTile); return; }
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(resourceGroup.children, true);
    if(hits.length){
      let obj = hits[0].object;
      while(obj && !obj.userData.entityRef) obj = obj.parent;
      if(obj){
        const ent = obj.userData.entityRef;
        const dist = Math.hypot(ent.position.x-Player.x, ent.position.z-Player.z);
        if(dist < TILE*4 && !ent.dead) ent.interact(getSelectedItem());
      }
    }
  });
}

export function updateRaycast(){
  if(isMenuOpen()){
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
  tt.innerHTML = txt; tt.style.display = 'block';
  tt.style.left = (window.innerWidth/2 + mouse.x*window.innerWidth/2 + 15)+'px';
  tt.style.top = (window.innerHeight/2 - mouse.y*window.innerHeight/2 - 10)+'px';
}
