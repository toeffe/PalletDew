import { GameState } from '../core/state.js';
import { HOTBAR_SIZE, BACKPACK_SIZE } from '../core/constants.js';
import { clickInventorySlot, clearInvCursor } from '../systems/inventory.js';
import { ItemRegistry } from '../core/registry.js';
import { updateUI } from './hud.js';
import { isMenuOpen } from './menu.js';

export function isInventoryOpen(){
  return GameState.inventoryOpen;
}

export function setInventoryOpen(open){
  if(open && isMenuOpen()) return;
  if(!open && GameState.invCursor) clearInvCursor();
  GameState.inventoryOpen = !!open;
  const el = document.getElementById('inventory-panel');
  if(el) el.classList.toggle('open', GameState.inventoryOpen);
  document.body.classList.toggle('inventory-open', GameState.inventoryOpen);
  updateUI();
}

export function toggleInventory(){
  setInventoryOpen(!GameState.inventoryOpen);
}

function renderSlot(bag, index, item){
  const cell = document.createElement('div');
  cell.className = 'inv-slot' + (item ? '' : ' empty')
    + (bag === 'hotbar' && index === GameState.selectedSlot ? ' selected' : '');
  if(bag === 'hotbar'){
    cell.innerHTML = `<span class="slot-key">${index + 1}</span>`;
  }
  if(item){
    cell.innerHTML += `<span class="slot-icon">${item.icon}</span><span class="slot-count">${item.count > 1 ? item.count : ''}</span>`;
    cell.title = item.name;
  }
  cell.onclick = (e) => {
    e.stopPropagation();
    clickInventorySlot(bag, index);
    if(bag === 'hotbar') GameState.selectedSlot = index;
    renderInventoryPanel();
    updateUI();
  };
  return cell;
}

export function renderInventoryPanel(){
  const pack = document.getElementById('inv-backpack');
  const hot = document.getElementById('inv-hotbar');
  const cursor = document.getElementById('inv-cursor');
  if(!pack || !hot) return;

  pack.innerHTML = '';
  hot.innerHTML = '';
  for(let i = 0; i < BACKPACK_SIZE; i++){
    pack.appendChild(renderSlot('backpack', i, GameState.backpack[i]));
  }
  for(let i = 0; i < HOTBAR_SIZE; i++){
    hot.appendChild(renderSlot('hotbar', i, GameState.hotbar[i]));
  }

  if(cursor){
    if(GameState.invCursor){
      const def = ItemRegistry.get(GameState.invCursor.id) || GameState.invCursor;
      cursor.style.display = 'flex';
      cursor.innerHTML = `<span class="slot-icon">${def.icon || '?'}</span><span class="slot-count">${GameState.invCursor.count > 1 ? GameState.invCursor.count : ''}</span>`;
    } else {
      cursor.style.display = 'none';
    }
  }
}

export function initInventoryPanel(){
  let el = document.getElementById('inventory-panel');
  if(!el){
    el = document.createElement('div');
    el.id = 'inventory-panel';
    el.innerHTML = `
      <div id="inventory-backdrop"></div>
      <div class="inventory-window panel">
        <div class="transfer-head">
          <h3>Inventory <kbd>I</kbd></h3>
          <button type="button" class="recipe-btn" id="inv-close">Close</button>
        </div>
        <div class="transfer-label">Backpack</div>
        <div id="inv-backpack" class="inv-grid"></div>
        <div class="transfer-label" style="margin-top:10px">Hotbar</div>
        <div id="inv-hotbar" class="inv-hotbar-row"></div>
        <p class="transfer-hint">Click to pick up / place · <kbd>1–9</kbd> select hotbar</p>
        <div id="inv-cursor" class="inv-cursor-slot"></div>
      </div>
    `;
    document.body.appendChild(el);
    el.querySelector('#inv-close').onclick = () => setInventoryOpen(false);
    el.querySelector('#inventory-backdrop').onclick = () => setInventoryOpen(false);
  }
  // Follow cursor while holding
  window.addEventListener('mousemove', (e) => {
    const c = document.getElementById('inv-cursor');
    if(!c || !GameState.invCursor || !GameState.inventoryOpen) return;
    c.style.left = (e.clientX + 12) + 'px';
    c.style.top = (e.clientY + 12) + 'px';
  });
}
