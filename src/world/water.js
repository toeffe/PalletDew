import * as THREE from 'three';
import { TILE, RADIUS } from '../core/constants.js';
import { scene } from '../engine/renderer.js';

export const waterMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: {
    uTime: { value: 0 },
    uColorDeep: { value: new THREE.Color(0x156a7a) },
    uColorShallow: { value: new THREE.Color(0x3da8b8) }
  },
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv; varying float vWave;
    void main(){
      vUv = uv;
      vec3 pos = position;
      float w1 = sin(pos.x*0.28 + uTime*0.55)*0.11;
      float w2 = sin(pos.z*0.34 + uTime*0.42)*0.09;
      float w3 = sin((pos.x+pos.z)*0.18 + uTime*0.7)*0.05;
      float wave = w1 + w2 + w3;
      pos.y += wave;
      vWave = wave;
      gl_Position = projectionMatrix*modelViewMatrix*vec4(pos,1.0);
    }`,
  fragmentShader: `
    uniform vec3 uColorDeep; uniform vec3 uColorShallow; uniform float uTime;
    varying vec2 vUv; varying float vWave;
    void main(){
      float fres = smoothstep(-0.12, 0.18, vWave);
      vec3 col = mix(uColorDeep, uColorShallow, fres);
      float sparkle = pow(max(0.0, sin(vUv.x*40.0 + uTime*0.8) * sin(vUv.y*38.0 - uTime*0.6)), 18.0);
      col += sparkle * 0.18;
      float alpha = 0.72 + fres * 0.12;
      gl_FragColor = vec4(col, alpha);
    }`
});

const waterSize = (RADIUS*2)*TILE;
const waterGeo = new THREE.PlaneGeometry(waterSize, waterSize, 80, 80);
waterGeo.rotateX(-Math.PI/2);
export const waterMesh = new THREE.Mesh(waterGeo, waterMat);
waterMesh.position.y = 0.02;
scene.add(waterMesh);
