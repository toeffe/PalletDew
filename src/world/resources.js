import { scene } from '../engine/renderer.js';
import * as THREE from 'three';

export const resourceGroup = new THREE.Group();
scene.add(resourceGroup);

export const resourceObjects = [];
export const extraPlacedObjects = [];
