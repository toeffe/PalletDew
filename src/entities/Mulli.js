import * as THREE from 'three';
import {
  MULLI_MAX_CHARGE, MULLI_DRAIN_PER_SEC, MULLI_TRICKLE_PER_SEC,
  PALLET_HITCH_RADIUS, TILE,
} from '../core/constants.js';
import { GameState, log } from '../core/state.js';
import { keys } from '../engine/keys.js';
import { camera } from '../engine/renderer.js';
import { resourceGroup } from '../world/resources.js';
import { terrainHeightWorld } from '../world/terrain.js';
import { dayFactorAt } from '../engine/weather.js';
import { Player, playerGroup } from './player.js';
import { isBlocked } from './collision.js';
import { WorldEntity, spawnEntity } from './WorldEntity.js';
import { findNearestPallet, pallets } from './Pallet.js';
import { VehicleControl } from '../systems/vehicleControl.js';
import { updateUI } from '../ui/hud.js';



const MOVE = {
  maxSpeed: 7.5,
  accel: 18,
  decel: 22,
  turnSpeed: 2.0,        // turning while moving
  turnSpeedStopped: 2.8, // pivot in place
  camFollow: 5.5,
};

// Distance from mesh center to front axle (load wheels)
const FRONT_AXLE_OFFSET = 1.65;

function approachVelocity(current, target, rate, dt){
  const diff = target - current;
  const maxDelta = rate * dt;
  if(Math.abs(diff) <= maxDelta) return target;
  return current + Math.sign(diff) * maxDelta;
}

