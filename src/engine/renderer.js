import * as THREE from 'three';

const container = document.getElementById('canvas-container');
export const scene = new THREE.Scene();

export const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 900);
camera.position.set(10, 14, 10);

export const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

export const hemiLight = new THREE.HemisphereLight(0xbfd9ff, 0x3a2e1e, 0.65);
scene.add(hemiLight);

export const sun = new THREE.DirectionalLight(0xfff2d9, 1.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -55; sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 320;
sun.shadow.bias = -0.0015;
scene.add(sun);
scene.add(sun.target);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
