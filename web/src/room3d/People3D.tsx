import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/**
 * Newsroom people as sculptural figures (the matte, faceless style of architectural
 * visualisation): believable presence without uncanny faces or licence-encumbered characters.
 * Agents' figures are posed by case events; the researcher at the shelves is set dressing.
 */

export type Pose = "typing" | "phone" | "leaning" | "standing" | "pointing" | "reading";
export type Look = { skin: string; hair: string; top: string; legs: string; hairStyle: "short" | "bun" | "long" | "curls" | "bald" };

// a tapered torso: hips → waist → chest → shoulders, lathed and flattened front-to-back
const torsoGeo = (() => {
  const pts = [[0.0, 0], [0.155, 0], [0.165, 0.05], [0.145, 0.2], [0.17, 0.38], [0.19, 0.5], [0.17, 0.57], [0.07, 0.62], [0.0, 0.62]].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 32);
  g.scale(1, 1, 0.62);
  return g;
})();

function mat(color: string, rough = 0.85) { return <meshStandardMaterial color={color} roughness={rough} />; }

function Limb({ len, r, color, rot, pos }: { len: number; r: number; color: string; rot?: [number, number, number]; pos?: [number, number, number] }) {
  // a capsule hanging down from its pivot
  return (
    <group position={pos} rotation={rot}>
      <mesh position={[0, -len / 2, 0]} castShadow><capsuleGeometry args={[r, len, 6, 16]} />{mat(color)}</mesh>
    </group>
  );
}

