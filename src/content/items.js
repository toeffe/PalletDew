import { defineItem } from '../core/registry.js';

export function registerItems(){
  // Tools — medium, one per slot
  defineItem({ id:'hoe', name:'Hoe', icon:'⛏️', type:'tool', size:'medium', useAction:'till' });
  defineItem({ id:'watering_can', name:'Watering Can', icon:'🚿', type:'tool', size:'medium', useAction:'water' });
  defineItem({ id:'pickaxe', name:'Pickaxe', icon:'🔨', type:'tool', size:'medium', useAction:'clear' });
  defineItem({ id:'axe', name:'Axe', icon:'🪓', type:'tool', size:'medium' });
  defineItem({ id:'hand', name:'Hand', icon:'👋', type:'tool', size:'medium', useAction:'harvest' });

  // Seeds — small
  defineItem({ id:'turnip_seeds', name:'Turnip Seeds', icon:'🌱', type:'seed', size:'small', maxInventoryStack:64, maxPalletStack:64, useAction:'plant_turnip' });
  defineItem({ id:'potato_seeds', name:'Potato Seeds', icon:'🥔', type:'seed', size:'small', maxInventoryStack:64, maxPalletStack:64, useAction:'plant_potato' });
  defineItem({ id:'carrot_seeds', name:'Carrot Seeds', icon:'🥕', type:'seed', size:'small', maxInventoryStack:64, maxPalletStack:64, useAction:'plant_carrot' });
  defineItem({ id:'pumpkin_seeds', name:'Pumpkin Seeds', icon:'🎃', type:'seed', size:'small', maxInventoryStack:64, maxPalletStack:64, useAction:'plant_pumpkin' });
  defineItem({ id:'flower_seeds', name:'Flower Seeds', icon:'🌼', type:'seed', size:'small', maxInventoryStack:64, maxPalletStack:64 });

  // Materials — small
  defineItem({ id:'wood', name:'Wood', icon:'🪵', type:'material', size:'small', maxInventoryStack:999, maxPalletStack:999 });
  defineItem({ id:'stone', name:'Stone', icon:'🪨', type:'material', size:'small', maxInventoryStack:999, maxPalletStack:999 });
  defineItem({ id:'fiber', name:'Fiber', icon:'🌾', type:'material', size:'small', maxInventoryStack:999, maxPalletStack:999 });

  // Placeables — medium
  defineItem({ id:'chest_item', name:'Chest', icon:'📦', type:'placeable', size:'medium', useAction:'place_chest' });
  defineItem({ id:'scarecrow_item', name:'Scarecrow', icon:'🧑‍🌾', type:'placeable', size:'medium', useAction:'place_scarecrow' });
  defineItem({ id:'lamp_item', name:'Lamp Post', icon:'💡', type:'placeable', size:'medium', useAction:'place_lamp' });

  // Logistics demo
  defineItem({
    id:'fertilizer_bucket', name:'Fertilizer Bucket', icon:'🪣', type:'misc',
    size:'medium', maxInventoryStack:1, maxPalletStack:16, canCarryByHand:true,
  });
  defineItem({
    id:'seed_bag', name:'Bags of Seed', icon:'🎒', type:'misc',
    size:'medium', maxInventoryStack:1, maxPalletStack:9, canCarryByHand:true,
  });

  // Pallet — large
  defineItem({
    id:'pallet_item', name:'Pallet', icon:'▦', type:'placeable',
    size:'large', maxInventoryStack:0, maxPalletStack:1, requiresPallet:false, canCarryByHand:true,
  });

  // Power
  defineItem({
    id:'solar_panel_item', name:'Solar Panel', icon:'☀️', type:'placeable',
    size:'medium', useAction:'place_solar_panel',
  });
  defineItem({
    id:'battery_item', name:'Battery Bank', icon:'🔋', type:'placeable',
    size:'medium', useAction:'place_battery',
  });
  defineItem({
    id:'cable_item', name:'Power Cable', icon:'🔌', type:'material',
    size:'small', maxInventoryStack:64, maxPalletStack:64,
  });
  defineItem({
    id:'charge_dock_item', name:'Charge Dock', icon:'⚡', type:'placeable',
    size:'medium', useAction:'place_charge_dock',
  });
}
