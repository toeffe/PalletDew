import * as THREE from 'three';
import { renderer, scene, camera } from './renderer.js';
import { updateTime } from '../systems/time.js';
import { updatePlayer, updateCamera } from '../entities/player.js';
import { updateRaycast } from './input.js';
import { updateEntities } from '../entities/WorldEntity.js';
import { updateSky, updateRain } from './weather.js';
import { tickPower } from '../systems/power.js';
import { GameState } from '../core/state.js';
import { Mulli } from '../entities/Mulli.js';
import { updateMinimap } from '../ui/minimap.js';
import { updateUI } from '../ui/hud.js';
import { waterMat } from '../world/water.js';

const clock = new THREE.Clock();
let uiAcc = 0;

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
  tickPower(dt, GameState.hour, GameState.minute, GameState.weather, Mulli);
  updateMinimap();
  waterMat.uniforms.uTime.value += dt;
  uiAcc += dt;
  if(uiAcc > 0.5){
    uiAcc = 0;
    if(Mulli?.mounted) updateUI();
  }
  renderer.render(scene, camera);
}
