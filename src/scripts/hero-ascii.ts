/**
 * The homepage hero's art: a forest-canopy video rendered live as ASCII.
 *
 * The video is never shown. Each tick its current frame is drawn, cover-
 * cropped to the panel, into an offscreen canvas of one pixel per character
 * cell;
 * each pixel's luminance picks a character, and the character's position in
 * the ramp picks its colour. Glyphs are stamped from a pre-rendered atlas,
 * and only the cells whose character changed since the last tick are redrawn.
 *
 * The canvas is as big as the viewport and its grid never moves. The panel
 * crops it, and the footage is fitted to the panel's size of the moment — so
 * through the intro (`Utility/HeroIntro`), as the panel collapses from the
 * full screen to its resting place, the picture re-frames itself inside it
 * the way an `object-fit: cover` image would.
 *
 * The markup and the styles are in `components/SectionHeroHome.astro`;
 * whether to fall back to a still is decided before first paint by
 * `Utility/HeroAsciiHead`.
 */

/* ------------------------------------------------------------------ */
/* The look. Tuned in a prototype and signed off — change it there.    */
/* Colours, the face and the ground come from CSS (`.hero-art`).       */
/* ------------------------------------------------------------------ */
const CONFIG = {
  /** Light to dense. The leading space is the blank. */
  chars: " .:-=+*#%@",
  /** Cell size in CSS px. Fixed at every screen size. */
  cellWidth: 7,
  cellHeight: 11,
  /** `false`: bright sky takes the dense characters. */
  invert: false,
  contrast: 1.4,
  brightness: 0,
  gamma: 1.0,
  /** Cells at or below this luminance stay blank. */
  cutoff: 0.12,
  /** Render rate, and the rate below `smallQuery`. */
  fps: 24,
  fpsSmall: 12,
  smallQuery: "(max-width: 767px)",
  playbackRate: 1.0,
  maxPixelRatio: 2,
  /** How long to wait for the face before drawing with the fallback. */
  fontTimeout: 3000,
};

const root = document.querySelector<HTMLElement>("[data-hero-art]");
const canvas = root?.querySelector<HTMLCanvasElement>("canvas");
const video = root?.querySelector<HTMLVideoElement>("video");
const ctx = canvas?.getContext("2d");

if (root && canvas && video && ctx) {
  start(root, canvas, video, ctx);
}

