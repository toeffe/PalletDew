export function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function hash2(x, y){
  const s = Math.sin(x*12.9898 + y*78.233) * 43758.5453123;
  return s - Math.floor(s);
}

export function noise2D(x, y){
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
  const a = hash2(xi,yi), b = hash2(xi+1,yi), c = hash2(xi,yi+1), d = hash2(xi+1,yi+1);
  return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v;
}

export function fbm(x, y, octaves=5){
  let amp=0.5, freq=1, sum=0, norm=0;
  for(let i=0;i<octaves;i++){
    sum += amp * noise2D(x*freq, y*freq);
    norm += amp; amp *= 0.52; freq *= 2.03;
  }
  return sum/norm;
}

export function smoothstep(edge0, edge1, x){
  const t = Math.min(1, Math.max(0, (x-edge0)/(edge1-edge0)));
  return t*t*(3-2*t);
}
