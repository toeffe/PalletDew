import * as THREE from 'three';
import { scene } from '../engine/renderer.js';

export const decorGroup = new THREE.Group();
scene.add(decorGroup);

function makeInstanced(geo, mat, count){
  const m = new THREE.InstancedMesh(geo, mat, count);
  m.castShadow = true; m.receiveShadow = true;
  m.count = 0;
  decorGroup.add(m);
  return m;
}

const dummy = new THREE.Object3D();
export function pushInstance(mesh, x, y, z, ry, s, color){
  const i = mesh.count;
  if(i >= mesh.instanceMatrix.count) return;
  dummy.position.set(x,y,z); dummy.rotation.set(0, ry, 0); dummy.scale.set(s,s,s);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
  if(color) mesh.setColorAt(i, color);
  mesh.count = i+1;
}

export const decorTreeTrunks = makeInstanced(new THREE.CylinderGeometry(0.35,0.55,3,6), new THREE.MeshStandardMaterial({color:0x7a5230, flatShading:true, roughness:1}), 3000);
export const decorTreeLeaves = makeInstanced(new THREE.DodecahedronGeometry(2), new THREE.MeshStandardMaterial({color:0x2d8a3e, flatShading:true, roughness:0.95}), 3000);
export const decorRocks = makeInstanced(new THREE.DodecahedronGeometry(0.9), new THREE.MeshStandardMaterial({color:0x8a8578, flatShading:true, roughness:1}), 1400);

function makeGrassBladeGeo(){
  const w = 0.14, h = 1.05;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([
    -w, 0, 0.001,  w, 0, 0.001,  0.015, h, 0.001,  -0.015, h, 0.001,
    0.001, 0,-w,  0.001, 0, w,  0.001, h, 0.015,  0.001, h, -0.015
  ]);
  const normals = new Float32Array([
    0,0,1, 0,0,1, 0,0,1, 0,0,1,
    1,0,0, 1,0,0, 1,0,0, 1,0,0
  ]);
  const colors = new Float32Array([
    0.25,0.52,0.18, 0.25,0.52,0.18, 0.48,0.75,0.30, 0.48,0.75,0.30,
    0.22,0.50,0.16, 0.22,0.50,0.16, 0.45,0.72,0.28, 0.45,0.72,0.28
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex([0,1,2, 0,2,3, 4,5,6, 4,6,7]);
  return geo;
}

const grassBladeGeo = makeGrassBladeGeo();
const grassMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
  roughness: 0.9,
  metalness: 0,
  flatShading: false
});
export const decorGrass = makeInstanced(grassBladeGeo, grassMat, 12000);
export const grassMatRef = grassMat;

const leafGeo = new THREE.CircleGeometry(0.28, 5);
export const decorLeaves = makeInstanced(leafGeo, new THREE.MeshStandardMaterial({color:0xd08a2e, flatShading:true, roughness:1, side:THREE.DoubleSide}), 4000);
export const decorPebbles = makeInstanced(new THREE.SphereGeometry(0.3,5,4), new THREE.MeshStandardMaterial({color:0xd8c8a0, roughness:1}), 1200);
