import * as THREE from 'three';
import { TILE, RADIUS, FARM_Y } from '../core/constants.js';
import { scene, camera } from '../engine/renderer.js';
import { terrainHeightWorld } from '../world/terrain.js';
import { getFarmTile, bedGroundY, BED_DIRT_H } from '../world/farm.js';
import { entities } from './WorldEntity.js';
import { PlacedObject } from './PlacedObject.js';
import { keys } from '../engine/keys.js';
import { useEnergy } from '../systems/inventory.js';
import { isMenuOpen } from '../ui/menu.js';

const MOVE = {
  maxSpeed: 7.8,
  accel: 22,
  decel: 26,
  airFriction: 8,
  turnSpeed: 12,
  animBlend: 10,
  camFollow: 5.5,
  camLook: 7,
};

function expDamp(current, target, speed, dt){
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}

function lerpAngle(a, b, t){
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if(d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function buildPlayerMesh(){
  const g = new THREE.Group();
  const mat = (c, rough=0.75) => new THREE.MeshStandardMaterial({ color:c, roughness:rough, flatShading:true });
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 20),
    new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.28, depthWrite:false })
  );
  shadow.rotation.x = -Math.PI/2; shadow.position.y = 0.03; g.add(shadow);

  const legGeo = new THREE.BoxGeometry(0.38, 1.15, 0.38);
  const leftLeg = new THREE.Mesh(legGeo, mat(0x3a5f8a)); leftLeg.position.set(-0.28, 0.58, 0); leftLeg.castShadow = true; g.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, mat(0x3a5f8a)); rightLeg.position.set(0.28, 0.58, 0); rightLeg.castShadow = true; g.add(rightLeg);
  const bootGeo = new THREE.BoxGeometry(0.42, 0.28, 0.5);
  const lb = new THREE.Mesh(bootGeo, mat(0x4a3020)); lb.position.set(-0.28, 0.12, 0.05); g.add(lb);
  const rb = new THREE.Mesh(bootGeo, mat(0x4a3020)); rb.position.set(0.28, 0.12, 0.05); g.add(rb);

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.15, 0.55), mat(0xd64545)); body.position.set(0, 1.7, 0); body.castShadow = true; g.add(body);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.58), mat(0x3a5f8a)); strap.position.set(0, 2.15, 0); g.add(strap);

  const armGeo = new THREE.BoxGeometry(0.32, 1.0, 0.32);
  const leftArm = new THREE.Mesh(armGeo, mat(0xf0c9a0)); leftArm.position.set(-0.72, 1.65, 0); leftArm.castShadow = true; g.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, mat(0xf0c9a0)); rightArm.position.set(0.72, 1.65, 0); rightArm.castShadow = true; g.add(rightArm);
  const handGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  const leftHand = new THREE.Mesh(handGeo, mat(0xe8b890));
  leftHand.position.set(-0.72, 1.05, 0);
  g.add(leftHand);
  const rightHand = new THREE.Mesh(handGeo, mat(0xe8b890));
  rightHand.position.set(0.72, 1.05, 0);
  g.add(rightHand);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), mat(0xf0c9a0)); head.position.set(0, 2.75, 0); head.castShadow = true; g.add(head);
  const eyeMat = mat(0x2a2a2a);
  const eyeGeo = new THREE.BoxGeometry(0.12, 0.14, 0.08);
  const le = new THREE.Mesh(eyeGeo, eyeMat); le.position.set(-0.2, 2.78, 0.42); g.add(le);
  const re = new THREE.Mesh(eyeGeo, eyeMat); re.position.set(0.2, 2.78, 0.42); g.add(re);
  const smile = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.06), mat(0xc07860)); smile.position.set(0, 2.55, 0.42); g.add(smile);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.28, 0.9), mat(0x5c3d1e)); hair.position.set(0, 3.15, -0.05); g.add(hair);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 12), mat(0xe8b84a, 0.85));
  brim.position.set(0, 3.28, 0); g.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.4, 10), mat(0xe8b84a, 0.85));
  crown.position.set(0, 3.5, 0); g.add(crown);

  g.userData = { leftLeg, rightLeg, leftArm, rightArm };
  return g;
}

