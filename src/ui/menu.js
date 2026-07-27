import { SAVE_KEY } from '../core/constants.js';
import { saveGame } from '../core/save.js';

let open = false;
let helpOpen = false;

export function isMenuOpen(){ return open; }

export function setMenuOpen(value){
  open = !!value;
  const el = document.getElementById('esc-menu');
  if(!el) return;
  el.classList.toggle('open', open);
  if(!open){
    helpOpen = false;
    const help = document.getElementById('help-panel');
    if(help) help.hidden = true;
    const helpBtn = document.getElementById('btn-help');
    if(helpBtn) helpBtn.setAttribute('aria-expanded', 'false');
  }
  document.body.classList.toggle('menu-open', open);
}

export function toggleMenu(){
  setMenuOpen(!open);
}

export function initMenu(){
  const helpBtn = document.getElementById('btn-help');
  const help = document.getElementById('help-panel');
  const craftPanel = document.getElementById('craft-panel');

  document.getElementById('btn-save').onclick = () => {
    saveGame(false);
  };

  document.getElementById('btn-craft').onclick = () => {
    setMenuOpen(false);
    craftPanel.style.display = craftPanel.style.display === 'block' ? 'none' : 'block';
  };

  document.getElementById('btn-new').onclick = () => {
    if(confirm('Start a brand new island? Your current save will be erased.')){
      try { localStorage.removeItem(SAVE_KEY); } catch(e){}
      location.reload();
    }
  };

  helpBtn.onclick = () => {
    helpOpen = !helpOpen;
    help.hidden = !helpOpen;
    helpBtn.setAttribute('aria-expanded', helpOpen ? 'true' : 'false');
  };

  document.getElementById('esc-backdrop').onclick = () => setMenuOpen(false);
  document.getElementById('btn-resume').onclick = () => setMenuOpen(false);
}
