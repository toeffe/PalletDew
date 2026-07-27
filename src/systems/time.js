import { DAYS_PER_SEASON } from '../core/constants.js';
import { GameState, currentSeason, log } from '../core/state.js';
import { farmTiles, setTileDirtLook } from '../world/farm.js';
import { repaintSeason } from '../world/terrain.js';
import { saveGame } from '../core/save.js';
import { updateUI } from '../ui/hud.js';

export function pickWeather(){
  const season = currentSeason();
  const r = Math.random();
  if(season === 'winter'){
    if(r < 0.30) return 'snow';
    if(r < 0.50) return 'cloudy';
    if(r < 0.62) return 'fog';
    if(r < 0.72) return 'storm';
    return 'clear';
  }
  if(season === 'fall'){
    if(r < 0.22) return 'rain';
    if(r < 0.38) return 'cloudy';
    if(r < 0.48) return 'fog';
    if(r < 0.56) return 'storm';
    return 'clear';
  }
  if(season === 'spring'){
    if(r < 0.28) return 'rain';
    if(r < 0.42) return 'cloudy';
    if(r < 0.50) return 'fog';
    if(r < 0.55) return 'storm';
    return 'clear';
  }
  if(r < 0.12) return 'rain';
  if(r < 0.22) return 'cloudy';
  if(r < 0.28) return 'storm';
  if(r < 0.32) return 'fog';
  return 'clear';
}

export function weatherIsWet(w){ return w === 'rain' || w === 'storm'; }

export function sleep(){
  if(GameState.energy > 90 && GameState.hour < 20){
    log("Not tired yet.");
    return;
  }
  advanceDay();
}

export function advanceDay(){
  GameState.day++; GameState.hour = 6; GameState.minute = 0;
  GameState.energy = GameState.maxEnergy;
  GameState.weather = pickWeather();
  const wet = weatherIsWet(GameState.weather);
  for(const t of farmTiles.values()){
    if(!t.tilled && !t.crop) continue;
    if(wet) t.watered = true;
    else if(t.tilled) t.watered = false;
    if(t.tilled) setTileDirtLook(t);
    if(t.crop){ t.crop.grow(); t.crop.watered = wet; }
  }
  if((GameState.day-1)%DAYS_PER_SEASON===0) repaintSeason();
  const msgs = {
    clear: 'Clear skies.',
    cloudy: 'Clouds gather over the island.',
    rain: 'Rain is falling — crops are watered.',
    storm: 'A storm rolls in — heavy rain waters the fields.',
    fog: 'Thick fog blankets the island.',
    snow: 'Snow drifts down across the land.'
  };
  log(`Day ${GameState.day} begins. ${msgs[GameState.weather] || ''}`);
  updateUI();
  saveGame();
}

let gameMinutesAccum = 0;
export function updateTime(dt){
  gameMinutesAccum += dt * 2.2;
  while(gameMinutesAccum >= 1){
    gameMinutesAccum -= 1;
    GameState.minute++;
    if(GameState.minute>=60){ GameState.minute=0; GameState.hour++; }
    if(GameState.hour>=26){
      log('You collapsed from exhaustion...');
      advanceDay();
      return;
    }
  }
}
