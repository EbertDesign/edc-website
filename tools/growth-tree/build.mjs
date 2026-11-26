/**
 * Bakes the growth map `Media/GrowthTree` reveals: one tree, composited from
 * two public-domain silhouettes, with every inked pixel carrying the moment
 * in the tree's growth at which it appears.
 *
 *   node tools/growth-tree/build.mjs
 *
 * The crown and trunk are `crown.svg`; the roots are the lower part of
 * `roots.svg`, scaled until its collar is as wide as the crown's trunk and
 * joined under it. Sources and licence are in the README beside this file.
 *
 * Growth is distance travelled *through the tree* from the collar — out
 * along the limbs, not as the crow flies — so a twig appears after the
 * branch that carries it. It travels fastest down the middle of a thick
 * limb, so the main structure runs ahead and the fine ends fill in. Above and below ground are each measured against
 * their own furthest reach, so the roots finish as the crown does.
 *
 * The output is a lossless WebP: alpha is the ink, and red and green together hold
 * the growth as a number from 0 to `LEVELS - 1` (red the high byte).
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  /** Pixels per unit of the layout below. `1` bakes a 960 x 1660 map. */
  scale: 1.2,
  /** The layout, in the units the two silhouettes were measured in: the
      crown drawn 1000 tall, the roots image drawn `rootsHeight` tall. */
  width: 960,
  height: 1660,
  crown: { height: 1000, x: 0, y: 0 },
  roots: {
    /* Smaller roots leave more of the picture to the crown. At 1300 the
       collar is a little narrower than the trunk and hides under it. */
    height: 1300,
    x: 173,
    y: 429,
    /** Rows of the roots image above this are its own tree, and dropped. */
    from: 543,
  },
  /** Where the growth starts: the middle of the collar. */
  seed: { x: 501, y: 992 },
  /** The ground: growth above and below it is normalised separately. */
  ground: 992,
  /** How dark a pixel must be to count as ink, 0 to 255. Higher keeps
      more of the finest twigs and root hairs. */
  threshold: 150,
  /** How much slower growth runs through the thinnest twig than down the
      middle of a thick limb. `0` spreads evenly, like a ripple; higher
      sends the main limbs ahead and lets the fine ends fill in behind
      them. `limb` is the half-width, in layout units, counted as thick. */
  twigDrag: 5,
  limb: 9,
  /** What crossing a gap costs against a step through ink. Specks the
      tracing left unattached still join in, a little late. */
  gapCost: 10,
  /** Share of the furthest pixels allowed to arrive together at the end,
      so one stray twig does not stretch the whole clock. */
  trim: 0.004,
  /** Bends the clock: above 1 holds the early growth back, so the trunk
      and first limbs take longer to appear and the fine ends come faster. */
  curve: 1,
  levels: 1024,
  output: path.join(here, "../../public/images/growth-tree.webp"),
};

const W = Math.round(CONFIG.width * CONFIG.scale);
const H = Math.round(CONFIG.height * CONFIG.scale);

async function ink(file, height) {
  const { data, info } = await sharp(path.join(here, file), {
    limitInputPixels: false,
    unlimited: true,
  })
    .resize({ height: Math.round(height * CONFIG.scale) })
    .flatten({ background: "#fff" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

const mask = new Uint8Array(W * H);

function stamp(image, x, y, fromRow = 0) {
  const ox = Math.round(x * CONFIG.scale);
  const oy = Math.round(y * CONFIG.scale);
  for (let iy = Math.round(fromRow * CONFIG.scale); iy < image.height; iy++) {
    const ty = iy + oy;
    if (ty < 0 || ty >= H) continue;
    for (let ix = 0; ix < image.width; ix++) {
      const tx = ix + ox;
      if (tx < 0 || tx >= W) continue;
      if (image.data[iy * image.width + ix] < CONFIG.threshold) {
        mask[ty * W + tx] = 1;
      }
    }
  }
}

stamp(await ink("crown.svg", CONFIG.crown.height), CONFIG.crown.x, CONFIG.crown.y);
stamp(
  await ink("roots.svg", CONFIG.roots.height),
  CONFIG.roots.x,
  CONFIG.roots.y,
  CONFIG.roots.from,
);

/* How deep inside the ink each pixel sits: a two-pass chamfer distance to
   the nearest background pixel, which is the local half-width of whatever
   limb it is part of. */
const depth = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) depth[i] = mask[i] ? Infinity : 0;
const relax = (i, x, y, dx, dy, len) => {
  const nx = x + dx;
  const ny = y + dy;
  const other = nx < 0 || ny < 0 || nx >= W || ny >= H ? 0 : depth[ny * W + nx];
  if (other + len < depth[i]) depth[i] = other + len;
};
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!depth[i]) continue;
    relax(i, x, y, -1, 0, 1);
    relax(i, x, y, 0, -1, 1);
    relax(i, x, y, -1, -1, Math.SQRT2);
    relax(i, x, y, 1, -1, Math.SQRT2);
  }
}
for (let y = H - 1; y >= 0; y--) {
  for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x;
    if (!depth[i]) continue;
    relax(i, x, y, 1, 0, 1);
    relax(i, x, y, 0, 1, 1);
    relax(i, x, y, 1, 1, Math.SQRT2);
    relax(i, x, y, -1, 1, Math.SQRT2);
  }
}

