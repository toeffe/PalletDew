import { defineItem } from '../core/registry.js';

export function registerItems(){
  defineItem({ id:'hoe', name:'Hoe', icon:'⛏️', type:'tool', useAction:'till' });
  defineItem({ id:'watering_can', name:'Watering Can', icon:'🚿', type:'tool', useAction:'water' });
  defineItem({ id:'pickaxe', name:'Pickaxe', icon:'🔨', type:'tool', useAction:'clear' });
  defineItem({ id:'axe', name:'Axe', icon:'🪓', type:'tool' });
  defineItem({ id:'hand', name:'Hand', icon:'👋', type:'tool', useAction:'harvest' });
  defineItem({ id:'turnip_seeds', name:'Turnip Seeds', icon:'🌱', type:'seed', useAction:'plant_turnip' });
  defineItem({ id:'potato_seeds', name:'Potato Seeds', icon:'🥔', type:'seed', useAction:'plant_potato' });
  defineItem({ id:'carrot_seeds', name:'Carrot Seeds', icon:'🥕', type:'seed', useAction:'plant_carrot' });
  defineItem({ id:'pumpkin_seeds', name:'Pumpkin Seeds', icon:'🎃', type:'seed', useAction:'plant_pumpkin' });
  defineItem({ id:'wood', name:'Wood', icon:'🪵', type:'material', maxStack:999 });
  defineItem({ id:'stone', name:'Stone', icon:'🪨', type:'material', maxStack:999 });
  defineItem({ id:'fiber', name:'Fiber', icon:'🌾', type:'material', maxStack:999 });
  defineItem({ id:'chest_item', name:'Chest', icon:'📦', type:'placeable', useAction:'place_chest' });
  defineItem({ id:'scarecrow_item', name:'Scarecrow', icon:'🧑‍🌾', type:'placeable', useAction:'place_scarecrow' });
  defineItem({ id:'lamp_item', name:'Lamp Post', icon:'💡', type:'placeable', useAction:'place_lamp' });
}
