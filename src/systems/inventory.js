import { ItemRegistry } from '../core/registry.js';
import { HOTBAR_SIZE, BACKPACK_SIZE } from '../core/constants.js';
import { GameState, log } from '../core/state.js';

let onChange = () => {};

export function setInventoryChangeHandler(fn){
  onChange = fn || (() => {});
}

export function emptyHotbar(){ return Array(HOTBAR_SIZE).fill(null); }
export function emptyBackpack(){ return Array(BACKPACK_SIZE).fill(null); }

/** All player storage slots in order: hotbar then backpack */
export function allPlayerSlots(){
  return [...GameState.hotbar, ...GameState.backpack];
}

export function getSelectedItem(){
  return GameState.hotbar[GameState.selectedSlot] || null;
}

export function useEnergy(n){
  GameState.energy = Math.max(0, GameState.energy - n);
  onChange();
}

function clearSlotHolding(item){
  let idx = GameState.hotbar.indexOf(item);
  if(idx >= 0){ GameState.hotbar[idx] = null; return; }
  idx = GameState.backpack.indexOf(item);
  if(idx >= 0) GameState.backpack[idx] = null;
}

export function consumeIfEmpty(item){
  if(item && item.count <= 0){
    clearSlotHolding(item);
    onChange();
  }
}

export function consumeSelected(n=1){
  const item = getSelectedItem();
  if(!item || item.count < n) return false;
  item.count -= n;
  consumeIfEmpty(item);
  onChange();
  return true;
}

function findPartialStack(id, maxStack){
  for(const bag of [GameState.hotbar, GameState.backpack]){
    const stack = bag.find(i => i && i.id === id && i.count < maxStack);
    if(stack) return stack;
  }
  return null;
}

function findEmptySlot(){
  for(const bag of [GameState.hotbar, GameState.backpack]){
    const idx = bag.findIndex(s => !s);
    if(idx >= 0) return { bag, idx };
  }
  return null;
}

/** Count of an item across hotbar + backpack */
export function countItem(id){
  let n = 0;
  for(const s of allPlayerSlots()){
    if(s?.id === id) n += s.count;
  }
  return n;
}

/** Remove n of id from storage (backpack first, then hotbar). */
export function removeItem(id, n){
  let left = n;
  for(const bag of [GameState.backpack, GameState.hotbar]){
    for(let i = 0; i < bag.length && left > 0; i++){
      const s = bag[i];
      if(!s || s.id !== id) continue;
      const take = Math.min(s.count, left);
      s.count -= take;
      left -= take;
      if(s.count <= 0) bag[i] = null;
    }
  }
  onChange();
  return left === 0;
}

/** @returns {boolean} false if nothing could be added */
export function addItem(id, count=1){
  const def = ItemRegistry.get(id);
  if(!def) return false;
  if(def.size === 'large' || def.maxInventoryStack <= 0){
    log(`Cannot put ${def.name} in inventory.`);
    return false;
  }

  let remaining = count;
  const maxStack = def.maxInventoryStack;

  while(remaining > 0){
    const stack = findPartialStack(id, maxStack);
    if(stack){
      const space = maxStack - stack.count;
      const add = Math.min(space, remaining);
      stack.count += add;
      remaining -= add;
      continue;
    }
    const empty = findEmptySlot();
    if(!empty){
      onChange();
      if(remaining < count) log(`Inventory full — added ${count - remaining} ${def.name}.`);
      else log('Inventory full.');
      return remaining < count;
    }
    const add = Math.min(maxStack, remaining);
    empty.bag[empty.idx] = { ...def, count: add };
    remaining -= add;
  }
  onChange();
  return true;
}

/** Split hotbar stack into an empty slot (prefers backpack). */
export function splitStack(slotIndex, amount, bag='hotbar'){
  const arr = bag === 'backpack' ? GameState.backpack : GameState.hotbar;
  const item = arr[slotIndex];
  if(!item || amount <= 0 || amount >= item.count) return false;
  if(item.maxInventoryStack <= 1) return false;
  const empty = findEmptySlot();
  if(!empty){
    log('Inventory full — cannot split.');
    return false;
  }
  item.count -= amount;
  empty.bag[empty.idx] = { ...ItemRegistry.get(item.id), count: amount };
  onChange();
  return true;
}

