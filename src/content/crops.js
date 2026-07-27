import { defineCrop } from '../core/registry.js';

export function registerCrops(){
  defineCrop({ id:'turnip', name:'Turnip', stages:3, sellPrice:15, meshColor:0xe74c3c, seasons:['spring','summer'] });
  defineCrop({ id:'potato', name:'Potato', stages:4, sellPrice:25, meshColor:0xd4a373, seasons:['spring','summer','fall'] });
  defineCrop({ id:'carrot', name:'Carrot', stages:3, sellPrice:20, meshColor:0xf39c12, seasons:['spring','fall'] });
  defineCrop({ id:'pumpkin', name:'Pumpkin', stages:5, sellPrice:80, meshColor:0xe67e22, seasons:['fall'] });
}