function lerpAngle(a, b, t){
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if(d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export let Mulli = null;

export class MulliEntity extends WorldEntity {
  constructor(wx, wz, opts={}){
    const wy = terrainHeightWorld(wx, wz);
    super(wx, wy, wz);
    this.x = wx;
    this.z = wz;
    this.rotY = opts.rotY ?? 0;
    this.charge = opts.charge ?? MULLI_MAX_CHARGE;
    this.maxCharge = MULLI_MAX_CHARGE;
    this.vx = 0;
    this.vz = 0;
    this.mounted = false;
    this.attachedPallet = null;
    this.mesh = buildMulliMesh();
    this.mesh.position.set(wx, wy, wz);
    this.mesh.rotation.y = this.rotY;
    this.mesh.traverse(c => { c.userData.entityRef = this; if(c.isMesh){ c.castShadow=true; c.receiveShadow=true; } });
    resourceGroup.add(this.mesh);
  }

  interact(){
    if(this.mounted){
      if(Math.hypot(this.vx, this.vz) < 0.2) this.dismount();
      else log('Stop before dismounting.');
      return;
    }
    if(GameState.carried){
      log('Hands must be empty to mount.');
      return;
    }
    this.mount();
  }

  tryTogglePallet(){
    if(!this.mounted) return;

    // If towing, drop it
    if(this.attachedPallet){
      this.unhitch();
      return;
    }

    const fwdX = Math.sin(this.rotY);
    const fwdZ = Math.cos(this.rotY);

    // Fork tip positions in world space
    const tipLX = this.x + fwdX * 1.65 - fwdZ * 0.28;
    const tipLZ = this.z + fwdZ * 1.65 + fwdX * 0.28;
    const tipRX = this.x + fwdX * 1.65 + fwdZ * 0.28;
    const tipRZ = this.z + fwdZ * 1.65 - fwdX * 0.28;

    let best = null;
    let bestScore = Infinity;

    for(const p of pallets){
      if(p.dead || p.attachedToMulli) continue;

      const dx = p.position.x - this.x;
      const dz = p.position.z - this.z;
      const dist = Math.hypot(dx, dz);
      if(dist > 5.0) continue;

      // Must be in front of Mulli (forks reach forward)
      const ahead = dx * fwdX + dz * fwdZ;
      if(ahead < -0.5 || ahead > 3.5) continue;

      // Sideways tolerance — forks are 0.56 apart, stringers at ±0.7
      const lateral = Math.abs(-dx * fwdZ + dz * fwdX);
      if(lateral > 1.2) continue;

      // Angle tolerance — very forgiving
      let angleDiff = this.rotY - p.mesh.rotation.y;
      angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
      const aligned = Math.abs(angleDiff) < 1.2 || Math.abs(Math.abs(angleDiff) - Math.PI) < 1.2;
      if(!aligned) continue;

      // Fork tips must be close to the pallet center area
      const dTipL = Math.hypot(p.position.x - tipLX, p.position.z - tipLZ);
      const dTipR = Math.hypot(p.position.x - tipRX, p.position.z - tipRZ);
      const dTip = Math.min(dTipL, dTipR);
      if(dTip > 2.2) continue;

      // Score: prefer pallets closest to fork tips
      const score = dTip + lateral * 0.5;
      if(score < bestScore){
        best = p;
        bestScore = score;
      
  

    if(best){
      this.hitch(best);
    } else {
      log('Drive the forks under the pallet to pick it up.');
    }
  }
    }

    if(best){
      this.hitch(best);
    } else {
      log('Drive the forks under the pallet to pick it up.');
    }
  }

  hitch(pallet){
    if(GameState.carried){ log('Hands must be empty.'); return; }
    if(this.attachedPallet){ log('Already towing a pallet.'); return; }
    this.attachedPallet = pallet;
    pallet.attachedToMulli = true;
    VehicleControl.unhitchPallet = () => this.unhitch();
    log('Pallet picked up. Press E to drop.');
    this.syncPallet();
  }

  unhitch(){
    if(!this.attachedPallet) return;
    const p = this.attachedPallet;
    p.attachedToMulli = false;
    const dropDist = 1.8;
    const px = this.x + Math.sin(this.rotY) * dropDist;
    const pz = this.z + Math.cos(this.rotY) * dropDist;
    p.setWorldPos(px, pz);
    this.attachedPallet = null;
    VehicleControl.unhitchPallet = null;
    log('Pallet dropped.');
  }

  mount(){
    this.mounted = true;
    VehicleControl.suppressPlayerMove = true;
    log('Mounted Mulli. WASD to drive · E to pick up / drop pallet · click Mulli to dismount.');
    updateUI();
  }

  dismount(){
    if(!this.mounted) return;
    this.mounted = false;
    VehicleControl.suppressPlayerMove = false;
    Player.x = this.x + Math.sin(this.rotY + Math.PI/2) * 2.0;
    Player.z = this.z + Math.cos(this.rotY + Math.PI/2) * 2.0;
    Player.facing = this.rotY;
    const py = terrainHeightWorld(Player.x, Player.z);
    playerGroup.position.set(Player.x, py, Player.z);
    playerGroup.rotation.y = this.rotY;
    log('Dismounted Mulli.');
    updateUI();
  }

  syncPallet(){
    if(!this.attachedPallet) return;
    const p = this.attachedPallet;
    const ahead = 1.3;
    const px = this.x + Math.sin(this.rotY) * ahead;
    const pz = this.z + Math.cos(this.rotY) * ahead;
    const py = terrainHeightWorld(px, pz);
    p.position.set(px, py, pz);
    p.mesh.position.set(px, py, pz);
    p.mesh.rotation.y = this.rotY;
  }

  update(dt){
    // Trickle roof charge
    const trickle = MULLI_TRICKLE_PER_SEC * dayFactorAt(GameState.hour, GameState.minute) * dt;
    if(trickle > 0) this.charge = Math.min(this.maxCharge, this.charge + trickle);

    // Update world-space charge bar
    if(this._chargeBar && this._chargeBarBg){
      const ratio = this.charge / this.maxCharge;
      this._chargeBar.scale.x = Math.max(0.02, ratio);
      this._chargeBar.position.x = (ratio - 1) * 0.6;
      const col = ratio > 0.3 ? 0x00ff44 : (ratio > 0.1 ? 0xffcc00 : 0xff2222);
      this._chargeBar.material.color.setHex(col);
      this._chargeBar.material.emissive.setHex(col);
      this._chargeBar.material.emissiveIntensity = 0.8 + ratio * 0.5;
    }

    if(!this.mounted){
      this.vx = approachVelocity(this.vx, 0, MOVE.decel, dt);
      this.vz = approachVelocity(this.vz, 0, MOVE.decel, dt);
      this.syncPallet();
      return;
    }

    // === INPUT ===
    let throttle = 0;
    if(keys['w'] || keys['arrowup']) throttle += 1;
    if(keys['s'] || keys['arrowdown']) throttle -= 1;

    let turn = 0;
    if(keys['a'] || keys['arrowleft']) turn += 1;
    if(keys['d'] || keys['arrowright']) turn -= 1;

    const speed = Math.hypot(this.vx, this.vz);
    const chargeRatio = this.charge / this.maxCharge;
    const speedMul = this.charge <= 0 ? 0.08 : (chargeRatio < 0.08 ? 0.25 : 1);

    // Acceleration along facing
    if(throttle !== 0 && speedMul > 0){
      const maxSpd = MOVE.maxSpeed * speedMul;
      const targetVx = Math.sin(this.rotY) * throttle * maxSpd;
      const targetVz = Math.cos(this.rotY) * throttle * maxSpd;
      this.vx = approachVelocity(this.vx, targetVx, MOVE.accel, dt);
      this.vz = approachVelocity(this.vz, targetVz, MOVE.accel, dt);
    } else {
      this.vx = approachVelocity(this.vx, 0, MOVE.decel, dt);
      this.vz = approachVelocity(this.vz, 0, MOVE.decel, dt);
    }

    // === FRONT-AXLE STEERING ===
    // The load wheels at the fork tips are the pivot point.
    // When turning, the rear (body + player) swings around the front.
    let dRot = 0;
    if(turn !== 0){
      const isMoving = speed > 0.3;
      const turnRate = isMoving ? MOVE.turnSpeed : MOVE.turnSpeedStopped;
      const speedFactor = isMoving ? Math.min(speed / (MOVE.maxSpeed * 0.5), 0.8) : 0.7;
      dRot = turn * turnRate * dt * speedFactor;
    }

    const oldFx = Math.sin(this.rotY);
    const oldFz = Math.cos(this.rotY);
    this.rotY += dRot;
    const newFx = Math.sin(this.rotY);
    const newFz = Math.cos(this.rotY);

    // Keep front axle fixed in world space; swing rear around it
    const dx = this.vx * dt + (oldFx - newFx) * FRONT_AXLE_OFFSET;
    const dz = this.vz * dt + (oldFz - newFz) * FRONT_AXLE_OFFSET;

    const nx = this.x + dx;
    const nz = this.z + dz;
    if(!isBlocked(nx, nz)){
      this.x = nx;
      this.z = nz;
    } else {
      this.vx *= 0.1;
      this.vz *= 0.1;
    }

    // Re-align velocity to new facing so we never slide sideways
    if(dRot !== 0 && speed > 0.1){
      const newSpeed = Math.hypot(this.vx, this.vz);
      this.vx = newFx * newSpeed;
      this.vz = newFz * newSpeed;
    }

    // Battery drain
    if(speed > 0.2){
      this.charge = Math.max(0, this.charge - MULLI_DRAIN_PER_SEC * dt);
    }

    // Update mesh
    const wy = Math.max(terrainHeightWorld(this.x, this.z), 0);
    this.position.set(this.x, wy, this.z);
    this.mesh.position.set(this.x, wy, this.z);
    this.mesh.rotation.y = this.rotY;
    this.syncPallet();

    // === PLAYER: walks behind, holding the tiller ===
    const behind = 1.15;
    Player.x = this.x - Math.sin(this.rotY) * behind;
    Player.z = this.z - Math.cos(this.rotY) * behind;
    Player.facing = this.rotY;
    const py = terrainHeightWorld(Player.x, Player.z);
    playerGroup.position.set(Player.x, py, Player.z);
    playerGroup.rotation.y = this.rotY;
  }
}

function buildMulliMesh(){
  const g = new THREE.Group();
  const orange = new THREE.MeshStandardMaterial({ color: 0xe67e22, flatShading: true, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, flatShading: true, roughness: 0.8 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x95a5a6, flatShading: true, metalness: 0.4, roughness: 0.5 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111, flatShading: true, roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.9), orange);
  body.position.set(0, 0.55, -0.3);
  g.add(body);

  const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.08), orange);
  backrest.position.set(0, 0.65, 0.2);
  g.add(backrest);

  const forkGeo = new THREE.BoxGeometry(0.14, 0.08, 1.6);
  const forkL = new THREE.Mesh(forkGeo, steel);
  forkL.position.set(-0.28, 0.24, 0.95);
  g.add(forkL);
  const forkR = new THREE.Mesh(forkGeo, steel);
  forkR.position.set(0.28, 0.24, 0.95);
  g.add(forkR);

  const loadWheelGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.06, 8);
  for(const fx of [-0.28, 0.28]){
    const w = new THREE.Mesh(loadWheelGeo, black);
    w.rotation.z = Math.PI / 2;
    w.position.set(fx, 0.1, 1.65);
    g.add(w);
  }

  const tillerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1), dark);
  tillerPole.position.set(0, 1.15, -0.55);
  tillerPole.rotation.x = 0.35;
  g.add(tillerPole);

  const handleBar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.08), dark);
  handleBar.position.set(0, 1.55, -0.72);
  g.add(handleBar);

  for(const hx of [-0.45, 0.45]){
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18), black);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(hx, 1.55, -0.72);
    g.add(grip);
  }

  const steerWheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.14, 10),
    black
  );
  steerWheel.rotation.z = Math.PI / 2;
  steerWheel.position.set(0, 0.22, -0.85);
  g.add(steerWheel);

  const solar = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.04, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x1a3a8a, emissive: 0x0a2040, emissiveIntensity: 0.4, flatShading: true })
  );
  solar.position.set(0, 0.92, -0.3);
  g.add(solar);

  const barGroup = new THREE.Group();
  barGroup.position.set(0, 2.0, 0);

  const bgGeo = new THREE.BoxGeometry(1.4, 0.22, 0.15);
  const bgMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, flatShading: true });
  const bg = new THREE.Mesh(bgGeo, bgMat);
  barGroup.add(bg);

  const fillGeo = new THREE.BoxGeometry(1.3, 0.14, 0.1);
  const fillMat = new THREE.MeshStandardMaterial({
    color: 0x00ff44,
    emissive: 0x00ff44,
    emissiveIntensity: 1.2,
    flatShading: true
  });
  const fill = new THREE.Mesh(fillGeo, fillMat);
  fill.position.set(0, 0, 0.03);
  fill.userData.isChargeBar = true;
  barGroup.add(fill);

  g.add(barGroup);
  g.userData.chargeBar = fill;
  g.userData.chargeBarBg = bg;

  return g;
}

export function spawnMulli(wx, wz, opts={}){
  if(Mulli && !Mulli.dead) Mulli.destroy();
  Mulli = new MulliEntity(wx, wz, opts);
  Mulli._chargeBar = Mulli.mesh.userData.chargeBar;
  Mulli._chargeBarBg = Mulli.mesh.userData.chargeBarBg;
  spawnEntity(Mulli);
  return Mulli;
}

export function clearMulli(){
  if(Mulli){
    if(Mulli.mounted){
      Mulli.mounted = false;
      VehicleControl.suppressPlayerMove = false;
      playerGroup.visible = true;
    }
    Mulli.destroy();
    Mulli = null;
  }
  VehicleControl.unhitchPallet = null;
}