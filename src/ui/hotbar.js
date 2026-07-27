import { GameState } from '../core/state.js';
import { splitStack } from '../systems/inventory.js';
import { updateUI } from './hud.js';

let splitSlot = null;
let splitBag = 'hotbar';

function ensureSplitPanel(){
  let el = document.getElementById('split-panel');
  if(el) return el;
  el = document.createElement('div');
  el.id = 'split-panel';
  el.innerHTML = `
    <h3>Split stack</h3>
    <input type="number" id="split-amount" min="1" value="1" />
    <div class="split-actions">
      <button type="button" class="recipe-btn" id="split-half">Half</button>
      <button type="button" class="recipe-btn" id="split-ok">Confirm</button>
      <button type="button" class="recipe-btn" id="split-cancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(el);
  el.querySelector('#split-half').onclick = () => {
    const arr = splitBag === 'backpack' ? GameState.backpack : GameState.hotbar;
    const item = arr[splitSlot];
    if(!item) return;
    el.querySelector('#split-amount').value = Math.floor(item.count / 2);
  };
  el.querySelector('#split-ok').onclick = () => {
    const amount = parseInt(el.querySelector('#split-amount').value, 10);
    if(splitSlot != null && splitStack(splitSlot, amount, splitBag)) updateUI();
    closeSplitPanel();
  };
  el.querySelector('#split-cancel').onclick = () => closeSplitPanel();
  return el;
}

export function openSplitPanel(slotIndex, bag='hotbar'){
  const arr = bag === 'backpack' ? GameState.backpack : GameState.hotbar;
  const item = arr[slotIndex];
  if(!item || item.count <= 1 || item.maxInventoryStack <= 1) return;
  splitSlot = slotIndex;
  splitBag = bag;
  const el = ensureSplitPanel();
  el.style.display = 'block';
  const input = el.querySelector('#split-amount');
  input.max = item.count - 1;
  input.value = Math.floor(item.count / 2);
}

export function closeSplitPanel(){
  splitSlot = null;
  const el = document.getElementById('split-panel');
  if(el) el.style.display = 'none';
}
