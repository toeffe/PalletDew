import * as THREE from 'three';
import { scene, sun, hemiLight } from './renderer.js';
import { skyMat, starMat } from './sky.js';
import { GameState, currentSeason } from '../core/state.js';
import { SEASON_TINTS } from '../world/terrain.js';
import { grassMatRef } from '../world/decor.js';
import { Player, playerGroup } from '../entities/player.js';

export const WEATHER_ICONS = {
  clear:'☀️', cloudy:'⛅', rain:'🌧️', storm:'⛈️', fog:'🌫️', snow:'❄️'
};

export const WeatherFX = {
  wind: 0.35,
  targetWind: 0.35,
  fogDensity: 0.0032,
  targetFog: 0.0032,
  sunMul: 1,
  targetSunMul: 1,
  cloudGray: 0,
  targetCloud: 0,
  lightningTimer: 0,
  lightningFlash: 0
};

const precipCount = 1100;
const precipGeo = new THREE.BufferGeometry();
const precipPos = new Float32Array(precipCount*3);
for(let i=0;i<precipCount;i++){
  precipPos[i*3]=(Math.random()-0.5)*90;
  precipPos[i*3+1]=Math.random()*45;
  precipPos[i*3+2]=(Math.random()-0.5)*90;
}
precipGeo.setAttribute('position', new THREE.BufferAttribute(precipPos,3));
const precipMat = new THREE.PointsMaterial({ color:0xaee0ff, size:0.22, transparent:true, opacity:0.65, depthWrite:false });
const precip = new THREE.Points(precipGeo, precipMat);
precip.visible = false;
scene.add(precip);