/* What a step into each pixel costs: least down the middle of a limb. */
const limb = CONFIG.limb * CONFIG.scale;
const cost = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
  cost[i] = mask[i]
    ? 1 + CONFIG.twigDrag * (1 - Math.min(1, depth[i] / limb)) ** 2
    : CONFIG.gapCost * (1 + CONFIG.twigDrag);
}

/* Dijkstra from the collar over the whole grid, cheap through ink and dear
   across gaps. A binary heap of cell indices keyed by distance, in typed
   arrays so two million cells take seconds. */
/* Distances are doubles throughout: kept as floats, a sum compared with
   its own rounded copy reads as an improvement and is queued for ever. */
const dist = new Float64Array(W * H).fill(Infinity);
let heapKeys = new Float64Array(1 << 22);
let heapCells = new Uint32Array(1 << 22);
let heapSize = 0;
const push = (cell, d) => {
  if (heapSize === heapKeys.length) {
    const keys = new Float64Array(heapSize * 2);
    const cells = new Uint32Array(heapSize * 2);
    keys.set(heapKeys);
    cells.set(heapCells);
    heapKeys = keys;
    heapCells = cells;
  }
  let i = heapSize++;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (heapKeys[parent] <= d) break;
    heapKeys[i] = heapKeys[parent];
    heapCells[i] = heapCells[parent];
    i = parent;
  }
  heapKeys[i] = d;
  heapCells[i] = cell;
};
const pop = () => {
  const cell = heapCells[0];
  const d = heapKeys[--heapSize];
  const moved = heapCells[heapSize];
  let i = 0;
  for (;;) {
    let child = i * 2 + 1;
    if (child >= heapSize) break;
    if (child + 1 < heapSize && heapKeys[child + 1] < heapKeys[child]) child++;
    if (heapKeys[child] >= d) break;
    heapKeys[i] = heapKeys[child];
    heapCells[i] = heapCells[child];
    i = child;
  }
  heapKeys[i] = d;
  heapCells[i] = moved;
  return cell;
};

const seed =
  Math.round(CONFIG.seed.y * CONFIG.scale) * W +
  Math.round(CONFIG.seed.x * CONFIG.scale);
dist[seed] = 0;
push(seed, 0);

const STEP_X = [1, -1, 0, 0, 1, 1, -1, -1];
const STEP_Y = [0, 0, 1, -1, 1, -1, 1, -1];
const STEP_LENGTH = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];

while (heapSize) {
  const d = heapKeys[0];
  const cell = pop();
  if (d > dist[cell]) continue;
  const x = cell % W;
  const y = (cell - x) / W;
  for (let k = 0; k < 8; k++) {
    const nx = x + STEP_X[k];
    const ny = y + STEP_Y[k];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const next = ny * W + nx;
    const nd = d + STEP_LENGTH[k] * cost[next];
    if (nd < dist[next]) {
      dist[next] = nd;
      push(next, nd);
    }
  }
}

/* Each side of the ground against its own reach. */
const ground = Math.round(CONFIG.ground * CONFIG.scale);
const reach = [0, 1].map((below) => {
  const all = [];
  for (let y = 0; y < H; y++) {
    if ((y >= ground ? 1 : 0) !== below) continue;
    for (let x = 0; x < W; x++) {
      if (mask[y * W + x]) all.push(dist[y * W + x]);
    }
  }
  all.sort((a, b) => a - b);
  return all[Math.floor(all.length * (1 - CONFIG.trim))] || 1;
});

const out = Buffer.alloc(W * H * 4);
let inked = 0;
for (let cell = 0; cell < W * H; cell++) {
  if (!mask[cell]) continue;
  inked++;
  const below = cell >= ground * W ? 1 : 0;
  const growth = Math.min(1, dist[cell] / reach[below]) ** CONFIG.curve;
  const level = Math.min(CONFIG.levels - 1, Math.floor(growth * CONFIG.levels));
  out[cell * 4] = level >> 8;
  out[cell * 4 + 1] = level & 255;
  out[cell * 4 + 3] = 255;
}

/* Lossless and unquantised: the bytes are numbers, not colours. */
await sharp(out, { raw: { width: W, height: H, channels: 4 } })
  .webp({ lossless: true, exact: true, effort: 6 })
  .toFile(CONFIG.output);

const check = await sharp(CONFIG.output).raw().toBuffer();
if (Buffer.compare(check, out) !== 0) {
  throw new Error("The map did not survive encoding: its bytes changed.");
}

console.log(
  `${path.relative(process.cwd(), CONFIG.output)}  ${W}x${H}  ` +
    `${Math.round((inked / (W * H)) * 100)}% ink  reach ${reach.map(Math.round).join(" / ")}`,
);
