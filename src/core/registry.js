export class Registry {
  constructor(){ this._map = new Map(); }
  register(id, def){ this._map.set(id, def); return def; }
  get(id){ return this._map.get(id); }
  has(id){ return this._map.has(id); }
  values(){ return Array.from(this._map.values()); }
}

export const ItemRegistry = new Registry();
export function defineItem({ id, name, icon, maxStack=99, type='misc', tags=[], useAction=null }){
  return ItemRegistry.register(id, { id, name, icon, maxStack, type, tags, useAction });
}

export const ObjectRegistry = new Registry();
export function defineObject({ id, name, category='decor', buildMesh, collision=true, onInteract=null, onTick=null, onPlace=null }){
  return ObjectRegistry.register(id, { id, name, category, buildMesh, collision, onInteract, onTick, onPlace });
}

export const ActionRegistry = new Registry();
export function defineAction({ id, name, canUse, onUse }){
  return ActionRegistry.register(id, { id, name, canUse, onUse });
}

export const CropRegistry = new Registry();
export function defineCrop({ id, name, stages, sellPrice, meshColor, seasons=['spring','summer','fall'] }){
  return CropRegistry.register(id, { id, name, stages, sellPrice, meshColor, seasons });
}

export const RecipeRegistry = new Registry();
export function defineRecipe({ id, name, icon, resultItem, cost }){
  return RecipeRegistry.register(id, { id, name, icon, resultItem, cost });
}
