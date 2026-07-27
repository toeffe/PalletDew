import * as THREE from 'three';
import {
  CABLE_MAX_LEN, PANEL_OUTPUT_RATE, BATTERY_MAX_CHARGE,
  DOCK_CHARGE_RADIUS, MULLI_DOCK_CHARGE_PER_SEC,
} from '../core/constants.js';
import { scene } from '../engine/renderer.js';
import { daylightSolarRate } from '../engine/weather.js';
import { GameState, log } from '../core/state.js';
import { addItem } from './inventory.js';

export const powerNodes = new Map();
export const cables = new Map();

let nextNodeId = 1;
let nextCableId = 1;

const cableMeshes = new Map(); // cableId -> mesh

export function clearPowerGraph(){
  for(const mesh of cableMeshes.values()){
    scene.remove(mesh);
    mesh.geometry?.dispose();
    mesh.material?.dispose();
  }
  cableMeshes.clear();
  powerNodes.clear();
  cables.clear();
  nextNodeId = 1;
  nextCableId = 1;
}

export function registerNode(kind, wx, wz, opts={}){
  const id = opts.id || `pn_${nextNodeId++}`;
  const node = {
    id, kind, wx, wz,
    charge: opts.charge ?? (kind === 'battery' ? 0 : 0),
    maxCharge: opts.maxCharge ?? (kind === 'battery' ? BATTERY_MAX_CHARGE : 0),
    outputRate: opts.outputRate ?? (kind === 'solar_panel' ? PANEL_OUTPUT_RATE : 0),
    connections: new Set(),
    entity: opts.entity || null,
  };
  powerNodes.set(id, node);
  if(Number.isFinite(opts.idNum)) nextNodeId = Math.max(nextNodeId, opts.idNum + 1);
  const m = String(id).match(/^pn_(\d+)$/);
  if(m) nextNodeId = Math.max(nextNodeId, parseInt(m[1],10) + 1);
  return node;
}

export function unregisterNode(nodeId){
  const node = powerNodes.get(nodeId);
  if(!node) return;
  const toRemove = [];
  for(const [cid, c] of cables){
    if(c.a === nodeId || c.b === nodeId) toRemove.push(cid);
  }
  for(const cid of toRemove) disconnectCable(cid, false);
  powerNodes.delete(nodeId);
}

export function getNodeAtEntity(entity){
  if(!entity) return null;
  for(const n of powerNodes.values()){
    if(n.entity === entity) return n;
  }
  return null;
}

export function findNodeNear(wx, wz, radius=2){
  let best = null, bestD = radius;
  for(const n of powerNodes.values()){
    const d = Math.hypot(n.wx - wx, n.wz - wz);
    if(d < bestD){ best = n; bestD = d; }
  }
  return best;
}

export function getComponent(nodeId){
  const start = powerNodes.get(nodeId);
  if(!start) return new Set();
  const seen = new Set([nodeId]);
  const stack = [nodeId];
  while(stack.length){
    const cur = stack.pop();
    const node = powerNodes.get(cur);
    if(!node) continue;
    for(const nb of node.connections){
      if(!seen.has(nb)){ seen.add(nb); stack.push(nb); }
    }
  }
  return seen;
}

function buildCableMesh(a, b, cableId){
  const ay = 0.15, by = 0.15;
  const points = [
    new THREE.Vector3(a.wx, ay, a.wz),
    new THREE.Vector3(b.wx, by, b.wz),
  ];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color: 0x3a8cff, transparent: true, opacity: 0.85 });
  const line = new THREE.Line(geo, mat);
  line.userData.cableId = cableId;
  line.userData.isCable = true;
  // Fat hit proxy
  const mid = new THREE.Vector3().addVectors(points[0], points[1]).multiplyScalar(0.5);
  const len = points[0].distanceTo(points[1]);
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.25, Math.max(0.5, len)),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.copy(mid);
  hit.lookAt(points[1]);
  hit.rotateX(Math.PI / 2);
  hit.userData.cableId = cableId;
  hit.userData.isCable = true;
  const g = new THREE.Group();
  g.add(line);
  g.add(hit);
  g.userData.cableId = cableId;
  g.userData.isCable = true;
  g.userData.lineMat = mat;
  scene.add(g);
  return g;
}

export function connectNodes(aId, bId){
  if(aId === bId) return null;
  const a = powerNodes.get(aId);
  const b = powerNodes.get(bId);
  if(!a || !b) return null;
  const dist = Math.hypot(a.wx - b.wx, a.wz - b.wz);
  if(dist > CABLE_MAX_LEN){
    log('Too far apart to cable.');
    return null;
  }
  for(const c of cables.values()){
    if((c.a === aId && c.b === bId) || (c.a === bId && c.b === aId)){
      log('Already connected.');
      return null;
    }
  }
  const id = `cab_${nextCableId++}`;
  const cable = { id, a: aId, b: bId };
  cables.set(id, cable);
  a.connections.add(bId);
  b.connections.add(aId);
  cableMeshes.set(id, buildCableMesh(a, b, id));
  return cable;
}

