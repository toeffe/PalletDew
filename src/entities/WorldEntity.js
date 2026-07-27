import * as THREE from 'three';
import { scene } from '../engine/renderer.js';

export class WorldEntity {
  constructor(x, y, z){
    this.position = new THREE.Vector3(x,y,z);
    this.mesh = null;
    this.dead = false;
  }
  update(_dt){}
  destroy(){
    this.dead = true;
    if(this.mesh){
      if(this.mesh.parent) this.mesh.parent.remove(this.mesh);
      else scene.remove(this.mesh);
      this.mesh.traverse(c=>{ if(c.geometry) c.geometry.dispose(); if(c.material) c.material.dispose(); });
    }
  }
}

export const entities = [];
export function spawnEntity(e){ entities.push(e); return e; }

export function updateEntities(dt){
  for(let i=entities.length-1;i>=0;i--){
    entities[i].update(dt);
    if(entities[i].dead) entities.splice(i,1);
  }
}
