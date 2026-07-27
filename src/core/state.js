import { SEASONS, DAYS_PER_SEASON, HOTBAR_SIZE, BACKPACK_SIZE } from './constants.js';

export const GameState = {
  seed: Math.floor(Math.random()*1e9),
  day: 1, hour: 6, minute: 0, gold: 50,
  energy: 100, maxEnergy: 100,
  weather: 'clear',
  hotbar: Array(HOTBAR_SIZE).fill(null),
  backpack: Array(BACKPACK_SIZE).fill(null),
  selectedSlot: 0,
  carried: null, // { id, count } | null
  invCursor: null, // held stack while inventory panel open
  inventoryOpen: false,
  connectHint: null,
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
