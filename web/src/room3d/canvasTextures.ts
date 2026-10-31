/**
 * Everything readable in the 3D room is drawn from case data onto canvases and used as textures:
 * monitor screens, clippings, lead cards, the ruling, the map and the newspaper. Nothing is a
 * decorative stand-in for data. Close reading still happens in the 2D document sheets.
 */
import * as THREE from "three";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import world from "world-atlas/countries-110m.json";
import type { Activity, Case, Evidence, Filing, Lead, Source, Verdict } from "../lib/types";
import { stanceMeta } from "../lib/types";
import { DOSSIERS } from "../lib/elections";

export const proxied = (url: string) => `/api/image?url=${encodeURIComponent(url)}`;

const images = new Map<string, HTMLImageElement | "loading" | "failed">();
const waiting = new Map<string, Set<() => void>>();
/** Load a source image through the same-origin proxy (WebGL needs CORS-clean pixels). */
export function sourceImage(url: string | undefined, onReady: () => void): HTMLImageElement | null {
  if (!url) return null;
  const hit = images.get(url);
  if (hit instanceof HTMLImageElement) return hit;
  if (hit === "failed") return null;
  if (!waiting.has(url)) waiting.set(url, new Set());
  waiting.get(url)!.add(onReady);
  if (hit === "loading") return null;
  images.set(url, "loading");
  const img = new Image();
  img.onload = () => { images.set(url, img); waiting.get(url)?.forEach((f) => f()); waiting.delete(url); };
  img.onerror = () => { images.set(url, "failed"); waiting.delete(url); };
  img.src = proxied(url);
  return null;
}
export function forgetWaiter(url: string, f: () => void) { waiting.get(url)?.delete(f); }

export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, old?: THREE.CanvasTexture) {
  const cv = (old?.image as HTMLCanvasElement) ?? Object.assign(document.createElement("canvas"), { width: w, height: h });
  const g = cv.getContext("2d")!;
  g.clearRect(0, 0, w, h);
  draw(g);
  const t = old ?? new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number) {
  const words = text.split(/\s+/);
  let line = "", n = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (g.measureText(test).width > maxW && line) {
      if (n === maxLines - 1) { g.fillText(`${line}…`, x, y + n * lh); return n + 1; }
      g.fillText(line, x, y + n * lh); n++; line = words[i];
    } else line = test;
  }
  if (line) { g.fillText(line, x, y + n * lh); n++; }
  return n;
}

