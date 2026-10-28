// Adapted from sebayaki/roadster (MIT). See /licenses/rdstr.txt.
import * as THREE from "three";
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Quality = "high" | "low";

/**
 * Procedural textures for the venue. Everything is generated from a seeded
 * PRNG into DataTextures, so the look is identical on every load and no
 * network request is needed. Being deterministic, each texture is generated
 * once (per quality) and shared by every scenery for the rest of the page's
 * life: never dispose one (scenery disposal skips them, see `isSharedTexture`).
 */

/** Color, roughness and normal maps of one tiling surface. */
export interface SurfaceTextures {
  map: THREE.DataTexture;
  roughnessMap: THREE.DataTexture;
  /** Omitted on the low quality tier. */
  normalMap: THREE.DataTexture | null;
}

const cache = new Map<string, unknown>();
const sharedTextures = new WeakSet<THREE.Texture>();

/** The value cached under `key`, created on first use. */
function shared<T>(key: string, create: () => T): T {
  if (!cache.has(key)) cache.set(key, create());
  return cache.get(key) as T;
}

/** True for the textures made here, which outlive any one scenery. */
export function isSharedTexture(texture: THREE.Texture): boolean {
  return sharedTextures.has(texture);
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

/**
 * Tileable fractal value noise in [0, 1] on a size×size grid.
 * Each octave is [cells across the tile, weight]; cell counts must divide evenly into a tile to wrap.
 */
function fbm(
  size: number,
  rand: () => number,
  octaves: ReadonlyArray<readonly [number, number]>
): Float32Array {
  const out = new Float32Array(size * size);
  let total = 0;
  for (const [period, weight] of octaves) {
    total += weight;
    const grid = new Float32Array(period * period);
    for (let i = 0; i < grid.length; i++) grid[i] = rand();
    const scale = period / size;
    for (let y = 0; y < size; y++) {
      const fy = y * scale;
      const iy = Math.floor(fy);
      const ty = smooth(fy - iy);
      const row0 = (iy % period) * period;
      const row1 = ((iy + 1) % period) * period;
      for (let x = 0; x < size; x++) {
        const fx = x * scale;
        const ix = Math.floor(fx);
        const tx = smooth(fx - ix);
        const x0 = ix % period;
        const x1 = (ix + 1) % period;
        const a = grid[row0 + x0];
        const b = grid[row0 + x1];
        const c = grid[row1 + x0];
        const d = grid[row1 + x1];
        out[y * size + x] +=
          weight *
          (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
      }
    }
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** Tangent-space normal map (OpenGL convention) from a wrapping height field. */
function normalsFromHeight(
  height: Float32Array,
  size: number,
  strength: number
): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const up = ((y + size - 1) % size) * size;
    const down = ((y + 1) % size) * size;
    const row = y * size;
    for (let x = 0; x < size; x++) {
      const left = (x + size - 1) % size;
      const right = (x + 1) % size;
      const nx = (height[row + left] - height[row + right]) * strength;
      const ny = (height[up + x] - height[down + x]) * strength;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const i = (row + x) * 4;
      data[i] = (nx * inv * 0.5 + 0.5) * 255;
      data[i + 1] = (ny * inv * 0.5 + 0.5) * 255;
      data[i + 2] = (inv * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  return data;
}

function makeTexture(
  data: Uint8Array,
  width: number,
  height: number,
  opts: { srgb?: boolean; repeat?: boolean; mipmaps?: boolean; aniso?: number }
): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  tex.colorSpace = opts.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  const wrap = opts.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.wrapS = wrap;
  tex.wrapT = wrap;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter =
    opts.mipmaps === false
      ? THREE.LinearFilter
      : THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = opts.mipmaps !== false;
  tex.anisotropy = opts.aniso ?? 1;
  tex.needsUpdate = true;
  sharedTextures.add(tex);
  return tex;
}

/** The repeating maps of one size×size surface tile (normals: high tier only). */
function surfaceTextures(
  size: number,
  color: Uint8Array,
  rough: Uint8Array,
  normals: Uint8Array | null,
  aniso: number
): SurfaceTextures {
  const tiling = { repeat: true, aniso };
  return {
    map: makeTexture(color, size, size, { ...tiling, srgb: true }),
    roughnessMap: makeTexture(rough, size, size, tiling),
    normalMap: normals ? makeTexture(normals, size, size, tiling) : null,
  };
}

/** Writes a single channel value (0..1) into R, G and B (A = 255). */
function grayPixel(data: Uint8Array, i: number, v: number): void {
  const b = v <= 0 ? 0 : v >= 1 ? 255 : v * 255;
  data[i] = b;
  data[i + 1] = b;
  data[i + 2] = b;
  data[i + 3] = 255;
}

/** World size (m) covered by one asphalt texture tile. */
export const ASPHALT_TILE = 7;

/**
 * Dark asphalt with aggregate grain and patchy wear. The color map is a light
 * modulation (average ≈ 0.6) meant to be multiplied by a dark material color.
 * Shared: generated once per quality.
 */
export function createAsphaltTextures(quality: Quality): SurfaceTextures {
  return shared(`asphalt-${quality}`, () => asphaltTextures(quality));
}

function asphaltTextures(quality: Quality): SurfaceTextures {
  const high = quality === "high";
  const size = high ? 1024 : 512;
  const rand = mulberry32(0xa5f417);
  const fine = size / 4;
  const macro = fbm(size, rand, [
    [4, 0.45],
    [8, 0.3],
    [16, 0.25],
  ]);
  const grainField = fbm(size, rand, [
    [fine / 4, 0.35],
    [fine / 2, 0.35],
    [fine, 0.3],
  ]);
  const height = new Float32Array(size * size);
  const stone = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) {
    height[i] = grainField[i] * 0.8 + rand() * 0.25;
  }
  // Aggregate: small bright / dark chips pressed into the binder.
  const chips = Math.floor((size * size) / 55);
  const radiusScale = size / 1024;
  for (let c = 0; c < chips; c++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = (0.7 + rand() * rand() * 2.6) * Math.max(0.6, radiusScale * 1.6);
    const tone = rand() < 0.7 ? 0.35 + rand() * 0.65 : -0.4 - rand() * 0.3;
    const r2 = r * r;
    const ext = Math.ceil(r);
    for (let dy = -ext; dy <= ext; dy++) {
      for (let dx = -ext; dx <= ext; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const x = (Math.floor(cx) + dx + size) % size;
        const y = (Math.floor(cy) + dy + size) % size;
        const i = y * size + x;
        const f = 1 - d2 / (r2 + 0.5);
        stone[i] = Math.max(stone[i], tone * f);
        height[i] += 0.35 * f;
      }
    }
  }

  const color = new Uint8Array(size * size * 4);
  const rough = new Uint8Array(size * size * 4);
  for (let i = 0; i < height.length; i++) {
    const m = macro[i];
    const wear = smooth(Math.min(1, Math.max(0, (m - 0.35) * 2.2)));
    let v = 0.7 + (grainField[i] - 0.5) * 0.3 + (rand() - 0.5) * 0.1;
    v += stone[i] * 0.3;
    v *= 0.84 + wear * 0.24;
    const p = i * 4;
    const b = Math.min(1, Math.max(0, v));
    color[p] = b * 246;
    color[p + 1] = b * 248;
    color[p + 2] = Math.min(255, b * 262);
    color[p + 3] = 255;
    // Worn binder is smoother (a faint sheen); chips are polished.
    const r =
      0.72 - wear * 0.14 - Math.max(0, stone[i]) * 0.12 + (rand() - 0.5) * 0.08;
    grayPixel(rough, p, r);
  }

  return surfaceTextures(
    size,
    color,
    rough,
    high ? normalsFromHeight(height, size, 2.2) : null,
    high ? 8 : 4
  );
}

