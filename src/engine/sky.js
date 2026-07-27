import * as THREE from 'three';
import { scene } from './renderer.js';

export const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    topColor: { value: new THREE.Color(0x4fa8e0) },
    bottomColor: { value: new THREE.Color(0xdfefff) },
    offset: { value: 20 },
    exponent: { value: 0.7 }
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main(){
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPosition = wp.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`,
  fragmentShader: `
    uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent;
    varying vec3 vWorldPosition;
    void main(){
      float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
      gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0), exponent), 0.0)), 1.0);
    }`,
  side: THREE.BackSide, fog:false
});

export const skyDome = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 16), skyMat);
scene.add(skyDome);

scene.fog = new THREE.FogExp2(0xbfe4ff, 0.0032);

const starGeo = new THREE.BufferGeometry();
const starCount = 800;
const starPos = new Float32Array(starCount*3);
for(let i=0;i<starCount;i++){
  const r = 480, theta = Math.random()*Math.PI*2, phi = Math.acos(Math.random()*0.85);
  starPos[i*3] = r*Math.sin(phi)*Math.cos(theta);
  starPos[i*3+1] = Math.abs(r*Math.cos(phi));
  starPos[i*3+2] = r*Math.sin(phi)*Math.sin(theta);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos,3));
export const starMat = new THREE.PointsMaterial({ color:0xffffff, size:1.6, transparent:true, opacity:0, fog:false });
export const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);