export function updateSky(dt){
  const hourFloat = GameState.hour + GameState.minute/60;
  const elevation = Math.sin(((hourFloat-6)/12)*Math.PI);
  const dayFactor = THREE.MathUtils.clamp((elevation+0.2)/1.2, 0, 1);
  const twilight = 1 - Math.min(1, Math.abs(elevation)/0.35);
  const angle = (hourFloat/24)*Math.PI*2 - Math.PI/2;

  const w = GameState.weather;
  if(w === 'clear'){ WeatherFX.targetWind = 0.25; WeatherFX.targetFog = 0.0028; WeatherFX.targetSunMul = 1; WeatherFX.targetCloud = 0; }
  else if(w === 'cloudy'){ WeatherFX.targetWind = 0.4; WeatherFX.targetFog = 0.004; WeatherFX.targetSunMul = 0.55; WeatherFX.targetCloud = 0.55; }
  else if(w === 'rain'){ WeatherFX.targetWind = 0.7; WeatherFX.targetFog = 0.0055; WeatherFX.targetSunMul = 0.35; WeatherFX.targetCloud = 0.75; }
  else if(w === 'storm'){ WeatherFX.targetWind = 1.15; WeatherFX.targetFog = 0.007; WeatherFX.targetSunMul = 0.18; WeatherFX.targetCloud = 0.9; }
  else if(w === 'fog'){ WeatherFX.targetWind = 0.15; WeatherFX.targetFog = 0.018; WeatherFX.targetSunMul = 0.4; WeatherFX.targetCloud = 0.65; }
  else if(w === 'snow'){ WeatherFX.targetWind = 0.5; WeatherFX.targetFog = 0.006; WeatherFX.targetSunMul = 0.5; WeatherFX.targetCloud = 0.7; }

  const lerp = (a,b,t) => a + (b-a)*t;
  const t = Math.min(1, dt * 0.35);
  WeatherFX.wind = lerp(WeatherFX.wind, WeatherFX.targetWind, t);
  WeatherFX.fogDensity = lerp(WeatherFX.fogDensity, WeatherFX.targetFog, t);
  WeatherFX.sunMul = lerp(WeatherFX.sunMul, WeatherFX.targetSunMul, t);
  WeatherFX.cloudGray = lerp(WeatherFX.cloudGray, WeatherFX.targetCloud, t);

  if(w === 'storm'){
    WeatherFX.lightningTimer -= dt;
    if(WeatherFX.lightningTimer <= 0){
      WeatherFX.lightningFlash = 1;
      WeatherFX.lightningTimer = 3 + Math.random()*8;
    }
  }
  WeatherFX.lightningFlash = Math.max(0, WeatherFX.lightningFlash - dt * 4);

  sun.position.set(Player.x + Math.cos(angle)*110, Math.max(elevation,-0.1)*90+25, Player.z + Math.sin(angle)*70);
  sun.target.position.set(Player.x, playerGroup.position.y, Player.z);
  const baseSun = THREE.MathUtils.lerp(0.06, 1.3, dayFactor) * WeatherFX.sunMul;
  sun.intensity = baseSun + WeatherFX.lightningFlash * 2.5;
  hemiLight.intensity = THREE.MathUtils.lerp(0.22, 0.7, dayFactor) * (0.7 + WeatherFX.sunMul * 0.3);

  const nightTop=new THREE.Color(0x050814), nightBot=new THREE.Color(0x0a1128);
  const dayTop=new THREE.Color(0x4fa8e0), dayBot=new THREE.Color(0xdfefff);
  const dawnTop=new THREE.Color(0xff9a56), dawnBot=new THREE.Color(0xffe0b3);
  const top = nightTop.clone().lerp(dayTop, dayFactor).lerp(dawnTop, twilight*0.7);
  const bot = nightBot.clone().lerp(dayBot, dayFactor).lerp(dawnBot, twilight*0.7);
  const gray = new THREE.Color(0x6a7380);
  top.lerp(gray, WeatherFX.cloudGray * 0.7);
  bot.lerp(gray, WeatherFX.cloudGray * 0.5);
  if(WeatherFX.lightningFlash > 0.1){
    top.lerp(new THREE.Color(0xc8d8ff), WeatherFX.lightningFlash * 0.6);
    bot.lerp(new THREE.Color(0xa0b0d0), WeatherFX.lightningFlash * 0.4);
  }
  skyMat.uniforms.topColor.value.copy(top);
  skyMat.uniforms.bottomColor.value.copy(bot);
  scene.fog.color.copy(bot);
  scene.fog.density = WeatherFX.fogDensity;
  starMat.opacity = Math.max(0, (1 - dayFactor) * (1 - WeatherFX.cloudGray));

  if(grassMatRef){
    const st = SEASON_TINTS[currentSeason()];
    grassMatRef.color.copy(st);
  }

  document.getElementById('daynight-icon').textContent = dayFactor>0.6 ? '☀️' : (dayFactor>0.15 ? '🌅' : '🌙');
  document.getElementById('weather-icon').textContent = WEATHER_ICONS[GameState.weather] || '☀️';
}

export function updateRain(dt){
  const w = GameState.weather;
  const isRain = w === 'rain' || w === 'storm';
  const isSnow = w === 'snow';
  precip.visible = isRain || isSnow;
  if(!precip.visible) return;

  precip.position.set(Player.x, 0, Player.z);
  if(isSnow){
    precipMat.color.setHex(0xe8f0ff);
    precipMat.size = 0.45;
    precipMat.opacity = 0.85;
  } else {
    precipMat.color.setHex(w === 'storm' ? 0x8ec8e8 : 0xaee0ff);
    precipMat.size = w === 'storm' ? 0.28 : 0.2;
    precipMat.opacity = w === 'storm' ? 0.75 : 0.6;
  }

  const arr = precipGeo.attributes.position.array;
  const fall = isSnow ? 12 : (w === 'storm' ? 55 : 38);
  const drift = isSnow ? 8 : WeatherFX.wind * 6;
  for(let i=0;i<precipCount;i++){
    arr[i*3] += Math.sin(i + WeatherFX.wind) * drift * dt * 0.15;
    arr[i*3+1] -= dt * fall * (0.7 + (i % 5) * 0.08);
    arr[i*3+2] += Math.cos(i * 0.7) * drift * dt * 0.1;
    if(arr[i*3+1] < 0){
      arr[i*3+1] = 40 + Math.random()*8;
      arr[i*3] = (Math.random()-0.5)*90;
      arr[i*3+2] = (Math.random()-0.5)*90;
    }
  }
  precipGeo.attributes.position.needsUpdate = true;
}
