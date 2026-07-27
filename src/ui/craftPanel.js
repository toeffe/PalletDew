import { RecipeRegistry, ItemRegistry } from '../core/registry.js';
import { GameState, log } from '../core/state.js';
import { addItem, countItem, removeItem, setCarried } from '../systems/inventory.js';
import { spawnGroundItem } from '../entities/GroundItem.js';
import { Player } from '../entities/player.js';
import { updateUI } from './hud.js';

export function renderCraftPanel(){
  const list = document.getElementById('craft-list');
  list.innerHTML = '';
  RecipeRegistry.values().forEach(r=>{
    const canAfford = Object.entries(r.cost).every(([mat,n]) => countItem(mat) >= n);
    const costStr = Object.entries(r.cost).map(([m,n])=>`${n} ${m}`).join(', ');
    const row = document.createElement('div');
    row.className = 'recipe-row';
    row.innerHTML = `<span>${r.icon} ${r.name}<br><small style="color:#a08b6d;">${costStr}</small></span>`;
    const btn = document.createElement('button');
    btn.className = 'recipe-btn'; btn.textContent = 'Craft'; btn.disabled = !canAfford;
    btn.onclick = () => {
      for(const [mat,n] of Object.entries(r.cost)){
        if(!removeItem(mat, n)) return;
      }
      const def = ItemRegistry.get(r.resultItem);
      if(def?.size === 'large'){
        if(GameState.carried){
          const wx = Player.x + Math.sin(Player.facing) * 1.5;
          const wz = Player.z + Math.cos(Player.facing) * 1.5;
          spawnGroundItem(wx, wz, r.resultItem, 1);
          log(`Crafted ${r.name} (dropped nearby — hands full).`);
        } else {
          setCarried(r.resultItem, 1);
          log(`Crafted ${r.name} (carrying).`);
        }
      } else {
        addItem(r.resultItem, 1);
        log(`Crafted ${r.name}.`);
      }
      updateUI();
    };
    row.appendChild(btn);
    list.appendChild(row);
  });
}

export function initCraftPanel(){
  // Craft toggle is owned by the ESC menu (ui/menu.js)
}
