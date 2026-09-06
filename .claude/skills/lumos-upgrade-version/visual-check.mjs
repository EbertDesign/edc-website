#!/usr/bin/env node
/**
 * Proves an upgrade changed nothing visible.
 *
 * Capture every route before the upgrade, capture them again after, and
 * compare. A framework upgrade should move markup and tokens around without
 * moving a single pixel; anything that does move is either a fix worth
 * knowing about or a regression worth stopping for.
 *
 * Captures with headless Chrome and compares with sharp — both already
 * present in an Astro project on a Mac, so the check adds no dependencies.
 *
 * Usage
 *   node visual-check.mjs capture before        # dev server must be running
 *   ... upgrade ...
 *   node visual-check.mjs capture after
 *   node visual-check.mjs compare
 */

import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, existsSync, readdirSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { promises as fs } from "node:fs";

const run = promisify(execFile);

const OUT = ".lumos-upgrade";
const BASE = process.env.LUMOS_BASE ?? "http://localhost:4321";
/* The viewport the page believes it is in. `vh` units resolve against this
   height, so it has to be realistic — a tall capture window makes a `100vh`
   hero 3200px tall and shifts everything under it. The full page is captured
   regardless, by scrolling the compositor rather than growing the viewport
   (see `captureBeyondViewport` below). */
const WIDTHS = [
  { name: "desktop", w: 1440, h: 900 },
  { name: "mobile", w: 390, h: 844 },
];
/* Antialiasing and font rasterisation wobble by a channel or two between
   runs. Anything under this is noise, not a change. */
const CHANNEL_TOLERANCE = 8;
/* Below this share of changed pixels a page is called unchanged. */
const PIXEL_THRESHOLD = 0.001; // 0.1%

const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => existsSync(p));

/** Every static route the site builds, so nothing is spot-checked by memory. */
function routes(dir = "src/pages", prefix = "") {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...routes(full, `${prefix}/${entry}`));
      continue;
    }
    if (!entry.endsWith(".astro")) continue;
    if (entry.startsWith("[") || entry.includes("[")) continue; // dynamic
    if (entry === "404.astro") continue;
    const name = entry.replace(/\.astro$/, "");
    found.push(name === "index" ? `${prefix}/` : `${prefix}/${name}`);
  }
  return found;
}