function paper(g: CanvasRenderingContext2D, w: number, h: number, tint = "#f3ecdc") {
  g.fillStyle = tint; g.fillRect(0, 0, w, h);
  // faint fibre
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(90,70,40,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
}

function cover(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, mono = false) {
  const r = Math.max(w / img.width, h / img.height);
  const sw = w / r, sh = h / r;
  g.save();
  if (mono) g.filter = "grayscale(1) contrast(1.2)";
  g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  g.restore();
}

const BEARING = { supports: ["SUPPORTS", "#4f6b3a"], undermines: ["CONTRADICTS", "#a3302a"], context: ["CONTEXT", "#8a6420"] } as const;
const bearing = (b: string) => BEARING[(b === "contradicts" ? "undermines" : b) as keyof typeof BEARING] ?? BEARING.context;
const isReport = (s?: Source) => !!s && /\.(org|gov|int)(\.|$)|gov\./.test(s.publisher) && !/wikipedia/.test(s.publisher);
const short = (q: string, words: number) => { const w = q.split(/\s+/); return w.length > words ? `${w.slice(0, words).join(" ")}…` : q; };

/** A pinned exhibit: report page, press clipping or web printout, depending on its source. */
export function drawClipping(g: CanvasRenderingContext2D, e: Evidence, src: Source | undefined, img: HTMLImageElement | null) {
  const W = 512, H = 640;
  paper(g, W, H);
  const [label, color] = bearing(e.bearing);
  let y = 0;
  if (isReport(src)) {
    g.fillStyle = "#2c3e5c"; g.fillRect(0, 0, W, 54);
    g.fillStyle = "#f4ecd8"; g.font = "500 22px 'IBM Plex Mono'"; g.fillText((src?.publisher ?? "").replace(/^www\./, "").toUpperCase(), 24, 35);
    g.textAlign = "right"; g.fillText(e.id, W - 24, 35); g.textAlign = "left"; y = 54;
  } else if (!img) {
    g.fillStyle = "#e3ddd0"; g.fillRect(0, 0, W, 44); g.fillStyle = "#5a4a32"; g.font = "400 18px 'IBM Plex Mono'";
    g.fillText(e.url.replace(/^https?:\/\//, "").slice(0, 40), 20, 29); y = 44;
  }
  if (img) { cover(g, img, 0, y, W, 230, !isReport(src)); y += 230; }
  y += 24;
  if (!isReport(src) && src) { g.fillStyle = "#1f1a14"; g.font = "700 34px 'Newsreader'"; y += 8 + 38 * wrap(g, src.title, 24, y + 26, W - 48, 38, 2); }
  g.fillStyle = "#2b241c"; g.font = `600 ${img ? 40 : 46}px 'Newsreader'`;
  const lh = img ? 47 : 54;
  const lines = wrap(g, `“${short(e.quote, img ? 13 : 22)}”`, 24, y + 36, W - 48, lh, img ? 4 : 7);
  if (isReport(src)) { g.fillStyle = "rgba(250,220,60,.35)"; g.fillRect(18, y, W - 36, lines * lh + 12); }
  g.fillStyle = "#6b5a3c"; g.font = "500 22px 'IBM Plex Mono'"; g.fillText(e.id, 24, H - 26);
  g.fillStyle = color; g.textAlign = "right"; g.fillText(label, W - 24, H - 26); g.textAlign = "left";
}

export function drawClaim(g: CanvasRenderingContext2D, c: Case | null) {
  const W = 1024, H = 420;
  paper(g, W, H, "#f7f1e2");
  g.fillStyle = "#6b5a3c"; g.font = "500 26px 'IBM Plex Mono'"; g.fillText(c ? "CLAIM ON TRIAL" : "THE WALL IS CLEAR", 40, 56);
  g.fillStyle = "#1f1a14"; g.font = "600 46px 'Newsreader'";
  wrap(g, c ? `“${c.claim}”` : "Open a case at the table. Verified exhibits will be pinned here as the reporters find them.", 40, 120, W - 80, 56, 5);
}

export function drawLead(g: CanvasRenderingContext2D, l: Lead) {
  const W = 512, H = 400;
  g.fillStyle = "#f4e3a0"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(80,110,160,.28)"; for (let y = 70; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = "#6b5a3c"; g.font = "500 22px 'IBM Plex Mono'"; g.fillText(`${l.id} · ${l.by === "editor" ? "EDITOR" : l.by.toUpperCase()}`, 24, 44);
  g.fillStyle = "#2b241c"; g.font = "600 44px 'Caveat'"; wrap(g, l.question, 24, 106, W - 48, 40, 6);
  const [stamp, tone] = l.status === "assigned" ? [`ON IT · ${(l.assignee ?? "").toUpperCase()}`, "#2f5f63"] : l.status === "reported" ? ["FOLLOWED UP", "#4f7d4a"] : l.status === "dropped" ? ["DEAD END", "#7a6a58"] : ["OPEN LEAD", "#a3302a"];
  g.save(); g.translate(28, H - 34); g.rotate(-0.05); g.strokeStyle = tone; g.lineWidth = 3; g.font = "600 24px 'IBM Plex Mono'";
  const w = g.measureText(stamp).width + 20; g.strokeRect(-4, -26, w, 36); g.fillStyle = tone; g.fillText(stamp, 6, 2); g.restore();
}

export function drawVerdict(g: CanvasRenderingContext2D, v: Verdict) {
  const W = 768, H = 520;
  paper(g, W, H, "#fbf6e8");
  g.fillStyle = "#6b5a3c"; g.font = "500 24px 'IBM Plex Mono'"; g.fillText(`RULING OF THE COURT · ROUND ${v.round}`, 36, 56);
  const color = v.verdict === "contradicted" ? "#a3302a" : v.verdict === "supported" ? "#4f5233" : v.verdict === "misleading" ? "#7a5a2e" : "#5b564c";
  g.save(); g.translate(36, 150); g.rotate(-0.04); g.strokeStyle = color; g.lineWidth = 6; g.font = "800 66px 'Newsreader'";
  const label = stanceMeta(v.verdict).label.toUpperCase(); const lw = g.measureText(label).width;
  g.strokeRect(-10, -66, lw + 24, 86); g.fillStyle = color; g.fillText(label, 2, 0); g.restore();
  g.fillStyle = "#6b5a3c"; g.font = "500 26px 'IBM Plex Mono'"; g.fillText(`${v.confidence}% confidence`, 36, 210);
  g.fillStyle = "#1f1a14"; g.font = "600 38px 'Newsreader'"; wrap(g, v.headline, 36, 274, W - 72, 46, 4);
}

const PHOSPHOR: Record<string, string> = { prosecutor: "#ffb867", defender: "#c6dd9b", investigator: "#e9e4d4" };
/** A monitor: what this agent's Mozaik loop is doing right now, or its position on file. */
export function drawScreen(g: CanvasRenderingContext2D, role: string, plate: string, busy: boolean, lines: Activity[], filing: Filing | undefined, hasCase: boolean, purpose: string) {
  const W = 768, H = 448, ph = PHOSPHOR[role];
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, busy ? "#1c1d1a" : "#151614"); grd.addColorStop(1, "#0f100e");
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.fillStyle = ph; g.font = "600 32px 'IBM Plex Mono'"; g.fillText(plate, 28, 48);
  g.textAlign = "right"; g.fillText(busy ? "● WORKING" : filing ? `R${filing.round} FILED` : hasCase ? "STANDBY" : "NO CASE", W - 28, 46); g.textAlign = "left";
  g.fillStyle = ph + "55"; g.fillRect(28, 62, W - 56, 2);
  g.fillStyle = ph;
  if (filing && !busy) {
    g.font = "700 72px 'IBM Plex Mono'"; g.fillText(filing.timedOut ? "NO FILING" : stanceMeta(filing.stance).label.toUpperCase().slice(0, 14), 28, 170);
    g.font = "500 38px 'IBM Plex Mono'"; g.fillText(`${filing.confidence}% confidence`, 28, 230);
    if (filing.changed) { g.fillStyle = "#f2c98c"; g.fillText("REVISED after cross-exam", 28, 290); }
  } else if (!hasCase) {
    g.font = "500 38px 'IBM Plex Mono'"; wrap(g, purpose, 28, 130, W - 56, 50, 3);
  } else {
    g.font = "500 32px 'IBM Plex Mono'";
    lines.slice(-7).forEach((l, i) => { const t = `> ${l.text}`; g.fillText(t.length > 38 ? `${t.slice(0, 37)}…` : t, 28, 116 + i * 46); });
  }
  for (let y = 0; y < H; y += 4) { g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(0, y, W, 1); }
}

const countries = feature(world as any, (world as any).objects.countries) as unknown as FeatureCollection<Geometry>;
export const MAP = { w: 2048, h: 1024 };
/** The election map printed on heavy paper; the three elections inked in. */
export function drawMap(g: CanvasRenderingContext2D, selected: string | null) {
  const { w, h } = MAP;
  paper(g, w, h, "#ece3cb");
  const proj = geoEquirectangular().scale(w / (2 * Math.PI)).translate([w / 2, h / 2 + 40]);
  const path = geoPath(proj, g);
  g.strokeStyle = "rgba(120,100,70,.25)"; g.lineWidth = 1.5;
  for (let i = 0; i <= 12; i++) { g.beginPath(); g.moveTo((i * w) / 12, 0); g.lineTo((i * w) / 12, h); g.stroke(); }
  for (let i = 0; i <= 6; i++) { g.beginPath(); g.moveTo(0, (i * h) / 6); g.lineTo(w, (i * h) / 6); g.stroke(); }
  const ids = new Map(DOSSIERS.map((d) => [d.atlasId, d]));
  for (const f of countries.features) {
    const d = ids.get(String(f.id));
    g.beginPath(); path(f);
    g.fillStyle = d ? (d.id === selected ? "#a3302a" : "#2f5f63") : "#b9ab88"; g.fill();
    g.strokeStyle = "#6b5a3c"; g.lineWidth = 1; g.stroke();
  }
  g.fillStyle = "#3d3222"; g.font = "600 44px 'IBM Plex Mono'"; g.fillText("ELECTIONS · 25 OCT – 4 NOV 2026", 48, h - 48);
  return DOSSIERS.map((d) => { const [x, y] = proj(d.centroid)!; return { id: d.id, u: x / w, v: y / h }; });
}

export function drawNewspaper(g: CanvasRenderingContext2D, c: Case | null, img: HTMLImageElement | null) {
  const W = 768, H = 1024;
  paper(g, W, H, "#efe8d6");
  g.fillStyle = "#14110d"; g.font = "800 84px 'Newsreader'"; g.textAlign = "center"; g.fillText("The Ground Truth", W / 2, 110);
  g.font = "500 22px 'IBM Plex Mono'"; g.fillText(`ELECTION EDITION · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase()}`, W / 2, 150); g.textAlign = "left";
  g.fillRect(40, 166, W - 80, 3); g.fillRect(40, 174, W - 80, 1);
  g.font = "700 56px 'Newsreader'";
  const n = wrap(g, c ? `On trial: “${short(c.claim, 16)}”` : "Three elections in ten days. Every claim is a case.", 40, 250, W - 80, 62, 4);
  const top = 250 + n * 62;
  if (img) cover(g, img, 40, top, W - 80, 340, true); else { g.fillStyle = "#c9c2b0"; g.fillRect(40, top, W - 80, 340); }
  g.fillStyle = "rgba(0,0,0,.35)";
  for (let col = 0; col < 3; col++) for (let i = 0; i < 9; i++) g.fillRect(40 + col * 236, top + 370 + i * 22, 210 - (i % 4) * 14, 6);
}

/** Desk research pinned before any case: a real, sourced quote from one election dossier. */
export function drawResearch(g: CanvasRenderingContext2D, country: string, quote: string, publisher: string, date: string) {
  const W = 512, H = 640;
  paper(g, W, H);
  g.fillStyle = "#2f5f63"; g.fillRect(0, 0, W, 54);
  g.fillStyle = "#f4ecd8"; g.font = "500 22px 'IBM Plex Mono'"; g.fillText(`DESK RESEARCH · ${country.toUpperCase()}`, 24, 35);
  g.fillStyle = "#2b241c"; g.font = "500 34px 'Newsreader'"; wrap(g, `“${quote}”`, 24, 112, W - 48, 42, 10);
  g.fillStyle = "#6b5a3c"; g.font = "500 22px 'IBM Plex Mono'"; g.fillText(`${publisher} · ${date}`, 24, H - 28);
}

/** An election poster: the country's outline (atlas data), the election and its date. */
export function drawPoster(g: CanvasRenderingContext2D, atlasId: string, country: string, election: string, date: string, accent: string) {
  const W = 600, H = 800;
  g.fillStyle = "#f3ede1"; g.fillRect(0, 0, W, H);
  g.fillStyle = accent; g.fillRect(0, 0, W, 150);
  g.fillStyle = "#fff"; g.font = "700 56px 'Newsreader'"; g.fillText(country, 40, 100);
  const f = countries.features.find((x) => String(x.id) === atlasId);
  if (f) {
    const proj = geoEquirectangular().fitExtent([[70, 200], [W - 70, H - 230]], f as any);
    const path = geoPath(proj, g);
    g.beginPath(); path(f as any); g.fillStyle = accent; g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1; g.strokeStyle = "#2b241c"; g.lineWidth = 2; g.stroke();
  }
  g.fillStyle = "#2b241c"; g.font = "500 30px 'IBM Plex Mono'"; g.fillText(election.toUpperCase().slice(0, 30), 40, H - 130);
  g.font = "700 46px 'Newsreader'"; g.fillText(new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), 40, H - 70);
}

/** The wall sign above the evidence board. */
export function drawWallSign(g: CanvasRenderingContext2D) {
  const W = 2048, H = 200;
  g.clearRect(0, 0, W, H);
  g.font = "700 104px 'Newsreader'"; const tw = g.measureText("The Ground Truth").width;
  g.font = "600 60px 'IBM Plex Mono'"; const dw = g.measureText("ELECTION DESK").width;
  const gap = 60, total = tw + gap * 2 + 4 + dw, x0 = (W - total) / 2;
  g.fillStyle = "#f7f1e3"; g.font = "700 104px 'Newsreader'"; g.fillText("The Ground Truth", x0, 124);
  g.fillStyle = "#e0b04f"; g.fillRect(x0 + tw + gap, 40, 4, 112);
  const dx = x0 + tw + gap * 2 + 4;
  g.fillStyle = "#f7f1e3"; g.font = "600 60px 'IBM Plex Mono'"; g.fillText("ELECTION DESK", dx, 100);
  g.font = "500 26px 'IBM Plex Mono'"; g.fillStyle = "#e0b04f"; g.fillText("SERBIA · UNITED STATES · SOUTH AFRICA", dx + 2, 146);
}

/** The election status screen: the three elections, and what the desk is investigating now. */
export function drawElectionScreen(g: CanvasRenderingContext2D, rows: { country: string; election: string; when: string; held: boolean }[], live: string | null, phase: string | null) {
  const W = 1600, H = 900;
  g.fillStyle = "#0f1820"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#c0392b"; g.fillRect(0, 0, W, 110);
  g.fillStyle = "#fff"; g.font = "700 60px 'IBM Plex Mono'"; g.fillText("● ELECTION DESK · LIVE", 40, 76);
  g.textAlign = "right"; g.font = "500 44px 'IBM Plex Mono'"; g.fillText(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), W - 40, 74); g.textAlign = "left";
  rows.forEach((r, i) => {
    const y = 200 + i * 150;
    g.fillStyle = i % 2 ? "#13212b" : "#172833"; g.fillRect(0, y - 70, W, 140);
    g.fillStyle = "#f2efe8"; g.font = "700 88px 'Newsreader'"; g.fillText(r.country, 40, y + 30);
    g.textAlign = "right"; g.fillStyle = r.held ? "#e0b04f" : "#7fd08f"; g.font = "700 72px 'IBM Plex Mono'"; g.fillText(r.when.toUpperCase(), W - 40, y + 26); g.textAlign = "left";
  });
  g.fillStyle = "#1d2f3b"; g.fillRect(0, 660, W, 240);
  g.fillStyle = "#e0b04f"; g.font = "600 36px 'IBM Plex Mono'"; g.fillText(live ? `ON THE DESK NOW · ${(phase ?? "").replace("_", "-").toUpperCase()}` : "NO CASE OPEN", 40, 720);
  g.fillStyle = "#f2efe8"; g.font = "600 60px 'Newsreader'"; wrap(g, live ? `“${live}”` : "Pick an election at the table to open an investigation.", 40, 800, W - 80, 66, 2);
}

/** A long LED news ticker strip (scrolled by texture offset). */
export function drawTicker(g: CanvasRenderingContext2D, items: string[]) {
  const W = 4096, H = 128;
  g.fillStyle = "#111"; g.fillRect(0, 0, W, H);
  g.font = "600 56px 'IBM Plex Mono'";
  let x = 30;
  const text = items.join("   ●   ") + "   ●   ";
  while (x < W) { g.fillStyle = "#ffcf5a"; g.fillText(text, x, 86); x += g.measureText(text).width; }
}

/** A sign hanging over an agent's desk. */
export function drawDeskSign(g: CanvasRenderingContext2D, title: string, status: string, accent: string, busy: boolean) {
  const W = 1024, H = 300;
  g.fillStyle = "#f7f1e3"; g.fillRect(0, 0, W, H);
  g.fillStyle = accent; g.fillRect(0, 0, 26, H);
  g.fillStyle = "#1f1a14"; g.font = "700 92px 'Newsreader'"; g.fillText(title, 64, 130);
  g.fillStyle = busy ? "#c0392b" : "#6b5a3c"; g.font = "600 46px 'IBM Plex Mono'"; g.fillText(`${busy ? "● " : ""}${status}`.slice(0, 34), 64, 230);
}