export function setCarried(id, count=1){
  const def = ItemRegistry.get(id);
  if(!def) return false;
  if(!def.canCarryByHand){
    log(`Cannot carry ${def.name} by hand.`);
    return false;
  }
  if(GameState.carried){
    log('Hands are full.');
    return false;
  }
  GameState.carried = { id, count };
  onChange();
  return true;
}

export function clearCarried(){
  GameState.carried = null;
  onChange();
}

export function slotRef(bag, index){
  const arr = bag === 'backpack' ? GameState.backpack : GameState.hotbar;
  return { arr, index, item: arr[index] };
}

/** Inventory cursor click on a slot */
export function clickInventorySlot(bag, index){
  const arr = bag === 'backpack' ? GameState.backpack : GameState.hotbar;
  const slot = arr[index];
  const cursor = GameState.invCursor;

  if(!cursor){
    if(!slot) return;
    GameState.invCursor = { ...ItemRegistry.get(slot.id), count: slot.count };
    arr[index] = null;
    onChange();
    return;
  }

  // Place / merge / swap
  if(!slot){
    arr[index] = { ...ItemRegistry.get(cursor.id), count: cursor.count };
    GameState.invCursor = null;
    onChange();
    return;
  }

  if(slot.id === cursor.id && slot.count < slot.maxInventoryStack){
    const space = slot.maxInventoryStack - slot.count;
    const add = Math.min(space, cursor.count);
    slot.count += add;
    cursor.count -= add;
    if(cursor.count <= 0) GameState.invCursor = null;
    onChange();
    return;
  }

  // Swap
  arr[index] = { ...ItemRegistry.get(cursor.id), count: cursor.count };
  GameState.invCursor = { ...ItemRegistry.get(slot.id), count: slot.count };
  onChange();
}

export function clearInvCursor(){
  if(!GameState.invCursor) return;
  // Try to put back
  if(!addItem(GameState.invCursor.id, GameState.invCursor.count)){
    log('Could not return held items — inventory full.');
  }
  GameState.invCursor = null;
  onChange();
}

export function giveStartingInventory(){
  GameState.hotbar = emptyHotbar();
  GameState.backpack = emptyBackpack();
  const start = [
    ['hoe', 1],
    ['watering_can', 1],
    ['pickaxe', 1],
    ['axe', 1],
    ['hand', 1],
    ['turnip_seeds', 10],
    ['potato_seeds', 5],
    ['carrot_seeds', 8],
    ['cable_item', 8],
  ];
  start.forEach(([id, count], i) => {
    const def = ItemRegistry.get(id);
    if(def && i < HOTBAR_SIZE) GameState.hotbar[i] = { ...def, count };
  });
  const bag = ItemRegistry.get('seed_bag');
  if(bag) GameState.backpack[0] = { ...bag, count: 1 };
  GameState.carried = null;
  GameState.invCursor = null;
  GameState.selectedSlot = 0;
}

/** Restore from save; supports legacy dense `inventory` array */
export function loadInventoryFromSave(data){
  GameState.hotbar = emptyHotbar();
  GameState.backpack = emptyBackpack();
  GameState.selectedSlot = data.selectedSlot || 0;
  if(data.hotbar || data.backpack){
    (data.hotbar || []).forEach((s, i) => {
      if(i >= HOTBAR_SIZE || !s) return;
      const def = ItemRegistry.get(s.id);
      if(def) GameState.hotbar[i] = { ...def, count: s.count };
    });
    (data.backpack || []).forEach((s, i) => {
      if(i >= BACKPACK_SIZE || !s) return;
      const def = ItemRegistry.get(s.id);
      if(def) GameState.backpack[i] = { ...def, count: s.count };
    });
    return;
  }
  // Legacy: dense inventory list → fill hotbar then backpack
  const list = data.inventory || [];
  let i = 0;
  for(const entry of list){
    const def = ItemRegistry.get(entry.id);
    if(!def) continue;
    const slot = { ...def, count: entry.count };
    if(i < HOTBAR_SIZE) GameState.hotbar[i] = slot;
    else if(i - HOTBAR_SIZE < BACKPACK_SIZE) GameState.backpack[i - HOTBAR_SIZE] = slot;
    i++;
  }
}

export function serializeInventory(){
  const pack = (arr) => arr.map(s => s ? { id: s.id, count: s.count } : null);
  return {
    hotbar: pack(GameState.hotbar),
    backpack: pack(GameState.backpack),
    selectedSlot: GameState.selectedSlot,
  };
}
