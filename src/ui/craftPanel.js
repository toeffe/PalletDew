import { RecipeRegistry } from '../core/registry.js';
import { GameState, log } from '../core/state.js';
import { addItem, consumeIfEmpty } from '../systems/inventory.js';

export function renderCraftPanel(){
  const list = document.getElementById('craft-list');
  list.innerHTML = '';
  RecipeRegistry.values().forEach(r=>{
    const canAfford = Object.entries(r.cost).every(([mat,n]) => {
      const stack = GameState.inventory.find(i=>i.id===mat);
      return stack && stack.count>=n;
    });
    const costStr = Object.entries(r.cost).map(([m,n])=>`${n} ${m}`).join(', ');
    const row = document.createElement('div');
    row.className = 'recipe-row';
    row.innerHTML = `<span>${r.icon} ${r.name}<br><small style="color:#a08b6d;">${costStr}</small></span>`;
    const btn = document.createElement('button');
    btn.className = 'recipe-btn'; btn.textContent = 'Craft'; btn.disabled = !canAfford;
    btn.onclick = () => {
      Object.entries(r.cost).forEach(([mat,n])=>{
        const stack = GameState.inventory.find(i=>i.id===mat);
        stack.count -= n; consumeIfEmpty(stack);
      });
      addItem(r.resultItem, 1);
      log(`Crafted ${r.name}.`);
    };
    row.appendChild(btn);
    list.appendChild(row);
  });
}

export function initCraftPanel(){
  // Craft toggle is owned by the ESC menu (ui/menu.js)
}
