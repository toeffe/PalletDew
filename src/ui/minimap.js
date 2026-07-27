import { RADIUS, TILE } from '../core/constants.js';
import {
  heightAtTile, moistureAtTile, classifyBiome, BIOME_COLORS
} from '../world/terrain.js';
import { Player } from '../entities/player.js';

let minimapCanvas, minimapCtx, minimapImg;

function minimapSize(){
  if(!minimapCanvas) return 160;
  const rect = minimapCanvas.getBoundingClientRect();
  return Math.max(1, Math.round(rect.width));
}

function syncCanvasBuffer(){
  const css = minimapSize();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const buf = Math.round(css * dpr);
  if(minimapCanvas.width !== buf || minimapCanvas.height !== buf){
    minimapCanvas.width = buf;
    minimapCanvas.height = buf;
  }
  return { css, buf };
}

export function buildMinimap(){
  minimapCanvas = document.getElementById('minimap');
  minimapCtx = minimapCanvas.getContext('2d');
  const res = 160;
  const off = document.createElement('canvas'); off.width = res; off.height = res;
  const octx = off.getContext('2d');
  const img = octx.createImageData(res,res);
  for(let iy=0; iy<res; iy++){
    for(let ix=0; ix<res; ix++){
      const tx = (ix/res - 0.5)*RADIUS*2, tz = (iy/res - 0.5)*RADIUS*2;
      const h = heightAtTile(tx,tz), m = moistureAtTile(tx,tz);
      const biome = classifyBiome(h,m);
      const c = BIOME_COLORS[biome];
      const p = (iy*res+ix)*4;
      img.data[p]=c.r*255; img.data[p+1]=c.g*255; img.data[p+2]=c.b*255; img.data[p+3]=255;
    }
  }
  octx.putImageData(img,0,0);
  minimapImg = off;
  syncCanvasBuffer();
}

export function updateMinimap(){
  if(!minimapImg || !minimapCtx) return;
  const { buf } = syncCanvasBuffer();
  const half = buf / 2;
  const dotR = Math.max(3, buf * 0.028);
  minimapCtx.imageSmoothingEnabled = false;
  minimapCtx.clearRect(0, 0, buf, buf);
  minimapCtx.drawImage(minimapImg, 0, 0, buf, buf);
  const px = half + (Player.x/TILE/RADIUS)*half;
  const py = half + (Player.z/TILE/RADIUS)*half;
  minimapCtx.fillStyle = '#ff3b3b';
  minimapCtx.beginPath(); minimapCtx.arc(px, py, dotR, 0, Math.PI*2); minimapCtx.fill();
  minimapCtx.strokeStyle = '#fff'; minimapCtx.lineWidth = Math.max(1, buf * 0.008); minimapCtx.stroke();
}
