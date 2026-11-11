#!/usr/bin/env node
/**
 * Hämtar silhuetter från PhyloPic (öppet API), spårar konturen och sparar
 * förenklade punkter i src/data/silhouettes.json.
 *
 *   npm run silhouettes              # alla djur
 *   npm run silhouettes -- dodo moa  # bara vissa
 *
 * Välja en annan bild (t.ex. en som är sedd från sidan):
 *   - Lägg en egen PNG (svart silhuett, transparent bakgrund) i silhouettes/raw/<id>.png, eller
 *   - ange en PhyloPic-bilds UUID i silhouettes/sources.json: { "dodo": "<uuid>" }
 *
 * Kontrollera licensen för varje bild (CC0 / CC BY). Credit sparas i JSON-filen och visas i appen.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "src/data/silhouettes.json");
const RAW = path.join(root, "silhouettes/raw");
const SOURCES = path.join(root, "silhouettes/sources.json");
const API = "https://api.phylopic.org";
const MAX_POINTS = 60;

// Läs djurlistan ur animals.ts (enkelt regex, så att vi slipper bygga TypeScript).
const animalsSrc = fs.readFileSync(path.join(root, "src/data/animals.ts"), "utf8");
const animals = [...animalsSrc.matchAll(/id: "([^"]+)".*?phylopic: "([^"]+)"/g)].map((m) => ({ id: m[1], phylopic: m[2] }));

const only = process.argv.slice(2);
const sources = fs.existsSync(SOURCES) ? JSON.parse(fs.readFileSync(SOURCES, "utf8")) : {};
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};

async function getJson(url) {
  const r = await fetch(url, { headers: { Accept: "application/vnd.phylopic.v2+json" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function findImage(build, a) {
  if (sources[a.id]) return getJson(`${API}/images/${sources[a.id]}?build=${build}`);
  const nodes = await getJson(`${API}/nodes?build=${build}&filter_name=${encodeURIComponent(a.phylopic)}&page=0&embed_items=true`);
  const node = nodes._embedded?.items?.[0];
  if (!node) throw new Error(`Hittade ingen nod för "${a.phylopic}"`);
  const imgHref = node._links?.primaryImage?.href;
  if (!imgHref) throw new Error(`Noden "${a.phylopic}" har ingen bild`);
  return getJson(`${API}${imgHref}${imgHref.includes("?") ? "&" : "?"}build=${build}`);
}

function largestRaster(img) {
  const files = img._links?.rasterFiles ?? [];
  const sized = files.map((f) => ({ href: f.href, w: parseInt(String(f.sizes).split("x")[0], 10) || 0 }));
  sized.sort((a, b) => b.w - a.w);
  return (sized.find((f) => f.w <= 1536) ?? sized[sized.length - 1])?.href;
}

// ---------- Spårning ----------

/** Binär mask (alfa eller mörka pixlar), lätt dilaterad så att lösa delar sitter ihop. */
export function maskFromPng(png, dilate = 2) {
  const { width: w, height: h, data } = png;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = data[i * 4 + 3], lum = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
    m[i] = a > 128 && lum < 200 ? 1 : 0;
  }
  if (!dilate) return { m, w, h };
  const d = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!m[y * w + x]) continue;
    for (let dy = -dilate; dy <= dilate; dy++) for (let dx = -dilate; dx <= dilate; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < w && Y < h) d[Y * w + X] = 1;
    }
  }
  return { m: d, w, h };
}

