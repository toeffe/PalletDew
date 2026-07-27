import { ObjectRegistry } from '../core/registry.js';
import { scene } from '../engine/renderer.js';
import { terrainHeightWorld } from '../world/terrain.js';
import { WorldEntity } from './WorldEntity.js';

export class PlacedObject extends WorldEntity {
  constructor(wx, wz, defId, saveId){
    const wy = terrainHeightWorld(wx, wz);
    super(wx, wy, wz);
    this.saveId = saveId || null;
    this.def = ObjectRegistry.get(defId);
    this.mesh = this.def.buildMesh();
    this.mesh.position.set(wx, wy, wz);
    this.mesh.traverse(c => { c.userData.entityRef = this; if(c.isMesh){ c.castShadow=true; c.receiveShadow=true; } });
    scene.add(this.mesh);
    if(this.def.onPlace) this.def.onPlace(this);
  }
  update(dt){ if(this.def.onTick) this.def.onTick(this, dt); }
  interact(tool){ if(this.def.onInteract) this.def.onInteract(this, tool); }
}
