import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CameraControls, Environment, Html, Line, RoundedBox, useGLTF, useTexture } from "@react-three/drei";
import type { Advocate, Case, Evidence } from "../lib/types";
import type { Dossier } from "../lib/elections";
import { DOSSIERS, relativeDay } from "../lib/elections";
import type { Focus } from "../night/Scene";
import { AGENT_LOOK } from "../night/Workstation";
import { Person, PEOPLE } from "./People3D";
import { canvasTexture, forgetWaiter, drawPoster, drawResearch, drawWallSign, drawElectionScreen, drawTicker, drawDeskSign, drawClaim, drawClipping, drawLead, drawMap, drawNewspaper, drawScreen, drawVerdict, sourceImage, MAP } from "./canvasTextures";

const A = "/assets/3d";
const HDRI_ROT = Math.PI * 1.5; // chosen from screenshots: brightest view through the windows
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- camera
type Shot = { pos: [number, number, number]; target: [number, number, number] };
/** Stand in front of a desk, over the chair, looking at the monitor. */
function deskShot(r: Advocate): Shot {
  const { pos, rot } = DESKS[r];
  const at = (x: number, y: number, z: number): [number, number, number] => [pos[0] + x * Math.cos(rot) + z * Math.sin(rot), y, pos[2] - x * Math.sin(rot) + z * Math.cos(rot)];
  return { pos: at(0.75, 1.8, 2.35), target: at(0.12, 1.3, -0.22) };
}
const PRESETS: Record<Focus, Shot> = {
  // the cold open: tight on the live election board, the sign and wall at the edge of frame
  intro: { pos: [1.55, 1.35, -1.25], target: [3.75, 1.95, -4.9] },
  overview: { pos: [0.6, 2.55, 8.2], target: [0.1, 0.95, -0.9] },
  table: { pos: [0.3, 2.35, 3.2], target: [0, 0.76, 1.15] },
  desk: { pos: [1.55, 1.75, 2.75], target: [0.85, 0.78, 1.45] },
  wall: { pos: [-0.6, 1.7, -1.0], target: [-0.6, 1.68, -4.9] },
  get prosecutor() { return deskShot("prosecutor"); },
  get defender() { return deskShot("defender"); },
  get investigator() { return deskShot("investigator"); },
};

function Rig({ focus, sheetOpen }: { focus: Focus; sheetOpen: boolean }) {
  const ref = useRef<CameraControls>(null);
  const { size } = useThree();
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.setBoundary(new THREE.Box3(V(-6.6, 0.35, -4.7), V(6.6, 3.2, 8.7)));
    c.boundaryEnclosesCamera = true;
  }, []);
  const prev = useRef<Focus>(focus);
  useEffect(() => {
    // leaving the cold open is a long, slow dolly back into the room; everything else is brisk
    if (ref.current) ref.current.smoothTime = prev.current === "intro" ? 1.9 : 0.85;
    prev.current = focus;
    const p = PRESETS[focus];
    const pos = V(...p.pos), tgt = V(...p.target);
    // a document sliding in on the right: shift the shot so the station sits in the left half
    if (sheetOpen && size.width >= 1100) {
      const dir = tgt.clone().sub(pos).setY(0).normalize();
      const right = V(-dir.z, 0, dir.x);
      const d = pos.distanceTo(tgt) * 0.36;
      pos.addScaledVector(right, d); tgt.addScaledVector(right, d);
    }
    ref.current?.setLookAt(pos.x, pos.y, pos.z, tgt.x, tgt.y, tgt.z, focus !== "intro");
  }, [focus, sheetOpen, size.width]);
  return <CameraControls ref={ref} makeDefault smoothTime={0.85} minDistance={0.5} maxDistance={9} minPolarAngle={0.35} maxPolarAngle={1.75} dollySpeed={0.4} truckSpeed={0} />;
}

// ---------------------------------------------------------------- assets
/** A Poly Haven model scaled to a real-world size and stood on the floor at `position`. */
function Prop({ name, height, width, position, rotation = 0 }: { name: string; height?: number; width?: number; position: [number, number, number]; rotation?: number }) {
  const { scene } = useGLTF(`${A}/models/${name}/${name}.gltf`);
  const obj = useMemo(() => {
    const o = scene.clone(true);
    const size = new THREE.Box3().setFromObject(o).getSize(V(0, 0, 0));
    o.scale.setScalar(height ? height / size.y : (width ?? 1) / Math.max(size.x, size.z));
    const b = new THREE.Box3().setFromObject(o), c = b.getCenter(V(0, 0, 0));
    o.position.set(-c.x, -b.min.y, -c.z);
    o.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return o;
  }, [scene, height, width]);
  return <group position={position} rotation={[0, rotation, 0]}><primitive object={obj} /></group>;
}

function usePBR(name: string, repeat: [number, number]) {
  const t = useTexture({ map: `${A}/textures/${name}/diff.jpg`, normalMap: `${A}/textures/${name}/nor.jpg`, roughnessMap: `${A}/textures/${name}/rough.jpg` });
  useMemo(() => {
    for (const tex of Object.values(t)) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...repeat); tex.anisotropy = 8; }
    t.map.colorSpace = THREE.SRGBColorSpace;
  }, [t, repeat]);
  return t;
}

const pointer = { onPointerOver: () => (document.body.style.cursor = "pointer"), onPointerOut: () => (document.body.style.cursor = "") };
const stop = (fn: () => void) => (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); fn(); };

// ---------------------------------------------------------------- architecture
const ROOM = { x0: -7, x1: 7, z0: -5, z1: 9, h: 3.4 };
const WINDOWS: [number, number][] = [[-4.2, -1.4], [-0.8, 2.0], [2.6, 5.4], [6.0, 8.4]];
const SILL = 0.55, HEAD = 3.05;