const slug = (route) => (route === "/" ? "index" : route.replace(/^\//, "").replace(/\//g, "-"));

/** Talk to a headless Chrome over the DevTools protocol. */
async function withBrowser(fn) {
  const profile = mkdtempSync(join(tmpdir(), "lumos-shot-"));
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--user-data-dir=${profile}`,
    "--remote-debugging-port=0",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  /* Chrome prints the debugging endpoint to stderr once it is listening. */
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => reject(new Error("Chrome did not start")), 30000);
    chrome.stderr.on("data", (d) => {
      buf += d;
      const m = buf.match(/ws:\/\/[^\s]+/);
      if (m) {
        clearTimeout(timer);
        resolve(m[0]);
      }
    });
    chrome.on("exit", () => {
      clearTimeout(timer);
      reject(new Error("Chrome exited before listening"));
    });
  });

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });

  let id = 0;
  const pending = new Map();
  const events = new Map();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method && events.has(msg.method)) {
      events.get(msg.method).forEach((f) => f(msg.params));
      events.delete(msg.method);
    }
  };
  const send = (method, params, sessionId) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params, sessionId }));
    });
  const once = (method) =>
    new Promise((resolve) => {
      if (!events.has(method)) events.set(method, []);
      events.get(method).push(resolve);
    });

  try {
    return await fn({ send, once });
  } finally {
    ws.close();
    /* Let Chrome finish writing its profile before the directory goes, or the
       unlink races the browser and throws ENOTEMPTY mid-run. */
    const exited = new Promise((r) => chrome.once("exit", r));
    chrome.kill();
    await Promise.race([exited, new Promise((r) => setTimeout(r, 5000))]);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
    } catch {
      /* A leftover temp profile is harmless; losing the run is not. */
    }
  }
}

async function capture(label) {
  if (!CHROME) {
    console.error("No Chrome/Chromium/Edge found. Install one, or capture by hand.");
    process.exit(1);
  }
  const dir = join(OUT, label);
  mkdirSync(dir, { recursive: true });

  const list = routes();
  console.log(`capturing ${list.length} route(s) × ${WIDTHS.length} width(s) from ${BASE}`);

  await withBrowser(async ({ send }) => {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const cmd = (m, p) => send(m, p, sessionId);

    await cmd("Page.enable");
    await cmd("Runtime.enable");
    await cmd("Network.enable");
    /* No HTTP cache: a stylesheet edited between two captures must not be
       served from disk, or the pages compare byte-identical and the tool
       reports a silent false "unchanged". */
    await cmd("Network.setCacheDisabled", { cacheDisabled: true });
    /* Animations off, so a shot never catches a fade mid-flight. */
    await cmd("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });

    for (const route of list) {
      for (const { name, w, h } of WIDTHS) {
        const file = join(dir, `${slug(route)}--${name}.png`);
        try {
          await cmd("Emulation.setDeviceMetricsOverride", {
            width: w,
            height: h,
            deviceScaleFactor: 1,
            mobile: false,
          });
          await cmd("Page.navigate", { url: `${BASE}${route}` });
          /* Wait for the network to settle, then for webfonts, then give the
             reveal observer a tick. `load` alone fires before either. */
          await cmd("Runtime.evaluate", {
            /* Wait for load, then force every lazy image to fetch and settle.
               `captureBeyondViewport` paints the whole page but does not
               trigger lazy loading for what was never scrolled into view, so
               below-the-fold images appear in one run and not the next — which
               reads as a real diff and is not one. Fonts last, then a tick for
               the reveal observer. */
            expression: `(async () => {
              if (document.readyState !== "complete") {
                await new Promise(r => addEventListener("load", r, { once: true }));
              }
              document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = "eager"; });
              await Promise.all([...document.images].map(i =>
                i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })
              ));
              await document.fonts.ready;
              await new Promise(r => setTimeout(r, 400));
            })()`,
            awaitPromise: true,
            timeout: 60000,
          });
          /* Re-assert the viewport after load. The override is applied
             before `Page.navigate`, but a page that finishes laying out very
             fast can be measured against the previous shot's width — a
             desktop capture then comes back with the mobile layout in it.
             Setting it again post-load forces a relayout at the right size. */
          await cmd("Emulation.setDeviceMetricsOverride", {
            width: w, height: h, deviceScaleFactor: 1, mobile: false,
          });
          await cmd("Runtime.evaluate", {
            expression: `new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 150))))`,
            awaitPromise: true,
          });
          const { data } = await cmd("Page.captureScreenshot", {
            format: "png",
            /* The whole scroll height, while the page still believes the
               viewport is `h` tall — so `vh` units stay honest. */
            captureBeyondViewport: true,
          });
          await fs.writeFile(file, Buffer.from(data, "base64"));
        } catch (e) {
          console.error(`  ${route} @${name}: capture failed — ${e.message}`);
          continue;
        }
        console.log(`  ${route} @${name} -> ${relative(process.cwd(), file)}`);
      }
    }
  });
}

async function compare() {
  const { default: sharp } = await import("sharp");
  const beforeDir = join(OUT, "before");
  const afterDir = join(OUT, "after");
  if (!existsSync(beforeDir) || !existsSync(afterDir)) {
    console.error(`need both ${beforeDir} and ${afterDir} — capture before and after first.`);
    process.exit(1);
  }
  mkdirSync(join(OUT, "diff"), { recursive: true });

  const files = readdirSync(beforeDir).filter((f) => f.endsWith(".png"));
  const rows = [];
  let worst = 0;

  for (const file of files) {
    const a = join(beforeDir, file);
    const b = join(afterDir, file);
    if (!existsSync(b)) {
      rows.push([file, "—", "MISSING AFTER — route gone?"]);
      worst = 1;
      continue;
    }

    /* Force both to RGBA. A screenshot saved as RGB and another as RGBA
       decode to different strides, and indexing one buffer with the other's
       stride misreads every pixel — which reads as a total rewrite of the
       page rather than the two-pixel nudge it actually was. */
    const [ia, ib] = await Promise.all([
      sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
      sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ]);

    if (ia.info.width !== ib.info.width || ia.info.height !== ib.info.height) {
      rows.push([
        file,
        "size",
        `CHANGED — ${ia.info.width}×${ia.info.height} became ${ib.info.width}×${ib.info.height}`,
      ]);
      worst = 1;
      continue;
    }

    const { width, height } = ia.info;
    const channels = 4;
    const pa = ia.data;
    const pb = ib.data;
    const total = width * height;
    let changed = 0;
    /* Mark every differing pixel red on a dimmed copy, so a human can see
       where rather than just how much. */
    const diff = Buffer.alloc(total * 3);

    for (let i = 0, p = 0; i < total; i++, p += channels) {
      let delta = 0;
      for (let c = 0; c < 3; c++) {
        delta = Math.max(delta, Math.abs(pa[p + c] - pb[p + c]));
      }
      const o = i * 3;
      if (delta > CHANNEL_TOLERANCE) {
        changed++;
        diff[o] = 255;
        diff[o + 1] = 0;
        diff[o + 2] = 0;
      } else {
        const grey = Math.round(pa[p] * 0.2 + 200 * 0.8);
        diff[o] = diff[o + 1] = diff[o + 2] = grey;
      }
    }

    const share = changed / total;
    if (share > PIXEL_THRESHOLD) {
      await sharp(diff, { raw: { width, height, channels: 3 } })
        .png()
        .toFile(join(OUT, "diff", file));
      rows.push([file, `${(share * 100).toFixed(3)}%`, `CHANGED — see ${OUT}/diff/${file}`]);
      worst = Math.max(worst, share);
    } else {
      rows.push([file, `${(share * 100).toFixed(3)}%`, "unchanged"]);
    }
  }

  const w = [0, 1, 2].map((i) => Math.max(...rows.map((r) => String(r[i]).length), 4));
  console.log(rows.map((r) => r.map((c, i) => String(c).padEnd(w[i])).join("  ")).join("\n"));

  const changed = rows.filter((r) => String(r[2]).startsWith("CHANGED") || String(r[2]).startsWith("MISSING"));
  console.log(
    changed.length
      ? `\n${changed.length} of ${rows.length} view(s) changed. An upgrade should not move pixels — explain each one before committing.`
      : `\nAll ${rows.length} view(s) identical within tolerance.`,
  );
  process.exit(changed.length ? 1 : 0);
}

const [cmd, label] = process.argv.slice(2);
if (cmd === "capture") await capture(label ?? "before");
else if (cmd === "compare") await compare();
else {
  console.error("usage: visual-check.mjs capture <before|after> | compare");
  process.exit(1);
}
