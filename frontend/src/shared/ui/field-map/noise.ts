/** Small deterministic 3D value noise + fBm, enough for drifting contour fields. */

function hash(x: number, y: number, z: number): number {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const zf = smooth(z - zi);
  const c000 = hash(xi, yi, zi);
  const c100 = hash(xi + 1, yi, zi);
  const c010 = hash(xi, yi + 1, zi);
  const c110 = hash(xi + 1, yi + 1, zi);
  const c001 = hash(xi, yi, zi + 1);
  const c101 = hash(xi + 1, yi, zi + 1);
  const c011 = hash(xi, yi + 1, zi + 1);
  const c111 = hash(xi + 1, yi + 1, zi + 1);
  return lerp(
    lerp(lerp(c000, c100, xf), lerp(c010, c110, xf), yf),
    lerp(lerp(c001, c101, xf), lerp(c011, c111, xf), yf),
    zf,
  );
}

export function fbm(x: number, y: number, z: number): number {
  return noise3(x, y, z) * 0.62 + noise3(x * 2.03, y * 2.03, z * 1.7 + 11.3) * 0.28 + noise3(x * 4.1, y * 4.1, z * 1.3 + 3.1) * 0.1;
}