/** Behåll bara den största sammanhängande komponenten. */
export function largestComponent({ m, w, h }) {
  const label = new Int32Array(w * h);
  let best = 0, bestSize = 0, next = 1;
  const stack = [];
  for (let i = 0; i < w * h; i++) {
    if (!m[i] || label[i]) continue;
    let size = 0;
    stack.push(i); label[i] = next;
    while (stack.length) {
      const p = stack.pop(); size++;
      const x = p % w, y = (p / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const q = Y * w + X;
        if (m[q] && !label[q]) { label[q] = next; stack.push(q); }
      }
    }
    if (size > bestSize) { bestSize = size; best = next; }
    next++;
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = label[i] === best ? 1 : 0;
  return { m: out, w, h };
}

/** Moore-grannspårning av yttre konturen. Returnerar [x, y] med y uppåt. */
export function traceOutline({ m, w, h }) {
  const fg = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
  let start = -1;
  for (let i = 0; i < w * h; i++) if (m[i]) { start = i; break; }
  if (start < 0) return [];
  // Grannar medurs (y nedåt): V, NV, N, NO, O, SO, S, SV
  const D = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
  const sx = start % w, sy = (start / w) | 0;
  let x = sx, y = sy, dir = 0; // vi kom "från väster"
  const pts = [[x, y]];
  let firstMove = -1;
  for (let guard = 0; guard < w * h * 4; guard++) {
    let found = -1;
    for (let k = 0; k < 8; k++) {
      const d = (dir + k) % 8;
      if (fg(x + D[d][0], y + D[d][1])) { found = d; break; }
    }
    if (found < 0) break; // ensam pixel
    if (x === sx && y === sy && found === firstMove) break;
    if (firstMove < 0) firstMove = found;
    x += D[found][0]; y += D[found][1];
    pts.push([x, y]);
    dir = (found + 6) % 8; // börja nästa sökning 90° moturs från rörelsen
  }
  pts.pop();
  return pts.map(([px, py]) => [px, h - py]);
}

function pointSegDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function dp(pts, eps) {
  if (pts.length < 3) return pts;
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = pointSegDist(pts[i], pts[0], pts.at(-1)); if (d > max) { max = d; idx = i; } }
  if (max <= eps) return [pts[0], pts.at(-1)];
  return [...dp(pts.slice(0, idx + 1), eps).slice(0, -1), ...dp(pts.slice(idx), eps)];
}
export function simplifyClosed(o, maxPoints) {
  let far = 0, md = 0;
  o.forEach((p, i) => { const d = Math.hypot(p[0] - o[0][0], p[1] - o[0][1]); if (d > md) { md = d; far = i; } });
  const run = (eps) => [...dp(o.slice(0, far + 1), eps).slice(0, -1), ...dp([...o.slice(far), o[0]], eps).slice(0, -1)];
  let lo = 0, hi = md, best = run(hi);
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2, s = run(mid); if (s.length > maxPoints) lo = mid; else { hi = mid; best = s; } }
  return best;
}

export function traceBuffer(buf, maxPoints = MAX_POINTS) {
  const png = PNG.sync.read(buf);
  const outline = traceOutline(largestComponent(maskFromPng(png)));
  return simplifyClosed(outline, maxPoints).map(([x, y]) => [+(x / png.width).toFixed(4), +(y / png.width).toFixed(4)]);
}

// ---------- Main ----------

async function main() {
  const build = (await getJson(`${API}/`)).build;
  console.log(`PhyloPic build ${build}`);
  for (const a of animals) {
    if (only.length && !only.includes(a.id)) continue;
    try {
      const rawFile = path.join(RAW, `${a.id}.png`);
      let buf, credit, license;
      if (fs.existsSync(rawFile)) {
        buf = fs.readFileSync(rawFile);
        credit = "Egen bild"; license = "—";
      } else {
        const img = await findImage(build, a);
        const href = largestRaster(img);
        if (!href) throw new Error("ingen PNG");
        buf = Buffer.from(await (await fetch(href)).arrayBuffer());
        credit = img.attribution ?? "PhyloPic";
        license = img._links?.license?.href ?? "okänd";
        fs.mkdirSync(path.join(root, "silhouettes/cache"), { recursive: true });
        fs.writeFileSync(path.join(root, "silhouettes/cache", `${a.id}.png`), buf);
      }
      const points = traceBuffer(buf);
      out[a.id] = { points, credit, license };
      console.log(`✓ ${a.id.padEnd(18)} ${points.length} punkter  (${credit}, ${license})`);
    } catch (e) {
      console.log(`✗ ${a.id.padEnd(18)} ${e.message}`);
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(`\nSparat i ${path.relative(root, OUT)}. Kolla bilderna i silhouettes/cache – byt ut de som inte är sedda från sidan.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
