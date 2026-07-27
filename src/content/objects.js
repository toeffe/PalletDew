import * as THREE from 'three';
import { defineObject } from '../core/registry.js';
import { log } from '../core/state.js';
import { addItem } from '../systems/inventory.js';

function buildTreeMesh(){
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.6,3,6), new THREE.MeshStandardMaterial({color:0x8b5a2b, flatShading:true, roughness:1}));
  trunk.position.y=1.5; g.add(trunk);
  const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2), new THREE.MeshStandardMaterial({color:0x2d8a3e, flatShading:true, roughness:0.95}));
  leaves.position.y=4; g.add(leaves);
  return g;
}

export function registerObjects(){
  defineObject({
    id:'tree', name:'Oak Tree', category:'resource', buildMesh: buildTreeMesh, collision:true,
    onInteract: (self, tool) => {
      if(tool && tool.id==='axe'){
        addItem('wood', 3 + Math.floor(Math.random()*3));
        log('Chopped a tree! +Wood');
        self.destroy();
      }
    }
  });
  defineObject({
    id:'rock', name:'Boulder', category:'resource', collision:true,
    buildMesh: () => {
      const g = new THREE.Group();
      const r1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2), new THREE.MeshStandardMaterial({color:0x7f8c8d, flatShading:true, roughness:1}));
      r1.position.y=0.8; r1.scale.set(1,0.8,1); g.add(r1);
      const r2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7), new THREE.MeshStandardMaterial({color:0x616a6b, flatShading:true, roughness:1}));
      r2.position.set(0.8,0.5,0.4); g.add(r2);
      return g;
    },
    onInteract: (self, tool) => {
      if(tool && tool.id==='pickaxe'){
        addItem('stone', 2 + Math.floor(Math.random()*3));
        log('Mined a rock! +Stone');
        self.destroy();
      }
    }
  });
  defineObject({
    id:'fiber_patch', name:'Wild Grass', category:'resource', collision:false,
    buildMesh: () => {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color:0x5a9c3f, side:THREE.DoubleSide, roughness:0.95 });
      for(let i=0;i<7;i++){
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.lineTo(0.08, 0); shape.lineTo(0.02, 1.1); shape.lineTo(-0.02, 1.1); shape.lineTo(-0.08, 0);
        const geo = new THREE.ShapeGeometry(shape);
        const blade = new THREE.Mesh(geo, mat);
        blade.position.set((Math.random()-0.5)*0.9, 0, (Math.random()-0.5)*0.9);
        blade.rotation.y = Math.random()*Math.PI;
        blade.rotation.z = (Math.random()-0.5)*0.25;
        blade.scale.y = 0.7 + Math.random()*0.5;
        g.add(blade);
        const blade2 = blade.clone();
        blade2.rotation.y += Math.PI/2;
        g.add(blade2);
      }
      return g;
    },
    onInteract: (self, tool) => {
      if(tool && (tool.id==='hand' || !tool.useAction)){
        addItem('fiber', 1 + Math.floor(Math.random()*2));
        log('Gathered fiber.');
        self.destroy();
      }
    }
  });
  defineObject({
    id:'chest', name:'Chest', category:'storage', collision:true,
    buildMesh: () => {
      const g = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(2,1.5,1.5), new THREE.MeshStandardMaterial({color:0x8b5a2b}));
      box.position.y=0.75; g.add(box);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(2,0.3,1.5), new THREE.MeshStandardMaterial({color:0xa06b3a}));
      lid.position.y=1.6; g.add(lid);
      return g;
    },
    onInteract: () => log('Opened chest (storage UI not implemented yet).')
  });
  defineObject({
    id:'scarecrow', name:'Scarecrow', category:'decor', collision:false,
    buildMesh: () => {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,4), new THREE.MeshStandardMaterial({color:0x5d4037}));
      pole.position.y=2; g.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshStandardMaterial({color:0xf5cba7}));
      head.position.y=4; g.add(head);
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.7,0.5,8), new THREE.MeshStandardMaterial({color:0x2c3e50}));
      hat.position.y=4.5; g.add(hat);
      return g;
    }
  });
  defineObject({
    id:'lamp_post', name:'Lamp Post', category:'lighting', collision:false,
    buildMesh: () => {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,5), new THREE.MeshStandardMaterial({color:0x2c3e50}));
      pole.position.y=2.5; g.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.6), new THREE.MeshStandardMaterial({color:0xffeb3b, emissive:0xffeb3b, emissiveIntensity:0.6}));
      lamp.position.y=5; g.add(lamp);
      const light = new THREE.PointLight(0xffcf6b, 3, 18);
      light.position.y=5; g.add(light);
      return g;
    }
  });
}
