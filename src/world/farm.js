import * as THREE from 'three';
import { TILE, RADIUS, WATER_H } from '../core/constants.js';
import { scene } from '../engine/renderer.js';
import {
  heightAtTile, moistureAtTile, classifyBiome, terrainHeightWorld
} from './terrain.js';
import { decorGrass, decorPebbles, decorLeaves } from './decor.js';
import { entities } from '../entities/WorldEntity.js';
import { PlacedObject } from '../entities/PlacedObject.js';
import { resourceObjects } from './resources.js';

export const farmGroup = new THREE.Group();
scene.add(farmGroup);

/** @type {Map<string, object>} */
export const farmTiles = new Map();

export const BED_SIZE = TILE * 0.88;
export const BED_HEIGHT = 0.42;
export const BED_DIRT_H = 0.32;

const wallMat = new THREE.MeshStandardMaterial({ color: 0x7a6a55, roughness: 0.95, flatShading: true });
const wallMatDark = new THREE.MeshStandardMaterial({ color: 0x5c4e3c, roughness: 0.95, flatShading: true });
const dirtMatDry = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.95, flatShading: true });
const dirtMatWet = new THREE.MeshStandardMaterial({ color: 0x3d2410, roughness: 0.9, flatShading: true });
const soilGrainMat = new THREE.MeshStandardMaterial({ color: 0x5a3d22, roughness: 1, flatShading: true });

function buildFlowerBed(wet){
  const g = new THREE.Group();
  const wallT = 0.16;
  const wallH = BED_HEIGHT;
  const inner = BED_SIZE - wallT * 2;
  const long = BED_SIZE;

  const wallNS = new THREE.BoxGeometry(long, wallH, wallT);
  const n = new THREE.Mesh(wallNS, wallMat); n.position.set(0, wallH/2,  BED_SIZE/2 - wallT/2); n.castShadow = true; n.receiveShadow = true; g.add(n);
  const s = new THREE.Mesh(wallNS, wallMatDark); s.position.set(0, wallH/2, -BED_SIZE/2 + wallT/2); s.castShadow = true; s.receiveShadow = true; g.add(s);
  const wallEW = new THREE.BoxGeometry(wallT, wallH, inner);
  const e = new THREE.Mesh(wallEW, wallMatDark); e.position.set( BED_SIZE/2 - wallT/2, wallH/2, 0); e.castShadow = true; e.receiveShadow = true; g.add(e);
  const w = new THREE.Mesh(wallEW, wallMat); w.position.set(-BED_SIZE/2 + wallT/2, wallH/2, 0); w.castShadow = true; w.receiveShadow = true; g.add(w);
  const capNS = new THREE.BoxGeometry(long + 0.04, 0.07, wallT + 0.06);
  const cn = new THREE.Mesh(capNS, wallMatDark); cn.position.set(0, wallH + 0.02,  BED_SIZE/2 - wallT/2); g.add(cn);
  const cs = new THREE.Mesh(capNS, wallMat); cs.position.set(0, wallH + 0.02, -BED_SIZE/2 + wallT/2); g.add(cs);
  const capEW = new THREE.BoxGeometry(wallT + 0.06, 0.07, inner + 0.04);
  const ce = new THREE.Mesh(capEW, wallMat); ce.position.set( BED_SIZE/2 - wallT/2, wallH + 0.02, 0); g.add(ce);
  const cw = new THREE.Mesh(capEW, wallMatDark); cw.position.set(-BED_SIZE/2 + wallT/2, wallH + 0.02, 0); g.add(cw);

  const dirt = new THREE.Mesh(
    new THREE.BoxGeometry(inner - 0.06, BED_DIRT_H, inner - 0.06),
    (wet ? dirtMatWet : dirtMatDry).clone()
  );
  dirt.position.y = BED_DIRT_H / 2 + 0.04;
  dirt.receiveShadow = true;
  dirt.name = 'dirt';
  g.add(dirt);

  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(BED_SIZE + 0.55, 0.06, BED_SIZE + 0.55),
    soilGrainMat
  );
  skirt.position.y = 0.02;
  skirt.receiveShadow = true;
  g.add(skirt);
  for(let i = 0; i < 10; i++){
    const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
    const rad = BED_SIZE * 0.52 + Math.random() * 0.35;
    const crumb = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.1, 0),
      soilGrainMat
    );
    crumb.position.set(Math.cos(ang) * rad, 0.05 + Math.random() * 0.04, Math.sin(ang) * rad);
    crumb.rotation.set(Math.random(), Math.random(), Math.random());
    crumb.scale.setScalar(0.6 + Math.random() * 0.8);
    g.add(crumb);
  }
  return g;
}

