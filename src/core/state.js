import { SEASONS, DAYS_PER_SEASON } from './constants.js';

export const GameState = {
  seed: Math.floor(Math.random()*1e9),
  day: 1, hour: 6, minute: 0, gold: 50,
  energy: 100, maxEnergy: 100,
  weather: 'clear',
  inventory: [],
  selectedSlot: 0,
};

export function currentSeason(){
  return SEASONS[Math.floor((GameState.day-1)/DAYS_PER_SEASON) % 4];
}

export function log(msg){
  const el = document.getElementById('console-log');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `[Day ${GameState.day}] ${msg}`;
  el.prepend(entry);
  if(el.children.length > 20) el.lastChild.remove();
}
