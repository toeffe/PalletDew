import { registerItems } from './items.js';
import { registerCrops } from './crops.js';
import { registerObjects } from './objects.js';
import { registerActions } from './actions.js';
import { registerRecipes } from './recipes.js';

export function registerAllContent(){
  registerItems();
  registerCrops();
  registerObjects();
  registerActions();
  registerRecipes();
}
