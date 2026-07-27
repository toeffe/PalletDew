import { GameState, currentSeason } from '../core/state.js';
import { SEASON_ICON } from '../core/constants.js';
import { renderCraftPanel } from './craftPanel.js';

export function updateUI(){
  document.getElementById('day').textContent = GameState.day;
  document.getElementById('season').textContent = currentSeason()[0].toUpperCase()+currentSeason().slice(1) + ' ' + SEASON_ICON[currentSeason()];
  document.getElementById('time').textContent = String(GameState.hour%24).padStart(2,'0')+':'+String(GameState.minute).padStart(2,'0');
  document.getElementById('gold').textContent = GameState.gold;
  document.getElementById('energybar').style.width = GameState.energy+'%';

  const bar = document.getElementById('hotbar');
  bar.innerHTML = '';
  GameState.inventory.forEach((item,i)=>{
    const slot = document.createElement('div');
    slot.className = 'slot' + (i===GameState.selectedSlot ? ' active':'');
    slot.innerHTML = `<span class="slot-key">${i+1}</span><span class="slot-icon">${item.icon}</span><span class="slot-count">${item.count>1?item.count:''}</span>`;
    slot.onclick = () => { GameState.selectedSlot = i; updateUI(); };
    bar.appendChild(slot);
  });
  renderCraftPanel();
}