function Room() {
  const floor = usePBR("herringbone_parquet", [7, 6]);
  const wall = usePBR("painted_plaster_wall", [5, 1.4]);
  // plaster relief from the texture's normal map; the colour is a clean warm white
  const wallMat = <meshStandardMaterial normalMap={wall.normalMap} roughnessMap={wall.roughnessMap} color="#f1eadd" roughness={0.95} />;
  const W = ROOM.x1 - ROOM.x0, D = ROOM.z1 - ROOM.z0, cz = (ROOM.z0 + ROOM.z1) / 2;
  // right wall: piers and spandrels around three tall windows
  const piers: [number, number][] = [];
  let z = ROOM.z0;
  for (const [a, b] of WINDOWS) { piers.push([z, a]); z = b; }
  piers.push([z, ROOM.z1]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, cz]} receiveShadow><planeGeometry args={[W, D]} /><meshStandardMaterial {...floor} roughness={0.55} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.h, cz]}><planeGeometry args={[W, D]} /><meshStandardMaterial color="#f7f4ee" roughness={1} /></mesh>
      <mesh position={[0, ROOM.h / 2, ROOM.z0]} receiveShadow castShadow><boxGeometry args={[W, ROOM.h, 0.1]} />{wallMat}</mesh>
      <mesh position={[0, ROOM.h / 2, ROOM.z1]} receiveShadow><boxGeometry args={[W, ROOM.h, 0.1]} />{wallMat}</mesh>
      <mesh position={[ROOM.x0, ROOM.h / 2, cz]} receiveShadow castShadow><boxGeometry args={[0.1, ROOM.h, D]} />{wallMat}</mesh>
      {/* feature wall behind the evidence board: deep teal */}
      <mesh position={[-0.6, ROOM.h / 2, ROOM.z0 + 0.06]} receiveShadow><boxGeometry args={[7.4, ROOM.h, 0.02]} /><meshStandardMaterial color="#2f6367" roughness={0.9} /></mesh>
      {piers.map(([a, b], i) => (
        <mesh key={i} position={[ROOM.x1, ROOM.h / 2, (a + b) / 2]} castShadow receiveShadow><boxGeometry args={[0.24, ROOM.h, b - a]} />{wallMat}</mesh>
      ))}
      {WINDOWS.map(([a, b], i) => (
        <group key={i}>
          <mesh position={[ROOM.x1, SILL / 2, (a + b) / 2]} castShadow receiveShadow><boxGeometry args={[0.24, SILL, b - a]} />{wallMat}</mesh>
          <mesh position={[ROOM.x1, (HEAD + ROOM.h) / 2, (a + b) / 2]} castShadow receiveShadow><boxGeometry args={[0.24, ROOM.h - HEAD, b - a]} />{wallMat}</mesh>
          {/* black steel frame and mullions */}
          {[a + 0.03, (a + b) / 2, b - 0.03].map((mz, j) => <mesh key={j} position={[ROOM.x1 - 0.02, (SILL + HEAD) / 2, mz]} castShadow><boxGeometry args={[0.06, HEAD - SILL, 0.05]} /><meshStandardMaterial color="#22292b" metalness={0.6} roughness={0.4} /></mesh>)}
          {[SILL + 0.02, SILL + (HEAD - SILL) * 0.62, HEAD - 0.02].map((my, j) => <mesh key={`h${j}`} position={[ROOM.x1 - 0.02, my, (a + b) / 2]} castShadow><boxGeometry args={[0.06, 0.05, b - a]} /><meshStandardMaterial color="#22292b" metalness={0.6} roughness={0.4} /></mesh>)}
          <mesh position={[ROOM.x1 - 0.13, SILL + 0.02, (a + b) / 2]} receiveShadow><boxGeometry args={[0.3, 0.04, b - a]} /><meshStandardMaterial color="#e9e2d4" /></mesh>
        </group>
      ))}
      {/* skirting */}
      <mesh position={[0, 0.06, ROOM.z0 + 0.08]}><boxGeometry args={[W, 0.12, 0.03]} /><meshStandardMaterial color="#e8e0d0" /></mesh>
      <mesh position={[ROOM.x0 + 0.06, 0.06, cz]}><boxGeometry args={[0.03, 0.12, D]} /><meshStandardMaterial color="#e8e0d0" /></mesh>
      {/* a rug under the election table */}
      <Rug />
    </group>
  );
}

