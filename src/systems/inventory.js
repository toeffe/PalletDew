import { ItemRegistry } from '../core/registry.js';
import { GameState } from '../core/state.js';

let onChange = () => {};

export function setInventoryChangeHandler(fn){
  onChange = fn || (() => {});
}

export function getSelectedItem(){
  return GameState.inventory[GameState.selectedSlot];
}

export function useEnergy(n){
  GameState.energy = Math.max(0, GameState.energy - n);
  onChange();
}

export function consumeIfEmpty(item){
  if(item.count<=0){
    const idx = GameState.inventory.indexOf(item);
    if(idx>=0) GameState.inventory.splice(idx,1);
    if(GameState.selectedSlot>=GameState.inventory.length) GameState.selectedSlot = Math.max(0,GameState.inventory.length-1);
  }
}

export function addItem(id, count=1){
  const def = ItemRegistry.get(id);
  let stack = GameState.inventory.find(i=>i.id===id && i.count<i.maxStack);
  if(stack){ stack.count += count; }
  else { GameState.inventory.push({ ...def, count }); }
  onChange();
}

export function giveStartingInventory(){
  GameState.inventory = [
    { ...ItemRegistry.get('hoe'), count:1 },
    { ...ItemRegistry.get('watering_can'), count:1 },
    { ...ItemRegistry.get('pickaxe'), count:1 },
    { ...ItemRegistry.get('axe'), count:1 },
    { ...ItemRegistry.get('hand'), count:1 },
    { ...ItemRegistry.get('turnip_seeds'), count:10 },
    { ...ItemRegistry.get('potato_seeds'), count:5 },
    { ...ItemRegistry.get('carrot_seeds'), count:8 },
  ];
}
