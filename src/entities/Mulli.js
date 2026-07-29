import * as THREE from 'three';
import {
  MULLI_MAX_CHARGE, MULLI_DRAIN_PER_SEC, MULLI_TRICKLE_PER_SEC,
  PALLET_HITCH_RADIUS, TILE, RADIUS,
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
import { findNearestPallet } from './Pallet.js';
import { VehicleControl } from '../systems/vehicleControl.js';
import { updateUI } from '../ui/hud.js';

const MOVE = {
  maxSpeed: 9.5,
  accel: 14,
  decel: 18,
  turnSpeed: 8,
  camFollow: 5.5,
};

function expDamp(current, target, speed, dt){
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}

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

    // Prefer hitch when a free pallet is nearby and nothing attached
    if(!this.attachedPallet){
      const near = findNearestPallet(this.x, this.z, PALLET_HITCH_RADIUS);
      if(near){
        this.hitch(near);
        return;
      }
    }

    this.mount();
  }

  hitch(pallet){
    if(GameState.carried){ log('Hands must be empty to hitch.'); return; }
    if(this.attachedPallet){ log('Already towing a pallet.'); return; }
    this.attachedPallet = pallet;
    pallet.attachedToMulli = true;
    VehicleControl.unhitchPallet = () => this.unhitch();
    log('Pallet hitched to Mulli.');
    this.syncPallet();
  }

  unhitch(){
    if(!this.attachedPallet) return;
    const p = this.attachedPallet;
    p.attachedToMulli = false;
    p.setWorldPos(p.position.x, p.position.z);
    this.attachedPallet = null;
    VehicleControl.unhitchPallet = null;
    log('Pallet unhitched.');
  }

  mount(){
    this.mounted = true;
    VehicleControl.suppressPlayerMove = true;
    playerGroup.visible = false;
    log('Mounted Mulli. WASD to drive · click Mulli again when stopped to dismount.');
    updateUI();
  }

  dismount(){
    if(!this.mounted) return;
    this.mounted = false;
    VehicleControl.suppressPlayerMove = false;
    playerGroup.visible = true;
    Player.x = this.x + Math.sin(this.rotY + Math.PI/2) * 2.2;
    Player.z = this.z + Math.cos(this.rotY + Math.PI/2) * 2.2;
    playerGroup.position.set(Player.x, terrainHeightWorld(Player.x, Player.z), Player.z);
    log('Dismounted Mulli.');
    updateUI();
  }

  syncPallet(){
    if(!this.attachedPallet) return;
    const p = this.attachedPallet;
    const behind = 2.8;
    const px = this.x - Math.sin(this.rotY) * behind;
    const pz = this.z - Math.cos(this.rotY) * behind;
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
    if(this._chargeBar){
      const ratio = this.charge / this.maxCharge;
      this._chargeBar.scale.x = Math.max(0.02, ratio);
      this._chargeBar.position.x = -0.5 + ratio * 0.5;
      this._chargeBar.material.color.setHex(ratio > 0.3 ? 0x2ecc71 : (ratio > 0.1 ? 0xf1c40f : 0xe74c3c));
    }

    if(!this.mounted){
      this.vx = approachVelocity(this.vx, 0, MOVE.decel, dt);
      this.vz = approachVelocity(this.vz, 0, MOVE.decel, dt);
      this.syncPallet();
      return;
    }

    // Dismount click handled in input; here drive
    const _fwd = new THREE.Vector3(Math.sin(this.rotY), 0, Math.cos(this.rotY));
    const _right = new THREE.Vector3(_fwd.z, 0, -_fwd.x);

    let ix = 0, iz = 0;
    if(keys['w']||keys['arrowup']){ ix += _fwd.x; iz += _fwd.z; }
    if(keys['s']||keys['arrowdown']){ ix -= _fwd.x; iz -= _fwd.z; }
    if(keys['d']||keys['arrowright']){ ix += _right.x; iz += _right.z; }
    if(keys['a']||keys['arrowleft']){ ix -= _right.x; iz -= _right.z; }

    const hasInput = ix !== 0 || iz !== 0;
    const chargeRatio = this.charge / this.maxCharge;
    const speedMul = this.charge <= 0 ? 0 : (chargeRatio < 0.08 ? 0.25 : 1);

    if(hasInput && speedMul > 0){
      const len = Math.hypot(ix, iz);
      ix /= len; iz /= len;
      const maxSpd = MOVE.maxSpeed * speedMul;
      this.vx = approachVelocity(this.vx, ix * maxSpd, MOVE.accel, dt);
      this.vz = approachVelocity(this.vz, iz * maxSpd, MOVE.accel, dt);
      const targetYaw = Math.atan2(ix, iz);
      this.rotY = lerpAngle(this.rotY, targetYaw, 1 - Math.exp(-MOVE.turnSpeed * dt));
    } else {
      this.vx = approachVelocity(this.vx, 0, MOVE.decel, dt);
      this.vz = approachVelocity(this.vz, 0, MOVE.decel, dt);
    }

    const speed = Math.hypot(this.vx, this.vz);
    if(speed > 0.2){
      this.charge = Math.max(0, this.charge - MULLI_DRAIN_PER_SEC * dt);
    }

    if(this.vx !== 0){
      const nx = this.x + this.vx * dt;
      if(!isBlocked(nx, this.z)) this.x = nx;
      else this.vx *= 0.1;
    }
    if(this.vz !== 0){
      const nz = this.z + this.vz * dt;
      if(!isBlocked(this.x, nz)) this.z = nz;
      else this.vz *= 0.1;
    }

    const wy = Math.max(terrainHeightWorld(this.x, this.z), 0);
    this.position.set(this.x, wy, this.z);
    this.mesh.position.set(this.x, wy, this.z);
    this.mesh.rotation.y = this.rotY;
    this.syncPallet();

    // Keep player attached for camera
    Player.x = this.x;
    Player.z = this.z;
    playerGroup.position.set(this.x, wy, this.z);
  }
}

function buildMulliMesh(){
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xc45c26, flatShading: true, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 3.2), bodyMat);
  body.position.y = 0.9;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.4), bodyMat);
  cabin.position.set(0, 1.7, 0.3);
  g.add(cabin);
  // Solar roof
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.08, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x1a3a8a, emissive: 0x0a2040, emissiveIntensity: 0.4, flatShading: true })
  );
  panel.position.set(0, 2.2, 0.3);
  g.add(panel);
  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 10);
  for(const [x,z] of [[-1.1,-1.1],[1.1,-1.1],[-1.1,1.1],[1.1,1.1]]){
    const w = new THREE.Mesh(wheelGeo, dark);
    w.rotation.z = Math.PI/2;
    w.position.set(x, 0.45, z);
    g.add(w);
  }
  // Hitch
  const hitch = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.6), dark);
  hitch.position.set(0, 0.5, -1.9);
  g.add(hitch);

  // World-space charge bar above Mulli
  const barGroup = new THREE.Group();
  barGroup.position.set(0, 3.0, 0);
  // Background
  const bg = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: 0x222222, flatShading: true }));
  barGroup.add(bg);
  // Fill
  const fill = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: 0x2ecc71, flatShading: true }));
  fill.position.set(0, 0, 0.02);
  barGroup.add(fill);

  g.add(barGroup);
  g.userData.chargeBar = fill;

  return g;
}

export function spawnMulli(wx, wz, opts={}){
  if(Mulli && !Mulli.dead) Mulli.destroy();
  Mulli = new MulliEntity(wx, wz, opts);
  // Bind charge bar reference
  Mulli._chargeBar = Mulli.mesh.userData.chargeBar;
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