/** A woven rug, patterned on a canvas (a kilim: border, field, lozenges, wool noise). */
function Rug() {
  const tex = useCanvas(1024, 720, (g) => {
    const W = 1024, H = 720;
    g.fillStyle = "#7a3324"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#c99a52"; g.fillRect(28, 28, W - 56, H - 56);
    g.fillStyle = "#8a3a29"; g.fillRect(52, 52, W - 104, H - 104);
    for (let x = 60; x < W - 60; x += 46) { g.fillStyle = "#26515a"; g.beginPath(); g.moveTo(x, 40); g.lineTo(x + 12, 30); g.lineTo(x + 24, 40); g.lineTo(x + 12, 50); g.fill(); g.beginPath(); g.moveTo(x, H - 40); g.lineTo(x + 12, H - 50); g.lineTo(x + 24, H - 40); g.lineTo(x + 12, H - 30); g.fill(); }
    const lozenge = (cx: number, cy: number, r: number, c1: string, c2: string) => { g.fillStyle = c1; g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r * 1.3, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r * 1.3, cy); g.fill(); g.fillStyle = c2; g.beginPath(); g.moveTo(cx, cy - r * 0.5); g.lineTo(cx + r * 0.65, cy); g.lineTo(cx, cy + r * 0.5); g.lineTo(cx - r * 0.65, cy); g.fill(); };
    for (let y = 100; y < H - 90; y += 64) for (let x = 100; x < W - 90; x += 72) lozenge(x + ((y / 64) % 2) * 36, y, 18, (x + y) % 3 ? "#6e2a1e" : "#2f5258", "#b98a4e");
    for (let i = 0; i < 60000; i++) { g.fillStyle = `rgba(${Math.random() > 0.5 ? "255,240,220" : "40,20,10"},${Math.random() * 0.12})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 1); }
  }, []);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 1.3]} receiveShadow><planeGeometry args={[4.4, 3.1]} /><meshStandardMaterial map={tex} color="#e2d3c8" roughness={1} /></mesh>;
}

function Lights() {
  return (
    <>
      <hemisphereLight args={["#e6eef5", "#c7a37a", 0.35]} />
      {/* the sun comes through the window wall and throws window-shaped light on the floor */}
      <directionalLight position={[15, 7.5, 4]} intensity={5.5} color="#fff1dc" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03}
        shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-camera-near={1} shadow-camera-far={40} />
      <pointLight position={[0, 2.9, 1.2]} intensity={6} distance={7} color="#ffe4bd" />
      <pointLight position={[-0.6, 2.9, -3.4]} intensity={5} distance={5} color="#fff2dc" />
    </>
  );
}

function Furniture() {
  return (
    <Suspense fallback={null}>
      <Prop name="wooden_display_shelves_01" height={2.1} position={[-6.55, 0, -0.6]} rotation={Math.PI / 2} />
      <Prop name="book_encyclopedia_set_01" width={0.7} position={[-6.55, 1.05, -0.6]} rotation={Math.PI / 2} />
      <Prop name="binder_notebook" width={0.32} position={[-6.5, 1.52, -0.25]} rotation={Math.PI / 2} />
      <Prop name="potted_plant_01" height={1.45} position={[-6.3, 0, -4.3]} />
      <Prop name="pachira_aquatica_01" height={1.95} position={[6.25, 0, -4.4]} />
      <Prop name="potted_plant_02" height={1.0} position={[6.3, 0, 5.7]} />
      <Prop name="potted_plant_02" height={0.9} position={[-6.4, 0, 5.2]} />
      <Prop name="potted_plant_01" height={1.2} position={[-5.2, 0, 3.3]} />
      <Prop name="sofa_02" width={2.1} position={[5.3, 0, -1.2]} rotation={-Math.PI / 2} />
      <Prop name="coffee_table_round_01" width={0.8} position={[4.15, 0, -1.2]} />
      <Prop name="mid_century_lounge_chair" width={0.85} position={[4.3, 0, -3.3]} rotation={-Math.PI * 0.8} />
      <Prop name="wall_clock" width={0.45} position={[6.1, 2.55, -4.92]} />
    </Suspense>
  );
}

// ---------------------------------------------------------------- data-driven objects
function useCanvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, deps: unknown[]) {
  const ref = useRef<THREE.CanvasTexture>();
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => { document.fonts.ready.then(() => setFontsReady(true)); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (ref.current = canvasTexture(w, h, draw, ref.current)), [...deps, fontsReady]);
}

/** A source image, loaded after mount (never from render), redrawing its texture when it lands. */
function useImage(url?: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) return setImg(null);
    const ready = () => setImg(sourceImage(url, ready));
    setImg(sourceImage(url, ready));
    return () => forgetWaiter(url, ready);
  }, [url]);
  return img;
}

const TABLE_TOP = 0.765;
/** The election table: a long oak-veneer top on blackened steel legs. */
function TableBody() {
  const oak = usePBR("oak_veneer_01", [2, 1]);
  return (
    <group position={[0, 0, 1.25]}>
      <RoundedBox args={[2.6, 0.045, 1.25]} radius={0.012} position={[0, TABLE_TOP - 0.0225, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...oak} roughness={0.45} />
      </RoundedBox>
      {[[-1.12, -0.5], [1.12, -0.5], [-1.12, 0.5], [1.12, 0.5]].map(([x, z], i) => (
        <mesh key={i} position={[x, (TABLE_TOP - 0.045) / 2, z]} castShadow><boxGeometry args={[0.05, TABLE_TOP - 0.045, 0.05]} /><meshStandardMaterial color="#26282a" metalness={0.7} roughness={0.35} /></mesh>
      ))}
      <mesh position={[0, TABLE_TOP - 0.09, 0]} castShadow><boxGeometry args={[2.3, 0.05, 0.9]} /><meshStandardMaterial color="#26282a" metalness={0.7} roughness={0.35} /></mesh>
    </group>
  );
}
function ElectionTable({ c, focus, onPin, onCaseFolder }: { c: Case | null; focus: Focus; onPin: (id: Dossier["id"]) => void; onCaseFolder: () => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const pins = useRef<{ id: Dossier["id"]; u: number; v: number }[]>([]);
  const mapTex = useCanvas(MAP.w, MAP.h, (g) => { pins.current = drawMap(g, hover) as typeof pins.current; }, [hover]);
  const articleImg = useImage(c?.sources.find((s) => s.id === c.articleSourceId)?.image?.url ?? c?.sources.find((s) => s.image)?.image?.url);
  const paperTex = useCanvas(768, 1024, (g) => drawNewspaper(g, c, articleImg), [c?.claim, articleImg]);
  const folderTex = useCanvas(512, 360, (g) => {
    g.fillStyle = "#d8bd86"; g.fillRect(0, 0, 512, 360); g.fillStyle = "#4a3a22"; g.font = "600 34px 'IBM Plex Mono'";
    g.fillText(c ? `CASE ${c.id.slice(0, 8).toUpperCase()}` : "NEW CASE", 36, 70); g.fillRect(36, 96, 440, 3); g.fillRect(36, 150, 300, 3);
  }, [c?.id]);
  const MW = 1.5, MH = 0.75;
  return (
    <group position={[0, TABLE_TOP, 1.25]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.05, 0.002, -0.05]} receiveShadow><planeGeometry args={[MW, MH]} /><meshStandardMaterial map={mapTex} roughness={0.9} /></mesh>
      {pins.current.map((p) => {
        const d = DOSSIERS.find((x) => x.id === p.id)!;
        const x = -0.05 + (p.u - 0.5) * MW, z = -0.05 + (p.v - 0.5) * MH;
        return (
          <group key={p.id} position={[x, 0, z]} onClick={stop(() => onPin(p.id))} onPointerOver={() => { setHover(p.id); pointer.onPointerOver(); }} onPointerOut={() => { setHover(null); pointer.onPointerOut(); }}>
            <mesh position={[0, 0.045, 0]} castShadow><cylinderGeometry args={[0.004, 0.004, 0.09]} /><meshStandardMaterial color="#3a3128" metalness={0.5} /></mesh>
            <mesh position={[0, 0.095, 0]} castShadow><sphereGeometry args={[0.022, 24, 24]} /><meshStandardMaterial color={hover === p.id ? "#c0392b" : "#c9a250"} metalness={0.85} roughness={0.25} /></mesh>
            <mesh position={[0, 0.06, 0]}><sphereGeometry args={[0.09]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
            {(focus === "table" || hover === p.id) && (
              <Html position={[0, 0.17, 0]} center distanceFactor={2.2} zIndexRange={[20, 0]}>
                <button onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onPin(p.id); }} aria-label={`Open the ${d.country} dossier: ${d.election}, ${relativeDay(d.date)}`}
                  className="hint whitespace-nowrap rounded-sm bg-[#1b1611]/85 px-2.5 py-1 text-[16px] text-paper hover:bg-[#a3302a]">{d.country} · {relativeDay(d.date)}</button>
              </Html>
            )}
          </group>
        );
      })}
      {/* the night edition and the case folder */}
      <mesh rotation={[-Math.PI / 2, 0, 0.12]} position={[-0.95, 0.003, 0.12]} castShadow receiveShadow><planeGeometry args={[0.42, 0.56]} /><meshStandardMaterial map={paperTex} roughness={0.95} /></mesh>
      <group position={[0.9, 0, 0.2]} rotation={[0, -0.18, 0]} onClick={stop(onCaseFolder)} {...pointer}>
        <mesh position={[0, 0.012, 0]} castShadow receiveShadow><boxGeometry args={[0.42, 0.024, 0.31]} /><meshStandardMaterial color="#c9a76a" roughness={0.85} /></mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0255, 0]}><planeGeometry args={[0.4, 0.29]} /><meshStandardMaterial map={folderTex} roughness={0.9} /></mesh>
      </group>
      <Suspense fallback={null}><Prop name="office_notepads" width={0.3} position={[0.55, 0, -0.32]} rotation={0.4} /></Suspense>
    </group>
  );
}

type DeskCfg = { pos: [number, number, number]; rot: number };
export const DESKS: Record<Advocate, DeskCfg> = {
  prosecutor: { pos: [-3.1, 0, 2.7], rot: 0.7 },
  defender: { pos: [3.3, 0, 2.9], rot: -0.75 },
  investigator: { pos: [-4.0, 0, -1.7], rot: 0.75 },
};
const DESK_TOP = 0.75;

// hanging signs lean toward the room's centre so the frame edge never crops them
const SIGN_SHIFT: Record<Advocate, number> = { prosecutor: 0.55, defender: -0.6, investigator: 0.75 };
const SIGN_Y: Record<Advocate, number> = { prosecutor: 2.45, defender: 2.45, investigator: 2.85 };
const DESK_ACCENT: Record<Advocate, string> = { prosecutor: "#b23f2c", defender: "#5f6d3c", investigator: "#d4a03c" };
const DESK_TITLE: Record<Advocate, string> = { prosecutor: "Prosecution", defender: "Defence", investigator: "Investigation" };

function Workstation({ role, c, now, onOpen }: { role: Advocate; c: Case | null; now: number; onOpen: () => void }) {
  const cfg = DESKS[role], look = AGENT_LOOK[role];
  const busy = !!c?.busy[role];
  const lines = (c?.activity ?? []).filter((a) => a.role === role && a.kind !== "thinking");
  const filing = c?.filings.filter((f) => f.role === role).at(-1);
  const onLead = !!c && c.phase === "leads" && c.leads.some((l) => l.assignee === role && l.status === "assigned");
  const screen = useCanvas(768, 448, (g) => drawScreen(g, role, look.plate, busy, lines, filing, !!c, look.purpose), [busy, lines.length, filing?.at, !!c]);
  const status = !c ? look.purpose : busy ? (onLead ? "Chasing a lead" : "Working now") : filing ? `Filed: ${filing.timedOut ? "no filing" : filing.stance}` : "Standing by";
  const sign = useCanvas(1024, 300, (g) => drawDeskSign(g, `${DESK_TITLE[role]} desk`, status, DESK_ACCENT[role], busy), [status, busy]);
  const chair = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (chair.current) chair.current.rotation.y = busy ? Math.sin(clock.elapsedTime * 1.1) * 0.06 : 0.12; });
  const sheets = c?.evidence.filter((e) => e.citedBy === role).length ?? 0;
  const speech = latestSpeech(c, role, now);
  const pose = busy ? (onLead ? "phone" : "typing") : c ? "reading" : "typing";
  return (
    <group position={cfg.pos} rotation={[0, cfg.rot, 0]}>
      <Suspense fallback={null}>
        <Prop name="metal_office_desk" width={1.6} position={[0, 0, 0]} />
        <group ref={chair} position={[-0.42, 0, 0.72]}>
          <Prop name="modern_arm_chair_01" height={0.95} position={[0, 0, 0]} />
        </group>
        <Prop name="desk_lamp_arm_01" height={0.5} position={[-0.68, DESK_TOP, -0.25]} rotation={0.6} />
      </Suspense>
      {/* the reporter: sits to one side so the screen stays readable from the room */}
      <Person look={PEOPLE[role]} pose={pose} seated busy={busy} position={[-0.42, 0, 0.66]} rotation={Math.PI + 0.25} />
      {busy && <pointLight position={[-0.5, DESK_TOP + 0.45, 0]} intensity={2.2} distance={2.2} color="#ffd9a0" />}
      {/* a large monitor: the hotspot */}
      <group position={[0.12, DESK_TOP, -0.22]} onClick={stop(onOpen)} {...pointer}>
        <mesh position={[0, 0.13, 0]} castShadow><boxGeometry args={[0.06, 0.26, 0.06]} /><meshStandardMaterial color="#2a2b2d" metalness={0.6} roughness={0.35} /></mesh>
        <mesh position={[0, 0.006, 0]} castShadow><boxGeometry args={[0.32, 0.012, 0.2]} /><meshStandardMaterial color="#2a2b2d" metalness={0.6} roughness={0.35} /></mesh>
        <RoundedBox args={[1.12, 0.66, 0.04]} radius={0.014} position={[0, 0.6, 0]} castShadow><meshStandardMaterial color="#1f2022" metalness={0.4} roughness={0.35} /></RoundedBox>
        <mesh position={[0, 0.6, 0.021]}><planeGeometry args={[1.07, 0.62]} /><meshBasicMaterial map={screen} toneMapped={false} /></mesh>
        <mesh position={[0, 0.6, 0.06]}><planeGeometry args={[1.2, 0.75]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      </group>
      {/* paper tray: one sheet per verified exhibit */}
      <group position={[0.62, DESK_TOP, 0.12]}>
        <mesh position={[0, 0.006, 0]}><boxGeometry args={[0.3, 0.012, 0.36]} /><meshStandardMaterial color="#3a3a38" metalness={0.5} roughness={0.4} /></mesh>
        {Array.from({ length: Math.min(sheets, 10) }, (_, i) => <mesh key={i} position={[(i % 2) * 0.006, 0.014 + i * 0.004, 0]} rotation={[0, (i % 3 - 1) * 0.04, 0]} castShadow><boxGeometry args={[0.21, 0.003, 0.297]} /><meshStandardMaterial color="#f4efe2" roughness={0.9} /></mesh>)}
      </group>
      {/* the desk's hanging sign */}
      <group position={[SIGN_SHIFT[role], SIGN_Y[role], -0.25]}>
        {[-0.45, 0.45].map((x) => <mesh key={x} position={[x, (3.4 - SIGN_Y[role]) / 2, 0]}><cylinderGeometry args={[0.004, 0.004, 3.4 - SIGN_Y[role]]} /><meshStandardMaterial color="#555" /></mesh>)}
        <mesh castShadow><boxGeometry args={[1.1, 0.34, 0.02]} /><meshStandardMaterial color="#f7f1e3" /></mesh>
        <mesh position={[0, 0, 0.011]}><planeGeometry args={[1.08, 0.32]} /><meshBasicMaterial map={sign} toneMapped={false} /></mesh>
      </group>
      {speech && (
        <Html position={[0, 2.05, 0]} center distanceFactor={4} zIndexRange={[30, 0]}>
          <div className="pointer-events-none w-[260px] rounded-[12px] border-2 bg-[#fffaf0] px-3 py-2 text-[#2b241c] shadow-lg" style={{ borderColor: speech.tone }}>
            <p className="typed text-[12px] uppercase tracking-wide" style={{ color: speech.tone }}>{look.name}</p>
            <p className="hand text-[23px] leading-[1.05]">{speech.text}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);
function latestSpeech(c: Case | null, r: Advocate, now: number) {
  if (!c) return null;
  const recent = (at: number) => at <= now && now - at < 7000;
  const ch = c.challenges.filter((x) => x.from === r && recent(x.at)).at(-1);
  if (ch) return { tone: "#a3302a", text: `${ch.kind === "framing" ? "That's framing" : "That's wrong"}, ${ch.to}: ${clip(ch.point, 70)}` };
  const rb = c.rebuttals.filter((x) => x.by === r && recent(x.at)).at(-1);
  if (rb) return { tone: rb.concede ? "#4f7d4a" : "#2f5f63", text: rb.concede ? `Fair point. I concede ${rb.challengeId}.` : `Not so: ${clip(rb.response, 64)}` };
  const ld = c.leads.filter((l) => l.by === r && recent(l.at)).at(-1);
  if (ld) return { tone: "#8a6420", text: `Lead! ${clip(ld.question, 70)}` };
  const assigned = c.phase === "leads" && c.leads.find((l) => l.assignee === r && l.status === "assigned");
  if (assigned && c.busy[r]) return { tone: "#2f5f63", text: `On it: ${clip(assigned.question, 60)}` };
  return null;
}

// ---------------------------------------------------------------- the evidence wall
const BOARD = { pos: V(-0.6, 1.72, -4.9), w: 5.6, h: 2.4 };
const DOC = { w: 0.6, h: 0.75 };
const CLAIM = { x: 0, y: 0.72, w: 1.32, h: 0.54 };
const SLOTS: [number, number][] = [[-2.3, 0.7], [-1.52, 0.66], [1.52, 0.66], [2.3, 0.7], ...[-2.3, -1.4, -0.47, 0.47, 1.4, 2.3].map((x) => [x, -0.12] as [number, number])];
const LEAD_SLOTS: [number, number][] = [[-2.3, -0.86], [-1.52, -0.88], [-0.74, -0.86], [0.04, -0.89]];
const BEARING_COLOR: Record<string, string> = { supports: "#4f7d4a", undermines: "#b3302a", contradicts: "#b3302a", context: "#b8862f" };

function Doc({ e, c, at, onOpen }: { e: Evidence; c: Case; at: [number, number]; onOpen: () => void }) {
  const src = c.sources.find((s) => s.id === e.sourceId);
  const img = useImage(src?.image?.url);
  const tex = useCanvas(512, 640, (g) => drawClipping(g, e, src, img), [e.id, img]);
  const tilt = (((e.id.charCodeAt(e.id.length - 1) * 37) % 7) - 3) * 0.012;
  return (
    <group position={[at[0], at[1], 0.03]} rotation={[0, 0, tilt]} onClick={stop(onOpen)} {...pointer}>
      <mesh castShadow><boxGeometry args={[DOC.w, DOC.h, 0.003]} /><meshStandardMaterial color="#f3ecdc" roughness={0.95} /></mesh>
      <mesh position={[0, 0, 0.0018]}><planeGeometry args={[DOC.w, DOC.h]} /><meshStandardMaterial map={tex} roughness={0.92} /></mesh>
      <Pin y={DOC.h / 2 - 0.035} color={BEARING_COLOR[e.bearing] ?? "#b8862f"} />
    </group>
  );
}

function Research({ at, country, quote, publisher, date }: { at: [number, number]; country: string; quote: string; publisher: string; date: string }) {
  const tex = useCanvas(512, 640, (g) => drawResearch(g, country, quote, publisher, date), [quote]);
  return (
    <group position={[at[0], at[1], 0.03]} rotation={[0, 0, (at[0] * 0.01)]}>
      <mesh castShadow><boxGeometry args={[DOC.w * 1.1, DOC.h * 1.1, 0.003]} /><meshStandardMaterial color="#f3ecdc" /></mesh>
      <mesh position={[0, 0, 0.0018]}><planeGeometry args={[DOC.w * 1.1, DOC.h * 1.1]} /><meshStandardMaterial map={tex} roughness={0.92} /></mesh>
      <Pin y={DOC.h * 0.55 - 0.035} color="#2f5f63" />
    </group>
  );
}

/** Three framed election posters on the side wall: the product's purpose, visible from the door. */
function ElectionPosters() {
  const accents: Record<string, string> = { rs: "#a3302a", us: "#2c3e5c", za: "#2f6f4f" };
  return (
    <>
      {DOSSIERS.map((d, i) => <Poster key={d.id} d={d} accent={accents[d.id]} z={1.2 + i * 1.45} />)}
    </>
  );
}
function Poster({ d, accent, z }: { d: (typeof DOSSIERS)[number]; accent: string; z: number }) {
  const tex = useCanvas(600, 800, (g) => drawPoster(g, d.atlasId, d.country, d.election, d.date, accent), [d.id]);
  return (
    <group position={[ROOM.x0 + 0.08, 1.75, z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh castShadow><boxGeometry args={[0.98, 1.28, 0.04]} /><meshStandardMaterial color="#1f1f1f" roughness={0.45} /></mesh>
      <mesh position={[0, 0, 0.021]}><planeGeometry args={[0.9, 1.2]} /><meshStandardMaterial map={tex} roughness={0.7} /></mesh>
    </group>
  );
}

function Pin({ y, color }: { y: number; color: string }) {
  return <mesh position={[0, y, 0.015]} castShadow><sphereGeometry args={[0.018, 16, 16]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.2} /></mesh>;
}

function LeadCard({ l, at }: { l: Case["leads"][number]; at: [number, number] }) {
  const tex = useCanvas(512, 400, (g) => drawLead(g, l), [l.status, l.question]);
  return (
    <group position={[at[0], at[1], 0.03]} rotation={[0, 0, ((l.id.charCodeAt(1) * 13) % 7 - 3) * 0.015]}>
      <mesh castShadow><planeGeometry args={[0.6, 0.47]} /><meshStandardMaterial map={tex} roughness={0.95} side={THREE.DoubleSide} /></mesh>
      <Pin y={0.2} color="#2f5f63" />
    </group>
  );
}

function EvidenceBoard({ c, onFocus, onEvidence, onVerdict, focused }: { c: Case | null; onFocus: () => void; onEvidence: (id: string) => void; onVerdict: () => void; focused: boolean }) {
  const cork = useCanvas(1024, 440, (g) => {
    g.fillStyle = "#c79e72"; g.fillRect(0, 0, 1024, 440);
    for (let i = 0; i < 26000; i++) { const t = Math.random(); g.fillStyle = t > 0.5 ? `rgba(120,80,40,${Math.random() * 0.35})` : `rgba(240,210,170,${Math.random() * 0.25})`; g.fillRect(Math.random() * 1024, Math.random() * 440, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  }, []);
  cork.wrapS = cork.wrapT = THREE.RepeatWrapping;
  const claimTex = useCanvas(1024, 420, (g) => drawClaim(g, c), [c?.claim]);
  const verdict = c?.verdicts.at(-1);
  const verdictTex = useCanvas(768, 520, (g) => verdict && drawVerdict(g, verdict), [verdict?.at]);
  const evidence = (c?.evidence ?? []).slice(0, SLOTS.length);
  const leads = (c?.leads ?? []).slice(-LEAD_SLOTS.length);
  return (
    <group position={BOARD.pos}>
      {/* oak frame and cork */}
      <mesh position={[0, 0, -0.03]} castShadow receiveShadow onClick={!focused ? stop(onFocus) : undefined} {...(!focused ? pointer : {})}>
        <boxGeometry args={[BOARD.w + 0.12, BOARD.h + 0.12, 0.05]} /><meshStandardMaterial color="#9b6b3e" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0]} receiveShadow onClick={!focused ? stop(onFocus) : undefined}><planeGeometry args={[BOARD.w, BOARD.h]} /><meshStandardMaterial map={cork} roughness={1} /></mesh>
      <group position={[CLAIM.x, CLAIM.y, 0.03]}>
        <mesh castShadow><boxGeometry args={[CLAIM.w, CLAIM.h, 0.003]} /><meshStandardMaterial color="#f7f1e2" /></mesh>
        <mesh position={[0, 0, 0.0018]}><planeGeometry args={[CLAIM.w, CLAIM.h]} /><meshStandardMaterial map={claimTex} roughness={0.92} /></mesh>
        <Pin y={CLAIM.h / 2 - 0.04} color="#b3302a" />
      </group>
      {evidence.map((e, i) => {
        const [x, y] = SLOTS[i];
        const from: [number, number, number] = [x, y + DOC.h / 2 - 0.035, 0.05];
        const to: [number, number, number] = [CLAIM.x + x * 0.18, CLAIM.y - CLAIM.h / 2 + 0.03, 0.05];
        const sag = new THREE.QuadraticBezierCurve3(V(...from), V((from[0] + to[0]) / 2, Math.min(from[1], to[1]) - 0.14, 0.06), V(...to));
        return (
          <group key={e.id}>
            <Line points={sag.getPoints(24)} color={BEARING_COLOR[e.bearing] ?? "#b8862f"} lineWidth={2.2} />
            {c && <Doc e={e} c={c} at={[x, y]} onOpen={() => onEvidence(e.id)} />}
          </group>
        );
      })}
      {leads.map((l, i) => <LeadCard key={l.id} l={l} at={LEAD_SLOTS[i]} />)}
      {!c && DOSSIERS.map((d, i) => { const q = d.context.at(-1)!; return <Research key={d.id} at={[[-1.4, -0.2], [0, -0.25], [1.4, -0.2]][i] as [number, number]} country={d.country} quote={q.quote} publisher={q.publisher} date={q.date} />; })}
      {verdict && (
        <group position={[1.85, -0.82, 0.04]} rotation={[0, 0, 0.03]} onClick={stop(onVerdict)} {...pointer}>
          <mesh castShadow><boxGeometry args={[1.1, 0.745, 0.004]} /><meshStandardMaterial color="#fbf6e8" /></mesh>
          <mesh position={[0, 0, 0.0025]}><planeGeometry args={[1.1, 0.745]} /><meshStandardMaterial map={verdictTex} roughness={0.9} /></mesh>
          <Pin y={0.33} color="#222" />
        </group>
      )}
      {/* picture light over the board */}
      <spotLight position={[0, BOARD.h / 2 + 0.3, 1.4]} target-position={[0, 0, 0]} angle={0.9} penumbra={0.8} intensity={6} distance={6} color="#fff0d8" />
    </group>
  );
}

/** Source images hang as framed prints beside the board: each is the source's own picture. */
function SourcePrints({ c, onSource }: { c: Case | null; onSource: (id: string) => void }) {
  const withImg = (c?.sources ?? []).filter((s) => s.image).slice(0, 2);
  return (
    <>
      {withImg.map((s, i) => <Print key={s.id} url={s.image!.url} pos={[-5.6, 2.15 - i * 0.95, -4.92]} onClick={() => onSource(s.id)} />)}
    </>
  );
}
function Print({ url, pos, onClick }: { url: string; pos: [number, number, number]; onClick: () => void }) {
  const img = useImage(url);
  const tex = useCanvas(640, 480, (g) => { g.fillStyle = "#f4efe6"; g.fillRect(0, 0, 640, 480); if (img) { const r = Math.max(560 / img.width, 400 / img.height); const sw = 560 / r, sh = 400 / r; g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 40, 40, 560, 400); } }, [img]);
  return (
    <group position={pos} onClick={stop(onClick)} {...pointer}>
      <mesh castShadow><boxGeometry args={[1.0, 0.76, 0.04]} /><meshStandardMaterial color="#1e1e1e" roughness={0.5} /></mesh>
      <mesh position={[0, 0, 0.021]}><planeGeometry args={[0.92, 0.69]} /><meshStandardMaterial map={tex} roughness={0.6} /></mesh>
    </group>
  );
}

/** The editor-in-chief (the Judge agent) at the table; at the wall when the case reaches the bench. A researcher works the shelves. */
function People({ c }: { c: Case | null }) {
  const bench = c?.phase === "deliberation" || c?.phase === "verdict";
  return (
    <>
      {bench
        ? <Person look={PEOPLE.judge} pose={c?.busy.judge ? "reading" : "pointing"} position={[2.25, 0, -4.05]} rotation={Math.PI - 0.35} />
        : <Person look={PEOPLE.judge} pose="leaning" position={[0.15, 0, 2.15]} rotation={Math.PI} />}
      <Person look={PEOPLE.researcher} pose="reading" position={[-5.75, 0, 0.25]} rotation={-Math.PI / 2 + 0.3} />
    </>
  );
}

/** The election desk's identity: sign over the board, live election screen, news ticker. */
function DeskIdentity({ c }: { c: Case | null }) {
  const sign = useCanvas(2048, 200, (g) => drawWallSign(g), []);
  const rows = DOSSIERS.map((d) => ({ country: d.country, election: d.election, when: relativeDay(d.date), held: Date.parse(d.date) < Date.now() }));
  const screen = useCanvas(1600, 900, (g) => drawElectionScreen(g, rows, c?.claim ?? null, c?.phase ?? null), [c?.claim, c?.phase]);
  const items = [
    ...DOSSIERS.map((d) => `${d.country.toUpperCase()}: ${d.election} · ${relativeDay(d.date)}`),
    ...DOSSIERS.map((d) => `${d.context.at(-1)!.publisher}: “${d.context.at(-1)!.quote.split(" ").slice(0, 14).join(" ")}…”`),
    ...(c ? c.activity.filter((a) => a.kind === "phase").slice(-3).map((a) => `DESK: ${a.text}`) : []),
  ];
  const ticker = useCanvas(4096, 128, (g) => drawTicker(g, items), [items.join("|")]);
  ticker.wrapS = THREE.RepeatWrapping;
  useFrame((_, dt) => { ticker.offset.x = (ticker.offset.x + dt * 0.035) % 1; });
  return (
    <group>
      <mesh position={[-0.6, 3.12, ROOM.z0 + 0.08]}><planeGeometry args={[5.6, 0.55]} /><meshBasicMaterial map={sign} transparent toneMapped={false} /></mesh>
      {/* the election screen, wall-mounted, with the ticker running under it */}
      <group position={[4.45, 1.8, ROOM.z0 + 0.09]}>
        <RoundedBox args={[2.4, 1.39, 0.06]} radius={0.015} castShadow><meshStandardMaterial color="#141414" metalness={0.4} roughness={0.3} /></RoundedBox>
        <mesh position={[0, 0, 0.032]}><planeGeometry args={[2.32, 1.31]} /><meshBasicMaterial map={screen} toneMapped={false} /></mesh>
      </group>
      <mesh position={[-0.6, 0.36, ROOM.z0 + 0.09]}><boxGeometry args={[7.4, 0.2, 0.03]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[-0.6, 0.36, ROOM.z0 + 0.106]}><planeGeometry args={[7.3, 0.16]} /><meshBasicMaterial map={ticker} toneMapped={false} /></mesh>
    </group>
  );
}

/** A verified quote travels from the desk that found it to the wall. */
function FlyingPapers({ c, now }: { c: Case | null; now: number }) {
  const recent = (c?.evidence ?? []).filter((e) => e.at <= now && now - e.at < 2600);
  return <>{recent.map((e) => <Flyer key={e.id} e={e} c={c!} now={now} />)}</>;
}
function Flyer({ e, c, now }: { e: Evidence; c: Case; now: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const desk = DESKS[e.citedBy as Advocate] ?? DESKS.investigator;
  const idx = Math.max(0, c.evidence.findIndex((x) => x.id === e.id));
  const slot = SLOTS[Math.min(idx, SLOTS.length - 1)];
  const a = V(desk.pos[0], 1.2, desk.pos[2]), b = V(BOARD.pos.x + slot[0], BOARD.pos.y + slot[1], BOARD.pos.z + 0.1);
  const ctrl = a.clone().lerp(b, 0.5).setY(2.9);
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(a, ctrl, b), [e.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = useRef(performance.now() - Math.max(0, now - e.at) / 4);
  useFrame(() => {
    const t = Math.min(1, (performance.now() - start.current) / 1400);
    if (!ref.current) return;
    ref.current.position.copy(curve.getPoint(t));
    ref.current.rotation.set(-0.4 * (1 - t), t * 0.4, Math.sin(t * Math.PI) * 0.6);
    ref.current.visible = t < 1;
  });
  return <mesh ref={ref} castShadow><planeGeometry args={[0.3, 0.38]} /><meshStandardMaterial color="#f6f1e4" side={THREE.DoubleSide} /></mesh>;
}

// ---------------------------------------------------------------- the scene
export default function Newsroom3D({ c, now, focus, sheetOpen, onFocus, onPin, onCaseFolder, onAgent, onEvidence, onVerdict, onSource }: {
  c: Case | null; now: number; focus: Focus; sheetOpen: boolean;
  onFocus: (f: Focus) => void; onPin: (id: Dossier["id"]) => void; onCaseFolder: () => void; onAgent: (r: Advocate) => void;
  onEvidence: (id: string) => void; onVerdict: () => void; onSource: (id: string) => void;
}) {
  return (
    <div className="absolute inset-0 isolate bg-[#dfe7ec]">
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: (focus === "intro" ? PRESETS.intro : PRESETS.overview).pos, fov: 48, near: 0.05, far: 200 }} gl={{ antialias: true, preserveDrawingBuffer: true, toneMappingExposure: 1.15 }}>
        <Suspense fallback={null}>
          <Environment files={`${A}/hdri/canary_wharf_2k.hdr`} background environmentIntensity={0.6} backgroundIntensity={1.15} backgroundRotation={[0, HDRI_ROT, 0]} environmentRotation={[0, HDRI_ROT, 0]} />
          <Lights />
          <Room />
          <Furniture />
          <TableBody />
          <ElectionTable c={c} focus={focus} onPin={onPin} onCaseFolder={onCaseFolder} />
          {(Object.keys(DESKS) as Advocate[]).map((r) => <Workstation key={r} role={r} c={c} now={now} onOpen={() => onAgent(r)} />)}
          <EvidenceBoard c={c} focused={focus === "wall"} onFocus={() => onFocus("wall")} onEvidence={onEvidence} onVerdict={onVerdict} />
          <SourcePrints c={c} onSource={onSource} />
          <ElectionPosters />
          <DeskIdentity c={c} />
          <People c={c} />
          <FlyingPapers c={c} now={now} />
        </Suspense>
        <Rig focus={focus} sheetOpen={sheetOpen} />
      </Canvas>
    </div>
  );
}

useGLTF.preload(`${A}/models/metal_office_desk/metal_office_desk.gltf`);
useGLTF.preload(`${A}/models/modern_arm_chair_01/modern_arm_chair_01.gltf`);
