import { GameState, currentSeason } from '../core/state.js';
import { SEASON_ICON, HOTBAR_SIZE } from '../core/constants.js';
import { ItemRegistry } from '../core/registry.js';
import { renderCraftPanel } from './craftPanel.js';
import { openSplitPanel } from './hotbar.js';
import { renderInventoryPanel, isInventoryOpen } from './inventoryPanel.js';
import { Mulli } from '../entities/Mulli.js';
import { Player } from '../entities/player.js';

export function updateUI(){
  document.getElementById('day').textContent = GameState.day;
  document.getElementById('season').textContent = currentSeason()[0].toUpperCase()+currentSeason().slice(1) + ' ' + SEASON_ICON[currentSeason()];
  document.getElementById('time').textContent = String(GameState.hour%24).padStart(2,'0')+':'+String(GameState.minute).padStart(2,'0');
  document.getElementById('gold').textContent = GameState.gold;
  document.getElementById('energybar').style.width = GameState.energy+'%';

  let carriedEl = document.getElementById('carried-indicator');
  if(!carriedEl){
    carriedEl = document.createElement('div');
    carriedEl.id = 'carried-indicator';
    document.body.appendChild(carriedEl);
  }
  if(GameState.carried){
    const def = ItemRegistry.get(GameState.carried.id);
    carriedEl.style.display = 'block';
    carriedEl.innerHTML = `Hands: ${def?.icon || '?'} ${def?.name || ''} · <kbd>G</kbd> drop`;
  } else {
    carriedEl.style.display = 'none';
  }

  let hintEl = document.getElementById('connect-hint');
  if(!hintEl){
    hintEl = document.createElement('div');
    hintEl.id = 'connect-hint';
    document.body.appendChild(hintEl);
  }
  hintEl.style.display = GameState.connectHint ? 'block' : 'none';
  if(GameState.connectHint) hintEl.textContent = GameState.connectHint;

  let mulliBar = document.getElementById('mulli-charge');
  if(!mulliBar){
    mulliBar = document.createElement('div');
    mulliBar.id = 'mulli-charge';
    mulliBar.innerHTML = `<span>🔋 Mulli</span><div id="mulli-charge-wrap"><div id="mulli-chargebar"></div></div>`;
    document.body.appendChild(mulliBar);
  }
  if(Mulli && !Mulli.dead){
    const near = Math.hypot(Mulli.x - Player.x, Mulli.z - Player.z) < 14;
    if(Mulli.mounted || near){
      mulliBar.style.display = 'flex';
      document.getElementById('mulli-chargebar').style.width =
        Math.round((Mulli.charge / Mulli.maxCharge) * 100) + '%';
    } else {
      mulliBar.style.display = 'none';
    }
  } else {
    mulliBar.style.display = 'none';
  }

  const bar = document.getElementById('hotbar');
  bar.innerHTML = '';
  for(let i = 0; i < HOTBAR_SIZE; i++){
    const item = GameState.hotbar[i];
    const slot = document.createElement('div');
    slot.className = 'slot' + (i === GameState.selectedSlot ? ' active' : '') + (!item ? ' empty' : '');
    slot.innerHTML = `<span class="slot-key">${i + 1}</span>`;
    if(item){
      slot.innerHTML += `<span class="slot-icon">${item.icon}</span><span class="slot-count">${item.count > 1 ? item.count : ''}</span>`;
    }
    slot.onclick = () => { GameState.selectedSlot = i; updateUI(); };
    slot.oncontextmenu = (ev) => {
      ev.preventDefault();
      if(item) openSplitPanel(i, 'hotbar');
    };
    bar.appendChild(slot);
  }

  if(isInventoryOpen()) renderInventoryPanel();
  renderCraftPanel();
}
