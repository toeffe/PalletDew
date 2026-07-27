import { ItemRegistry } from '../core/registry.js';
import { GameState, log } from '../core/state.js';
import { addItem, consumeIfEmpty, allPlayerSlots } from '../systems/inventory.js';
import { HOTBAR_SIZE } from '../core/constants.js';
import { updateUI } from './hud.js';

let active = null; // { title, slots, onChange, allowLarge }

function ensurePanel(){
  let el = document.getElementById('transfer-panel');
  if(el) return el;
  el = document.createElement('div');
  el.id = 'transfer-panel';
  el.innerHTML = `
    <div class="transfer-head">
      <h3 id="transfer-title">Storage</h3>
      <button type="button" id="transfer-close" class="recipe-btn">Close</button>
    </div>
    <div class="transfer-cols">
      <div>
        <div class="transfer-label">Container</div>
        <div id="transfer-container" class="transfer-grid"></div>
      </div>
      <div>
        <div class="transfer-label">Inventory</div>
        <div id="transfer-inv" class="transfer-grid transfer-inv-wide"></div>
      </div>
    </div>
    <p class="transfer-hint">Click to move one · Shift+click for stack</p>
  `;
  document.body.appendChild(el);
  el.querySelector('#transfer-close').onclick = () => closeTransferPanel();
  return el;
}

export function openTransferPanel({ title, slots, onChange, allowLarge=false }){
  active = { title, slots, onChange, allowLarge };
  const el = ensurePanel();
  el.style.display = 'block';
  el.querySelector('#transfer-title').textContent = title || 'Storage';
  renderTransfer();
}

export function closeTransferPanel(){
  active = null;
  const el = document.getElementById('transfer-panel');
  if(el) el.style.display = 'none';
}

export function isTransferOpen(){
  return !!active;
}

function playerSlotAt(flatIndex){
  if(flatIndex < HOTBAR_SIZE){
    return { bag: GameState.hotbar, index: flatIndex, item: GameState.hotbar[flatIndex] };
  }
  const bi = flatIndex - HOTBAR_SIZE;
  return { bag: GameState.backpack, index: bi, item: GameState.backpack[bi] };
}

function renderTransfer(){
  if(!active) return;
  const cont = document.getElementById('transfer-container');
  const inv = document.getElementById('transfer-inv');
  cont.innerHTML = '';
  inv.innerHTML = '';

  active.slots.forEach((slot, i) => {
    const cell = document.createElement('div');
    cell.className = 'tslot' + (slot ? '' : ' empty');
    if(slot){
      const def = ItemRegistry.get(slot.id);
      cell.innerHTML = `<span class="slot-icon">${def?.icon || '?'}</span><span class="slot-count">${slot.count>1?slot.count:''}</span>`;
      cell.title = def?.name || slot.id;
      cell.onclick = (e) => moveFromContainer(i, e.shiftKey);
    }
    cont.appendChild(cell);
  });

  allPlayerSlots().forEach((item, i) => {
    const cell = document.createElement('div');
    cell.className = 'tslot' + (item ? '' : ' empty');
    if(item){
      cell.innerHTML = `<span class="slot-icon">${item.icon}</span><span class="slot-count">${item.count>1?item.count:''}</span>`;
      cell.title = item.name;
      cell.onclick = (e) => moveToContainer(i, e.shiftKey);
    }
    inv.appendChild(cell);
  });
}

function moveFromContainer(slotIndex, wholeStack){
  if(!active) return;
  const slot = active.slots[slotIndex];
  if(!slot) return;
  const def = ItemRegistry.get(slot.id);
  if(!def) return;

  if(def.size === 'large'){
    if(GameState.carried){ log('Hands full.'); return; }
    GameState.carried = { id: slot.id, count: wholeStack ? slot.count : 1 };
    if(wholeStack || slot.count <= 1) active.slots[slotIndex] = null;
    else slot.count -= 1;
    active.onChange?.();
    updateUI();
    renderTransfer();
    return;
  }

  const amount = wholeStack ? slot.count : 1;
  if(!addItem(slot.id, amount)) return;
  slot.count -= amount;
  if(slot.count <= 0) active.slots[slotIndex] = null;
  active.onChange?.();
  updateUI();
  renderTransfer();
}

function moveToContainer(flatIndex, wholeStack){
  if(!active) return;
  const ref = playerSlotAt(flatIndex);
  const item = ref.item;
  if(!item) return;
  const def = ItemRegistry.get(item.id);
  const max = active.allowLarge
    ? (def.maxPalletStack ?? 99)
    : (def.maxInventoryStack ?? 99);

  if(def.size === 'large' && !active.allowLarge){
    log('Too large for this container.');
    return;
  }

  const amount = wholeStack ? item.count : 1;
  let remaining = amount;

  for(let i=0;i<active.slots.length && remaining>0;i++){
    const s = active.slots[i];
    if(s && s.id === item.id && s.count < max){
      const add = Math.min(max - s.count, remaining);
      s.count += add;
      remaining -= add;
    }
  }
  while(remaining > 0){
    const empty = active.slots.findIndex(s => !s);
    if(empty < 0) break;
    const add = Math.min(max, remaining);
    active.slots[empty] = { id: item.id, count: add };
    remaining -= add;
  }

  const moved = amount - remaining;
  if(moved <= 0){ log('No room.'); return; }
  item.count -= moved;
  if(item.count <= 0) ref.bag[ref.index] = null;
  active.onChange?.();
  updateUI();
  renderTransfer();
}

export function openChestPanel(chestEntity){
  if(!chestEntity.contents){
    chestEntity.contents = Array(16).fill(null);
  }
  openTransferPanel({
    title: 'Chest',
    slots: chestEntity.contents,
    onChange: () => {},
    allowLarge: false,
  });
}