function tileKey(tx, tz){ return tx + ',' + tz; }

export function getOrCreateFarmTile(tx, tz){
  const key = tileKey(tx, tz);
  if(farmTiles.has(key)) return farmTiles.get(key);
  const h = heightAtTile(tx + 0.5, tz + 0.5);
  if(h < WATER_H + 0.02) return null;
  if(Math.hypot(tx + 0.5, tz + 0.5) > RADIUS - 1.5) return null;
  const biome = classifyBiome(h, moistureAtTile(tx + 0.5, tz + 0.5));
  if(biome === 'deepwater' || biome === 'snowrock') return null;
  const type = (biome === 'sand') ? 'sand' : 'grass';
  const wx = (tx + 0.5) * TILE;
  const wz = (tz + 0.5) * TILE;
  const tile = {
    x: tx, y: tz, wx, wz, type,
    tilled: false, watered: false, flatY: 0,
    mesh: null, object: null, crop: null
  };
  farmTiles.set(key, tile);
  return tile;
}

export function getFarmTile(tx, tz){
  return farmTiles.get(tileKey(tx, tz)) || null;
}

export function bedGroundY(tile){
  return terrainHeightWorld(tile.wx, tile.wz);
}

export function canPlaceBed(tile){
  if(!tile || tile.tilled || tile.object) return false;
  if(tile.type !== 'grass' && tile.type !== 'sand') return false;
  for(let dx = -1; dx <= 1; dx++){
    for(let dz = -1; dz <= 1; dz++){
      const sx = tile.x + 0.5 + dx;
      const sz = tile.y + 0.5 + dz;
      const h = heightAtTile(sx, sz);
      if(h < WATER_H + 0.05) return false;
      const bio = classifyBiome(h, moistureAtTile(sx, sz));
      if(bio === 'deepwater') return false;
      if(bio === 'sand' && h < WATER_H + 0.08) return false;
    }
  }
  const objs = resourceObjects || [];
  for(const e of objs){
    if(!e || e.dead) continue;
    if(Math.hypot(e.position.x - tile.wx, e.position.z - tile.wz) < TILE * 0.9) return false;
  }
  for(const e of entities){
    if(!(e instanceof PlacedObject) || e.dead) continue;
    if(Math.hypot(e.position.x - tile.wx, e.position.z - tile.wz) < TILE * 0.9) return false;
  }
  return true;
}

export function clearDecorNear(wx, wz, radius){
  const meshes = [decorGrass, decorPebbles, decorLeaves];
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  for(const mesh of meshes){
    if(!mesh || !mesh.count) continue;
    let changed = false;
    for(let i = 0; i < mesh.count; i++){
      mesh.getMatrixAt(i, m);
      m.decompose(p, q, s);
      if(s.x === 0) continue;
      if(Math.hypot(p.x - wx, p.z - wz) < radius){
        s.set(0, 0, 0);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
        changed = true;
      }
    }
    if(changed) mesh.instanceMatrix.needsUpdate = true;
  }
}

export function ensureDirtMesh(tile){
  tile.flatY = bedGroundY(tile) + BED_DIRT_H;
  if(tile.mesh){
    tile.mesh.position.set(tile.wx, bedGroundY(tile), tile.wz);
    setTileDirtLook(tile);
    return;
  }
  const bed = buildFlowerBed(tile.watered);
  bed.position.set(tile.wx, bedGroundY(tile), tile.wz);
  bed.userData.farmTile = tile;
  farmGroup.add(bed);
  tile.mesh = bed;
  clearDecorNear(tile.wx, tile.wz, TILE * 0.75);
}

export function removeDirtMesh(tile){
  if(!tile.mesh) return;
  farmGroup.remove(tile.mesh);
  tile.mesh.traverse(c => {
    if(c.geometry) c.geometry.dispose();
  });
  tile.mesh = null;
}

export function setTileDirtLook(tile){
  if(!tile.mesh) return;
  tile.flatY = bedGroundY(tile) + BED_DIRT_H;
  tile.mesh.position.set(tile.wx, bedGroundY(tile), tile.wz);
  const dirt = tile.mesh.getObjectByName('dirt');
  if(dirt) dirt.material.color.setHex(tile.watered ? 0x3d2410 : 0x6b4423);
}