export const playerGroup = new THREE.Group();
scene.add(playerGroup);

export const playerModel = buildPlayerMesh();
playerModel.scale.setScalar(0.72);
playerGroup.add(playerModel);

export const Player = {
  x: 0, z: 14,
  vx: 0, vz: 0,
  speed: MOVE.maxSpeed,
  dir: new THREE.Vector3(0, 0, 1),
  facing: 0,
  moving: false,
  animWeight: 0,
  walkPhase: 0,
  _smoothY: undefined,
};

playerGroup.position.set(Player.x, FARM_Y, Player.z);

const _moveFwd = new THREE.Vector3();
const _moveRight = new THREE.Vector3();
const _WORLD_UP = new THREE.Vector3(0, 1, 0);
const _wish = new THREE.Vector3();

function isBlocked(nx, nz){
  if(Math.hypot(nx, nz) > (RADIUS - 2) * TILE) return true;
  if(terrainHeightWorld(nx, nz) < -0.8) return true;
  for(const e of entities){
    if(e instanceof PlacedObject && e.def.collision && !e.dead){
      if(Math.abs(nx - e.position.x) < 1.6 && Math.abs(nz - e.position.z) < 1.6) return true;
    }
  }
  return false;
}

function approachVelocity(current, target, rate, dt){
  const diff = target - current;
  const maxDelta = rate * dt;
  if(Math.abs(diff) <= maxDelta) return target;
  return current + Math.sign(diff) * maxDelta;
}