function start(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
) {
  const html = document.documentElement;
  const charCount = CONFIG.chars.length;
  const small = matchMedia(CONFIG.smallQuery);

  const sample = document.createElement("canvas");
  const sampleCtx = sample.getContext("2d", { willReadFrequently: true })!;
  const atlas = document.createElement("canvas");
  const atlasCtx = atlas.getContext("2d")!;

  /* Grid state, rebuilt by `layout()`. */
  let cols = 0;
  let rows = 0;
  let ratio = 1;
  let tileW = 0;
  let tileH = 0;
  let xs = new Int32Array(0); // device-px column edges, cols + 1 of them
  let ys = new Int32Array(0);
  let prev = new Uint8Array(0); // the character index last drawn per cell
  /* The cells the panel shows: columns `c0` to `cols`, rows 0 to `r1`. */
  let c0 = 0;
  let r1 = 0;

  let atlasReady = false;
  let fontLoaded = false;
  let failed = false;
  let staticMode = html.dataset.heroMode === "static";

  /* What the grid was last drawn from, so a resize can redraw at once. */
  let source: CanvasImageSource | null = null;
  let sourceW = 0;
  let sourceH = 0;

  /* ---------------------------------------------------------------- */
  /* Layout                                                            */
  /* ---------------------------------------------------------------- */

  function layout() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const nextRatio = Math.min(devicePixelRatio || 1, CONFIG.maxPixelRatio);
    const nextCols = Math.floor(width / CONFIG.cellWidth);
    const nextRows = Math.floor(height / CONFIG.cellHeight);
    if (nextCols < 1 || nextRows < 1) return;

    const ratioChanged = nextRatio !== ratio || !tileW;
    ratio = nextRatio;
    cols = nextCols;
    rows = nextRows;

    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    sample.width = cols;
    sample.height = rows;

    /* The grid is anchored top right, the corner the panel is pinned to, so
       the part-cell left over sits on the left, out of the panel. */
    const offset = Math.round((width - cols * CONFIG.cellWidth) * ratio);
    xs = new Int32Array(cols + 1);
    ys = new Int32Array(rows + 1);
    for (let c = 0; c <= cols; c++) {
      xs[c] = offset + Math.round(c * CONFIG.cellWidth * ratio);
    }
    for (let r = 0; r <= rows; r++) {
      ys[r] = Math.round(r * CONFIG.cellHeight * ratio);
    }
    prev = new Uint8Array(cols * rows);
    c0 = cols;
    r1 = 0;

    if (ratioChanged) buildAtlas();
    redraw();
  }

  /* Which cells the panel shows right now. It is pinned to the canvas's top
     right corner, so its size is all there is to know. */
  function updateVisible() {
    const a = Math.max(
      0,
      cols - Math.ceil(root.clientWidth / CONFIG.cellWidth),
    );
    const d = Math.min(rows, Math.ceil(root.clientHeight / CONFIG.cellHeight));
    /* Cells that were out of the panel were not kept up to date. */
    if (a < c0 || d > r1) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      prev.fill(0);
    }
    c0 = a;
    r1 = d;
  }

  /* ---------------------------------------------------------------- */
  /* Glyph atlas: each character once, in its ramp colour.             */
  /* ---------------------------------------------------------------- */

  function readColor(name: string): [number, number, number] {
    const probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    const p = probe.getContext("2d")!;
    p.fillStyle = getComputedStyle(root).getPropertyValue(name).trim();
    p.fillRect(0, 0, 1, 1);
    const [r, g, b] = p.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  }

  function buildAtlas() {
    const style = getComputedStyle(canvas);
    const fontSize = parseFloat(style.fontSize);
    const low = readColor("--hero-art-low");
    const mid = readColor("--hero-art-mid");
    const high = readColor("--hero-art-high");

    tileW = Math.ceil(CONFIG.cellWidth * ratio);
    tileH = Math.ceil(CONFIG.cellHeight * ratio);
    atlas.width = tileW * charCount;
    atlas.height = tileH;

    atlasCtx.font = `${fontSize * ratio}px ${style.fontFamily}`;
    atlasCtx.textBaseline = "alphabetic";
    atlasCtx.textAlign = "left";
    /* Line spacing 1.0: the face's own line box, centred on the cell. */
    const m = atlasCtx.measureText("M");
    const ascent = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent;
    const descent = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;
    const baseline = Math.round((tileH - (ascent + descent)) / 2 + ascent);

    for (let i = 0; i < charCount; i++) {
      const ch = CONFIG.chars[i];
      if (ch === " ") continue;
      /* Dark rule at index 0, sage at the midpoint, Signal Green at the
         densest character; linear in RGB. */
      const t = i / (charCount - 1);
      const [from, to, k] =
        t <= 0.5 ? [low, mid, t * 2] : [mid, high, (t - 0.5) * 2];
      const rgb = from.map((v, n) => Math.round(v + (to[n] - v) * k));
      const dx = Math.round((tileW - atlasCtx.measureText(ch).width) / 2);

      atlasCtx.save();
      atlasCtx.beginPath();
      atlasCtx.rect(i * tileW, 0, tileW, tileH);
      atlasCtx.clip();
      atlasCtx.fillStyle = `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
      atlasCtx.fillText(ch, i * tileW + dx, baseline);
      atlasCtx.restore();
    }
    atlasReady = true;
    prev.fill(0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  function draw(src: CanvasImageSource, srcW: number, srcH: number) {
    if (!atlasReady || failed || !cols || !srcW || !srcH) return;
    updateVisible();
    const across = cols - c0;
    const down = r1;
    if (!across || !down) return;

    /* 1. The frame, cover-cropped to the panel and centred, one pixel per
          cell. */
    const aspect = (across * CONFIG.cellWidth) / (down * CONFIG.cellHeight);
    let cropW = srcW;
    let cropH = srcH;
    if (srcW / srcH > aspect) cropW = srcH * aspect;
    else cropH = srcW / aspect;

    let data: Uint8ClampedArray;
    try {
      sampleCtx.drawImage(
        src,
        (srcW - cropW) / 2,
        (srcH - cropH) / 2,
        cropW,
        cropH,
        0,
        0,
        across,
        down,
      );
      data = sampleCtx.getImageData(0, 0, across, down).data;
    } catch {
      fail();
      return;
    }

    const { contrast, brightness, gamma, cutoff, invert, chars } = CONFIG;
    const last = charCount - 1;

    for (let r = 0; r < r1; r++) {
      for (let c = c0; c < cols; c++) {
        const cell = r * cols + c;
        const i = (r * across + c - c0) * 4;
        /* 2–5. Luminance, gamma, contrast and brightness, invert. */
        let l =
          (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) /
          255;
        if (gamma !== 1) l = Math.pow(l, gamma);
        l = (l - 0.5) * contrast + 0.5 + brightness;
        if (invert) l = 1 - l;
        /* 6–7. Cutoff, clamp, pick the character. */
        let index = 0;
        if (l > cutoff) {
          index = Math.round(Math.min(l, 1) * last);
          if (chars[index] === " ") index = 0;
        }
        if (index === prev[cell]) continue;
        prev[cell] = index;
        /* 8. Stamp it. */
        const x = xs[c];
        const y = ys[r];
        ctx.clearRect(x, y, xs[c + 1] - x, ys[r + 1] - y);
        if (index) {
          ctx.drawImage(atlas, index * tileW, 0, tileW, tileH, x, y, tileW, tileH);
        }
      }
    }
  }

  function redraw() {
    if (source) draw(source, sourceW, sourceH);
  }

  function drawVideo() {
    if (video.readyState < 2) return;
    source = video;
    sourceW = video.videoWidth;
    sourceH = video.videoHeight;
    redraw();
  }

  /* ---------------------------------------------------------------- */
  /* The loop: one render per presented video frame where the browser  */
  /* can say when that is, otherwise per animation frame.              */
  /* ---------------------------------------------------------------- */

  let useVideoFrames = "requestVideoFrameCallback" in video;
  let running = false;
  let handle = 0;
  let lastRender = 0;
  let lastCallback = 0;
  let lastMediaTime = -1;

  function interval() {
    return 1000 / (small.matches ? CONFIG.fpsSmall : CONFIG.fps);
  }

  function onVideoFrame(now: number, meta: VideoFrameCallbackMetadata) {
    lastCallback = now;
    /* Throttled on the clip's own clock, not the display's: a 24 fps clip
       on a 60 Hz screen is presented at uneven 33 and 50 ms gaps, and a
       wall-clock test drops the short ones. In media time every frame is
       1/24s from the last, so 24 fps draws each one and 12 fps every
       other. `abs` covers the jump back to zero when the clip loops. */
    const gap =
      (Math.abs(meta.mediaTime - lastMediaTime) * 1000) / CONFIG.playbackRate;
    if (gap >= interval() - 4) {
      lastMediaTime = meta.mediaTime;
      drawVideo();
    }
    schedule();
  }

  function onAnimationFrame(now: number) {
    const every = interval();
    const elapsed = now - lastRender;
    if (elapsed >= every) {
      lastRender = now - (elapsed % every);
      drawVideo();
    }
    schedule();
  }

  function schedule() {
    if (!running) return;
    handle = useVideoFrames
      ? video.requestVideoFrameCallback(onVideoFrame)
      : requestAnimationFrame(onAnimationFrame);
  }

  function cancel() {
    if (useVideoFrames) video.cancelVideoFrameCallback(handle);
    else cancelAnimationFrame(handle);
  }

  function run() {
    if (running || staticMode || failed) return;
    running = true;
    schedule();
    /* Some browsers stop presenting frames for a video nobody can see, and
       the callback then never fires. Notice, and fall back. */
    if (useVideoFrames) {
      const since = performance.now();
      setTimeout(() => {
        if (running && useVideoFrames && lastCallback < since && !video.paused) {
          cancel();
          useVideoFrames = false;
          schedule();
        }
      }, 700);
    }
  }

  function halt() {
    if (!running) return;
    running = false;
    cancel();
  }

  /* ---------------------------------------------------------------- */
  /* Playback, and when not to                                         */
  /* ---------------------------------------------------------------- */

  let inView = true;

  function toStatic() {
    staticMode = true;
    halt();
    video.pause();
    showPoster();
  }

  function fail() {
    /* `getImageData` threw. Try the still once; if that throws too the
       panel stays a flat ground. */
    if (failed) return;
    halt();
    video.pause();
    if (staticMode) {
      failed = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    staticMode = true;
    prev.fill(0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    showPoster();
  }

  function sync() {
    if (staticMode || failed) return;
    if (inView && !document.hidden) {
      video.play().then(run, toStatic);
    } else {
      halt();
      video.pause();
    }
  }

  const poster = new Image();
  poster.decoding = "async";
  let posterReady = false;

  function showPoster() {
    if (!posterReady) return;
    source = poster;
    sourceW = poster.naturalWidth;
    sourceH = poster.naturalHeight;
    redraw();
  }

  poster.addEventListener("load", () => {
    posterReady = true;
    /* The poster is the clip's first frame, so the art is up before the
       video has buffered and does not jump when playback takes over. */
    if (staticMode || !running || video.readyState < 2) showPoster();
  });
  poster.src = video.dataset.poster ?? "";

  function attachVideo() {
    /* The sources are held back in the markup so that a visitor who gets
       the still never downloads the clip. */
    for (const s of video.querySelectorAll<HTMLSourceElement>("source")) {
      if (s.dataset.src) s.src = s.dataset.src;
    }
    video.muted = true;
    video.defaultPlaybackRate = CONFIG.playbackRate;
    video.playbackRate = CONFIG.playbackRate;
    video.load();
    sync();
  }

  /* ---------------------------------------------------------------- */
  /* Wiring                                                            */
  /* ---------------------------------------------------------------- */

  const face = getComputedStyle(canvas).fontFamily.split(",")[0].trim();
  const faceSpec = `${getComputedStyle(canvas).fontSize} ${face}`;

  async function boot() {
    /* The atlas is built from the face, so wait for it — but not for ever. */
    try {
      await Promise.race([
        document.fonts.load(faceSpec, CONFIG.chars),
        new Promise((resolve) => setTimeout(resolve, CONFIG.fontTimeout)),
      ]);
    } catch {}
    fontLoaded = document.fonts.check(faceSpec, CONFIG.chars);
    layout();
    if (!staticMode) attachVideo();
  }

  /* If the face arrives after the fallback was used, rebuild with it. */
  document.fonts.addEventListener("loadingdone", () => {
    if (fontLoaded || !tileW || !document.fonts.check(faceSpec, CONFIG.chars)) {
      return;
    }
    fontLoaded = true;
    buildAtlas();
    redraw();
  });

  let pending = 0;
  function relayout() {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      if (tileW) layout();
    });
  }
  new ResizeObserver(relayout).observe(canvas);
  addEventListener("resize", relayout);
  /* The panel changes size on every frame of the intro's collapse, and with
     the page; re-fit the footage to it each time. */
  new ResizeObserver(() => {
    if (tileW) redraw();
  }).observe(root);

  new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting;
    sync();
  }).observe(root);
  document.addEventListener("visibilitychange", sync);

  boot();
}