export function disconnectCable(cableId, refund=true){
  const c = cables.get(cableId);
  if(!c) return;
  const a = powerNodes.get(c.a);
  const b = powerNodes.get(c.b);
  if(a) a.connections.delete(c.b);
  if(b) b.connections.delete(c.a);
  cables.delete(cableId);
  const mesh = cableMeshes.get(cableId);
  if(mesh){
    scene.remove(mesh);
    mesh.traverse(ch => {
      if(ch.geometry) ch.geometry.dispose();
      if(ch.material) ch.material.dispose();
    });
    cableMeshes.delete(cableId);
  }
  if(refund) addItem('cable_item', 1);
}

export function restoreCable(id, aId, bId){
  const a = powerNodes.get(aId);
  const b = powerNodes.get(bId);
  if(!a || !b) return;
  if(cables.has(id)) return;
  const cable = { id, a: aId, b: bId };
  cables.set(id, cable);
  a.connections.add(bId);
  b.connections.add(aId);
  cableMeshes.set(id, buildCableMesh(a, b, id));
  const m = String(id).match(/^cab_(\d+)$/);
  if(m) nextCableId = Math.max(nextCableId, parseInt(m[1],10) + 1);
}

/** @param {import('../entities/Mulli.js').MulliEntity|null} mulli */
export function tickPower(dt, hour, minute, weather, mulli){
  const rate = daylightSolarRate(hour, minute, weather);
  const visited = new Set();

  for(const nodeId of powerNodes.keys()){
    if(visited.has(nodeId)) continue;
    const component = getComponent(nodeId);
    for(const id of component) visited.add(id);

    const nodes = [...component].map(id => powerNodes.get(id)).filter(Boolean);
    const panels = nodes.filter(n => n.kind === 'solar_panel');
    const batteries = nodes.filter(n => n.kind === 'battery');
    const docks = nodes.filter(n => n.kind === 'charge_dock');

    let production = 0;
    for(const p of panels) production += p.outputRate * rate * dt;

    // Proportional fill by remaining capacity
    if(production > 0 && batteries.length){
      let remainingCap = batteries.reduce((s,b) => s + Math.max(0, b.maxCharge - b.charge), 0);
      if(remainingCap > 0){
        const toFill = Math.min(production, remainingCap);
        for(const b of batteries){
          const space = Math.max(0, b.maxCharge - b.charge);
          if(space <= 0 || remainingCap <= 0) continue;
          const share = toFill * (space / remainingCap);
          b.charge = Math.min(b.maxCharge, b.charge + share);
        }
        // recompute remaining for display; overflow discarded intentionally
      }
    }

    // Update cable glow for this component
    const producing = production > 0.001;
    for(const [cid, c] of cables){
      if(!component.has(c.a)) continue;
      const mesh = cableMeshes.get(cid);
      if(mesh?.userData.lineMat){
        mesh.userData.lineMat.color.setHex(producing ? 0x5cff8a : 0x3a8cff);
        mesh.userData.lineMat.opacity = producing ? 1 : 0.7;
      }
    }

    // Dock → Mulli charge when parked
    if(!mulli || mulli.mounted) continue;
    const speed = Math.hypot(mulli.vx || 0, mulli.vz || 0);
    if(speed > 0.15) continue;
    if(mulli.charge >= mulli.maxCharge) continue;

    for(const dock of docks){
      const dist = Math.hypot(dock.wx - mulli.x, dock.wz - mulli.z);
      if(dist > DOCK_CHARGE_RADIUS) continue;
      let avail = batteries.reduce((s,b) => s + b.charge, 0);
      if(avail <= 0) continue;
      const need = Math.min(MULLI_DOCK_CHARGE_PER_SEC * dt, mulli.maxCharge - mulli.charge);
      const take = Math.min(need, avail);
      if(take <= 0) continue;
      // proportional pull by charge
      for(const b of batteries){
        if(avail <= 0) break;
        const share = take * (b.charge / avail);
        const pulled = Math.min(b.charge, share);
        b.charge -= pulled;
      }
      mulli.charge = Math.min(mulli.maxCharge, mulli.charge + take);
      break;
    }
  }

  // Refresh battery mesh fill indicators
  for(const n of powerNodes.values()){
    if(n.kind === 'battery' && n.entity?.refreshChargeVisual){
      n.entity.refreshChargeVisual(n.charge / Math.max(1, n.maxCharge));
    }
  }
}

export function serializePower(){
  return {
    powerNodes: Array.from(powerNodes.values()).map(n => ({
      id: n.id, kind: n.kind, wx: n.wx, wz: n.wz, charge: n.charge,
    })),
    cables: Array.from(cables.values()).map(c => ({ id: c.id, a: c.a, b: c.b })),
  };
}