export function updatePlayer(dt){
  const d = playerModel.userData;

  if(isMenuOpen()){
    Player.vx = approachVelocity(Player.vx, 0, MOVE.decel, dt);
    Player.vz = approachVelocity(Player.vz, 0, MOVE.decel, dt);
    Player.moving = false;
    Player.animWeight = expDamp(Player.animWeight, 0, MOVE.animBlend, dt);
    d.leftLeg.rotation.x = expDamp(d.leftLeg.rotation.x, 0, 14, dt);
    d.rightLeg.rotation.x = expDamp(d.rightLeg.rotation.x, 0, 14, dt);
    d.leftArm.rotation.x = expDamp(d.leftArm.rotation.x, 0, 14, dt);
    d.rightArm.rotation.x = expDamp(d.rightArm.rotation.x, 0, 14, dt);
    return;
  }

  _moveFwd.set(Player.x - camera.position.x, 0, Player.z - camera.position.z);
  if(_moveFwd.lengthSq() < 1e-6) _moveFwd.set(-1, 0, -1);
  _moveFwd.normalize();
  _moveRight.crossVectors(_moveFwd, _WORLD_UP).normalize();

  let ix = 0, iz = 0;
  if(keys['w']||keys['arrowup']){ ix += _moveFwd.x; iz += _moveFwd.z; }
  if(keys['s']||keys['arrowdown']){ ix -= _moveFwd.x; iz -= _moveFwd.z; }
  if(keys['d']||keys['arrowright']){ ix += _moveRight.x; iz += _moveRight.z; }
  if(keys['a']||keys['arrowleft']){ ix -= _moveRight.x; iz -= _moveRight.z; }

  const hasInput = ix !== 0 || iz !== 0;
  if(hasInput){
    const len = Math.hypot(ix, iz);
    ix /= len; iz /= len;
    _wish.set(ix * MOVE.maxSpeed, 0, iz * MOVE.maxSpeed);
    Player.vx = approachVelocity(Player.vx, _wish.x, MOVE.accel, dt);
    Player.vz = approachVelocity(Player.vz, _wish.z, MOVE.accel, dt);
    Player.dir.set(ix, 0, iz);
  } else {
    Player.vx = approachVelocity(Player.vx, 0, MOVE.decel, dt);
    Player.vz = approachVelocity(Player.vz, 0, MOVE.decel, dt);
  }

  const speed = Math.hypot(Player.vx, Player.vz);
  if(speed < 0.02){
    Player.vx = 0;
    Player.vz = 0;
  }

  // Axis-separated move so you slide along walls instead of hard-stopping
  if(Player.vx !== 0){
    const nx = Player.x + Player.vx * dt;
    if(!isBlocked(nx, Player.z)) Player.x = nx;
    else Player.vx *= 0.15;
  }
  if(Player.vz !== 0){
    const nz = Player.z + Player.vz * dt;
    if(!isBlocked(Player.x, nz)) Player.z = nz;
    else Player.vz *= 0.15;
  }

  const moveSpeed = Math.hypot(Player.vx, Player.vz);
  Player.moving = moveSpeed > 0.15;
  if(Player.moving && Math.random() < 0.012) useEnergy(0.12);

  // Smooth facing toward velocity (or wish dir while accelerating)
  if(moveSpeed > 0.35 || hasInput){
    const fx = hasInput && moveSpeed < 1.2 ? ix : Player.vx;
    const fz = hasInput && moveSpeed < 1.2 ? iz : Player.vz;
    if(Math.hypot(fx, fz) > 1e-4){
      const targetYaw = Math.atan2(fx, fz);
      const turnT = 1 - Math.exp(-MOVE.turnSpeed * dt);
      Player.facing = lerpAngle(Player.facing, targetYaw, turnT);
      playerGroup.rotation.y = Player.facing;
      Player.dir.set(Math.sin(Player.facing), 0, Math.cos(Player.facing));
    }
  }

  let targetY = terrainHeightWorld(Player.x, Player.z);
  const standTile = getFarmTile(Math.floor(Player.x / TILE), Math.floor(Player.z / TILE));
  if(standTile && standTile.tilled) targetY = bedGroundY(standTile) + BED_DIRT_H;
  targetY = Math.max(targetY, 0);
  if(Player._smoothY === undefined) Player._smoothY = targetY;
  Player._smoothY = expDamp(Player._smoothY, targetY, 12, dt);
  playerGroup.position.set(Player.x, Player._smoothY, Player.z);

  // Blended walk cycle driven by speed
  const targetAnim = Math.min(1, moveSpeed / MOVE.maxSpeed);
  Player.animWeight = expDamp(Player.animWeight, targetAnim, MOVE.animBlend, dt);
  const stride = 9.5 * (0.55 + 0.45 * Player.animWeight);
  Player.walkPhase += dt * stride * Math.max(Player.animWeight, 0.05);
  const swing = Math.sin(Player.walkPhase) * 0.58 * Player.animWeight;
  const armSwing = Math.sin(Player.walkPhase + Math.PI) * 0.38 * Player.animWeight;
  d.leftLeg.rotation.x = swing;
  d.rightLeg.rotation.x = -swing;
  d.leftArm.rotation.x = armSwing;
  d.rightArm.rotation.x = -armSwing;
}

export function updateCamera(dt){
  const t = Math.min(0.05, dt || 1/60);
  const py = playerGroup.position.y;
  const tx = Player.x + 9, ty = py + 12, tz = Player.z + 9;
  camera.position.x = expDamp(camera.position.x, tx, MOVE.camFollow, t);
  camera.position.y = expDamp(camera.position.y, ty, MOVE.camFollow * 0.85, t);
  camera.position.z = expDamp(camera.position.z, tz, MOVE.camFollow, t);
  if(camera._lookY === undefined) camera._lookY = py + 0.9;
  camera._lookY = expDamp(camera._lookY, py + 0.9, MOVE.camLook, t);
  camera.lookAt(Player.x, camera._lookY, Player.z);
}