function Hair({ look }: { look: Look }) {
  const c = look.hair;
  if (look.hairStyle === "bald") return null;
  return (
    <group>
      <mesh position={[0, 0.03, -0.012]} scale={[1.06, look.hairStyle === "curls" ? 1.12 : 1.02, 1.08]} castShadow>
        <sphereGeometry args={[0.105, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />{mat(c, 0.95)}
      </mesh>
      {look.hairStyle === "bun" && <mesh position={[0, 0.06, -0.11]} castShadow><sphereGeometry args={[0.05, 16, 12]} />{mat(c, 0.95)}</mesh>}
      {look.hairStyle === "long" && <mesh position={[0, -0.08, -0.06]} castShadow><capsuleGeometry args={[0.085, 0.16, 6, 16]} />{mat(c, 0.95)}</mesh>}
      {look.hairStyle === "curls" && [-0.07, 0, 0.07].map((x) => <mesh key={x} position={[x, 0.05, -0.07]} castShadow><sphereGeometry args={[0.055, 12, 10]} />{mat(c, 1)}</mesh>)}
    </group>
  );
}

/** One person. Origin at the feet (standing) or the seat (seated poses use `seated`). */
export function Person({ look, pose, seated, position, rotation = 0, busy }: { look: Look; pose: Pose; seated?: boolean; position: [number, number, number]; rotation?: number; busy?: boolean }) {
  const fore = useRef<THREE.Group>(null), fore2 = useRef<THREE.Group>(null), head = useRef<THREE.Group>(null), body = useRef<THREE.Group>(null);
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed;
    if (body.current) body.current.position.y = Math.sin(t * 1.4) * 0.004; // breathing
    if (pose === "typing" && fore.current && fore2.current) {
      const k = busy ? 1 : 0.15;
      fore.current.rotation.x = -1.35 + Math.sin(t * 9) * 0.06 * k;
      fore2.current.rotation.x = -1.35 + Math.sin(t * 9 + 1.7) * 0.06 * k;
    }
    if (head.current) head.current.rotation.y = pose === "typing" ? Math.sin(t * 0.5) * 0.06 : Math.sin(t * 0.3) * 0.18;
  });

  const hip = seated ? 0.47 : 0.92;
  const lean = pose === "typing" ? 0.14 : pose === "leaning" ? 0.5 : pose === "reading" ? 0.08 : 0;
  // arm angles (x = forward swing, z = sideways)
  const arms: Record<Pose, { l: [number, number, number]; r: [number, number, number]; lf: number; rf: number }> = {
    typing: { l: [-0.55, 0, 0.12], r: [-0.55, 0, -0.12], lf: -1.35, rf: -1.35 },
    phone: { l: [-0.45, 0, 0.12], r: [-0.3, 0, -0.35], lf: -1.2, rf: -2.5 },
    leaning: { l: [-1.0, 0, 0.18], r: [-1.0, 0, -0.18], lf: -0.25, rf: -0.25 },
    standing: { l: [0.05, 0, 0.08], r: [0.05, 0, -0.08], lf: -0.15, rf: -0.15 },
    pointing: { l: [0.05, 0, 0.08], r: [-2.1, 0, -0.25], lf: -0.15, rf: -0.1 },
    reading: { l: [-0.6, 0, 0.15], r: [-0.6, 0, -0.15], lf: -1.5, rf: -1.5 },
  };
  const a = arms[pose];

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group ref={body}>
        {/* legs */}
        {seated ? (
          <>
            {[-0.09, 0.09].map((x) => (
              <group key={x} position={[x, hip, 0]}>
                <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow><capsuleGeometry args={[0.07, 0.36, 6, 16]} />{mat(look.legs)}</mesh>
                <mesh position={[0, -0.22, 0.42]} castShadow><capsuleGeometry args={[0.058, 0.38, 6, 16]} />{mat(look.legs)}</mesh>
                <mesh position={[0, -0.44, 0.47]} castShadow><boxGeometry args={[0.09, 0.06, 0.22]} />{mat("#2a2622", 0.6)}</mesh>
              </group>
            ))}
          </>
        ) : (
          <>
            {[-0.09, 0.09].map((x) => (
              <group key={x} position={[x, 0, 0]}>
                <mesh position={[0, 0.48, 0]} castShadow><capsuleGeometry args={[0.068, 0.78, 6, 16]} />{mat(look.legs)}</mesh>
                <mesh position={[0, 0.03, 0.04]} castShadow><boxGeometry args={[0.09, 0.06, 0.24]} />{mat("#2a2622", 0.6)}</mesh>
              </group>
            ))}
          </>
        )}
        {/* torso, head and arms pivot at the hips */}
        <group position={[0, hip - 0.02, 0]} rotation={[lean, 0, 0]}>
          <mesh geometry={torsoGeo} castShadow>{mat(look.top)}</mesh>
          <mesh position={[0, 0.66, 0]} castShadow><cylinderGeometry args={[0.042, 0.048, 0.08, 16]} />{mat(look.skin, 0.7)}</mesh>
          <group ref={head} position={[0, 0.79, 0.01]}>
            <mesh scale={[0.9, 1.1, 0.98]} castShadow><sphereGeometry args={[0.1, 32, 24]} />{mat(look.skin, 0.65)}</mesh>
            <Hair look={look} />
            {pose === "phone" && <mesh position={[-0.1, -0.01, 0.02]} rotation={[0, 0, 0.2]} castShadow><boxGeometry args={[0.02, 0.13, 0.065]} />{mat("#1d1d1f", 0.3)}</mesh>}
          </group>
          {/* arms from the shoulders */}
          {([[-0.2, a.l, a.lf, fore], [0.2, a.r, a.rf, fore2]] as const).map(([x, rot, foreAngle, ref], i) => (
            <group key={i} position={[x, 0.55, 0]} rotation={rot as unknown as THREE.Euler}>
              <Limb len={0.27} r={0.048} color={look.top} />
              <group ref={ref} position={[0, -0.3, 0]} rotation={[foreAngle, 0, 0]}>
                <Limb len={0.23} r={0.042} color={look.top} />
                <mesh position={[0, -0.29, 0]} castShadow><sphereGeometry args={[0.045, 16, 12]} />{mat(look.skin, 0.7)}</mesh>
                {pose === "reading" && i === 1 && <mesh position={[0.1, -0.3, 0.02]} rotation={[0.3, 0, 0.1]} castShadow><boxGeometry args={[0.21, 0.297, 0.006]} />{mat("#f4efe2", 0.9)}</mesh>}
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

export const PEOPLE: Record<"prosecutor" | "defender" | "investigator" | "judge" | "researcher", Look> = {
  prosecutor: { skin: "#8a5a3c", hair: "#1c1410", top: "#b23f2c", legs: "#2c2f38", hairStyle: "curls" },
  defender: { skin: "#e1b493", hair: "#8d8780", top: "#5f6d3c", legs: "#3a3833", hairStyle: "short" },
  investigator: { skin: "#c48a60", hair: "#241812", top: "#d4a03c", legs: "#2f3a4a", hairStyle: "bun" },
  judge: { skin: "#efc9a6", hair: "#dcd6cf", top: "#24364f", legs: "#24364f", hairStyle: "short" },
  researcher: { skin: "#5e3d2a", hair: "#140e0b", top: "#3f6f78", legs: "#3b3330", hairStyle: "long" },
};
