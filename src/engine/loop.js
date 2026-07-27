import * as THREE from 'three';
import { renderer, scene, camera } from './renderer.js';
import { updateTime } from '../systems/time.js';
import { updatePlayer, updateCamera } from '../entities/player.js';
import { updateRaycast } from './input.js';
import { updateEntities } from '../entities/WorldEntity.js';
import { updateSky, updateRain } from './weather.js';
import { updateMinimap } from '../ui/minimap.js';
import { waterMat } from '../world/water.js';

const clock = new THREE.Clock();

export function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  updateTime(dt);
  updatePlayer(dt);
  updateCamera(dt);
  updateRaycast();
  updateEntities(dt);
  updateSky(dt);
  updateRain(dt);
  updateMinimap();
  waterMat.uniforms.uTime.value += dt;
  renderer.render(scene, camera);
}
