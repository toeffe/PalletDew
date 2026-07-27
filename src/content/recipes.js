import { defineRecipe } from '../core/registry.js';

export function registerRecipes(){
  defineRecipe({ id:'r_chest', name:'Chest', icon:'📦', resultItem:'chest_item', cost:{wood:50} });
  defineRecipe({ id:'r_scarecrow', name:'Scarecrow', icon:'🧑‍🌾', resultItem:'scarecrow_item', cost:{wood:50, fiber:20} });
  defineRecipe({ id:'r_lamp', name:'Lamp Post', icon:'💡', resultItem:'lamp_item', cost:{wood:30, stone:20} });
}
