import { ObjectRegistry } from '../core/registry.js';
import { terrainHeightWorld } from '../world/terrain.js';
import { resourceGroup } from '../world/resources.js';
import { WorldEntity } from './WorldEntity.js';
import { unregisterNode } from '../systems/power.js';

export class PlacedObject extends WorldEntity {
  constructor(wx, wz, defId, saveId){
    const wy = terrainHeightWorld(wx, wz);
    super(wx, wy, wz);
    this.saveId = saveId || null;
    this.def = ObjectRegistry.get(defId);
    this.mesh = this.def.buildMesh();
    this.mesh.position.set(wx, wy, wz);
    this.mesh.traverse(c => { c.userData.entityRef = this; if(c.isMesh){ c.castShadow=true; c.receiveShadow=true; } });
    resourceGroup.add(this.mesh);
    if(this.def.onPlace) this.def.onPlace(this);
  }
  update(dt){ if(this.def.onTick) this.def.onTick(this, dt); }
  interact(tool){ if(this.def.onInteract) this.def.onInteract(this, tool); }
  destroy(){
    if(this.powerNodeId) unregisterNode(this.powerNodeId);
    super.destroy();
  }
}
