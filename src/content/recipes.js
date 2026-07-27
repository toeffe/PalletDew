import { defineRecipe } from '../core/registry.js';

export function registerRecipes(){
  defineRecipe({ id:'r_chest', name:'Chest', icon:'📦', resultItem:'chest_item', cost:{wood:50} });
  defineRecipe({ id:'r_scarecrow', name:'Scarecrow', icon:'🧑‍🌾', resultItem:'scarecrow_item', cost:{wood:50, fiber:20} });
  defineRecipe({ id:'r_lamp', name:'Lamp Post', icon:'💡', resultItem:'lamp_item', cost:{wood:30, stone:20} });
  defineRecipe({ id:'r_solar', name:'Solar Panel', icon:'☀️', resultItem:'solar_panel_item', cost:{wood:20, stone:40} });
  defineRecipe({ id:'r_battery', name:'Battery Bank', icon:'🔋', resultItem:'battery_item', cost:{stone:30, fiber:20} });
  defineRecipe({ id:'r_cable', name:'Power Cable', icon:'🔌', resultItem:'cable_item', cost:{fiber:5} });
  defineRecipe({ id:'r_dock', name:'Charge Dock', icon:'⚡', resultItem:'charge_dock_item', cost:{wood:15, stone:25} });
  defineRecipe({ id:'r_pallet', name:'Pallet', icon:'▦', resultItem:'pallet_item', cost:{wood:25} });
  defineRecipe({ id:'r_fert', name:'Fertilizer Bucket', icon:'🪣', resultItem:'fertilizer_bucket', cost:{fiber:10, stone:5} });
}
