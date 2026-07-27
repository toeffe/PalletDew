import * as THREE from 'three';
import { CropRegistry } from '../core/registry.js';
import { GameState, log } from '../core/state.js';
import { scene } from '../engine/renderer.js';
import { terrainHeightWorld } from '../world/terrain.js';
import { WorldEntity } from './WorldEntity.js';
import { updateUI } from '../ui/hud.js';

export class Crop extends WorldEntity {
  constructor(tile, cropId){
    const wy = (tile.tilled ? (tile.flatY || terrainHeightWorld(tile.wx, tile.wz) + 0.28) : terrainHeightWorld(tile.wx, tile.wz)) + 0.06;
    super(tile.wx, wy, tile.wz);
    this.tile = tile;
    this.def = CropRegistry.get(cropId);
    this.stage = 0;
    this.watered = false;
    this.mesh = this.buildMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }
  buildMesh(){
    const g = new THREE.Group();
    const growth = this.stage/this.def.stages;
    const h = 0.3 + growth*1.2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.1,h,5), new THREE.MeshStandardMaterial({color:0x27ae60}));
    stem.position.y = h/2; stem.castShadow = true; g.add(stem);
    if(this.stage>0){
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.08,0.25), new THREE.MeshStandardMaterial({color:0x2ecc71}));
      leaf.position.set(-0.25,h*0.6,0); leaf.rotation.z=0.4; g.add(leaf);
      const leaf2 = leaf.clone(); leaf2.position.set(0.25,h*0.6,0); leaf2.rotation.z=-0.4; g.add(leaf2);
    }
    if(this.stage>=2){
      const size = this.stage>=this.def.stages ? 0.45 : 0.25;
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(size,8,6), new THREE.MeshStandardMaterial({color:this.def.meshColor, flatShading:true}));
      fruit.position.y = h+size*0.5; fruit.castShadow = true; g.add(fruit);
    }
    return g;
  }
  grow(){
    if(this.watered && this.stage < this.def.stages){ this.stage++; this.refreshMesh(); return true; }
    return false;
  }
  refreshMesh(){
    scene.remove(this.mesh);
    this.mesh.traverse(c=>{ if(c.geometry) c.geometry.dispose(); });
    this.mesh = this.buildMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }
  harvest(){
    if(this.stage >= this.def.stages){
      GameState.gold += this.def.sellPrice;
      updateUI();
      log(`Harvested ${this.def.name} for ${this.def.sellPrice}g`);
      this.destroy();
      this.tile.crop = null;
      return true;
    }
    return false;
  }
}
