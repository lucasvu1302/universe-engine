import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LaunchController } from "./LaunchController";

interface SpaceportTerrainProps {
  altitudeKm?: number;
}

const NOOP_RAYCAST: THREE.Object3D["raycast"] = () => {};

function createWeatheredConcreteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#525e6e";
    ctx.fillRect(0, 0, 512, 512);

    // Subtle aggregate asphalt/concrete grain & blast soot streaks
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 6500; i++) {
      const x = rand() * 512;
      const y = rand() * 512;
      const lum = Math.floor(62 + rand() * 54);
      ctx.fillStyle = `rgba(${lum}, ${lum + 4}, ${lum + 10}, 0.28)`;
      ctx.fillRect(x, y, 2.2, 2.2);
    }

    // Expansion joint grid lines across concrete pad slabs
    ctx.strokeStyle = "rgba(15, 23, 42, 0.38)";
    ctx.lineWidth = 1.5;
    for (let g = 0; g <= 512; g += 64) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, 512);
      ctx.moveTo(0, g);
      ctx.lineTo(512, g);
      ctx.stroke();
    }

    // Center thermal blast scorch gradient around flame trench
    const scorch = ctx.createRadialGradient(256, 256, 12, 256, 256, 165);
    scorch.addColorStop(0, "rgba(12, 15, 24, 0.72)");
    scorch.addColorStop(0.45, "rgba(30, 35, 44, 0.36)");
    scorch.addColorStop(1, "rgba(82, 94, 110, 0.0)");
    ctx.fillStyle = scorch;
    ctx.fillRect(0, 0, 512, 512);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function createMarshGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#243826";
    ctx.fillRect(0, 0, 256, 256);

    let seed = 109;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 2400; i++) {
      const x = rand() * 256;
      const y = rand() * 256;
      const g = Math.floor(42 + rand() * 38);
      ctx.fillStyle = `rgba(${Math.floor(g * 0.65)}, ${g}, ${Math.floor(g * 0.6)}, 0.34)`;
      ctx.fillRect(x, y, 3, 3);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(28, 28);
  return tex;
}

function createHorizonFadeAlphaMap(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 256, 256);
    const grad = ctx.createRadialGradient(128, 128, 22, 128, 128, 126);
    grad.addColorStop(0.0, "#ffffff");
    grad.addColorStop(0.42, "#cbd5e1");
    grad.addColorStop(0.74, "#475569");
    grad.addColorStop(1.0, "#000000");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

export const SpaceportTerrain: React.FC<SpaceportTerrainProps> = ({ altitudeKm = 0 }) => {
  const terrainGroupRef = useRef<THREE.Group>(null);
  const lastFadeRef = useRef<number>(-1);
  const initialOpacity = THREE.MathUtils.clamp(1.0 - altitudeKm / 12.0, 0.0, 1.0);

  const concreteTex = useMemo(() => createWeatheredConcreteTexture(), []);
  const marshTex = useMemo(() => createMarshGrassTexture(), []);
  const horizonAlphaTex = useMemo(() => createHorizonFadeAlphaMap(), []);

  const lightningTowers = useMemo(
    () => [
      [-48, -48],
      [48, -48],
      [-48, 48],
      [48, 48]
    ],
    []
  );

  useEffect(() => {
    const root = terrainGroupRef.current;
    return () => {
      concreteTex.dispose();
      marshTex.dispose();
      horizonAlphaTex.dispose();
      root?.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    };
  }, [concreteTex, marshTex, horizonAlphaTex]);

  useFrame(() => {
    const group = terrainGroupRef.current;
    if (!group) return;
    const liveAltKm = LaunchController.getInstance().getTrajectoryState().altitudeKm;
    const vis = liveAltKm < 12;
    group.visible = vis;
    if (!vis) return;

    // Smoothly fade from 7.5 km to 12.0 km without traversing 60+ meshes on unchanged frames
    const fade = 1.0 - THREE.MathUtils.smoothstep(liveAltKm, 7.5, 12.0);
    if (Math.abs(fade - lastFadeRef.current) < 1e-4) return;
    lastFadeRef.current = fade;
    group.traverse((obj) => {
      const mat = (obj as THREE.Mesh).material as THREE.Material & { opacity?: number };
      if (mat && mat.transparent && typeof mat.opacity === "number") {
        mat.opacity = fade;
      }
    });
  });

  return (
    <group ref={terrainGroupRef} position={[0, -14.0, 0]}>
      {/* 0. LIT ATLANTIC COASTAL HORIZON APRON (Feathers terrain smoothly into sky haze without bright unlit halo!) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 0]} raycast={NOOP_RAYCAST}>
        <circleGeometry args={[2550, 64]} />
        <meshStandardMaterial
          color="#23415c"
          alphaMap={horizonAlphaTex}
          roughness={0.92}
          metalness={0.08}
          transparent
          opacity={initialOpacity * 0.92}
          depthWrite={false}
        />
      </mesh>

      {/* 1. CAPE CANAVERAL COASTAL BARRIER ISLAND TERRAIN (Radially feathered into horizon mist) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} raycast={NOOP_RAYCAST}>
        <circleGeometry args={[1750, 64]} />
        <meshStandardMaterial
          map={marshTex}
          alphaMap={horizonAlphaTex}
          color="#3a523c"
          roughness={0.96}
          metalness={0.02}
          transparent
          opacity={initialOpacity}
        />
      </mesh>

      {/* Atlantic Ocean Coastline to the East */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[680, -0.14, 0]} raycast={NOOP_RAYCAST}>
        <circleGeometry args={[920, 48]} />
        <meshStandardMaterial
          color="#075985"
          alphaMap={horizonAlphaTex}
          roughness={0.28}
          metalness={0.55}
          transparent
          opacity={initialOpacity}
        />
      </mesh>

      {/* Sandy Ocean Beachfront Dune Strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[340, -0.1, 0]} raycast={NOOP_RAYCAST}>
        <planeGeometry args={[52, 960]} />
        <meshStandardMaterial
          color="#cbb28c"
          alphaMap={horizonAlphaTex}
          roughness={0.92}
          transparent
          opacity={initialOpacity}
        />
      </mesh>

      {/* Crawlerway Access Track (Crushed River Rock Gravel to VAB) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-260, 0.05, 0]} raycast={NOOP_RAYCAST}>
        <planeGeometry args={[440, 38]} />
        <meshStandardMaterial
          color="#785c46"
          roughness={0.98}
          transparent
          opacity={initialOpacity}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-260, 0.08, -8]} raycast={NOOP_RAYCAST}>
        <planeGeometry args={[440, 6.5]} />
        <meshStandardMaterial color="#574232" roughness={1.0} transparent opacity={initialOpacity} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-260, 0.08, 8]} raycast={NOOP_RAYCAST}>
        <planeGeometry args={[440, 6.5]} />
        <meshStandardMaterial color="#574232" roughness={1.0} transparent opacity={initialOpacity} />
      </mesh>

      {/* Perimeter Security Asphalt Road Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} raycast={NOOP_RAYCAST}>
        <ringGeometry args={[115, 128, 64]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.88}
          transparent
          opacity={initialOpacity}
        />
      </mesh>

      {/* 2. WEATHERED REINFORCED CONCRETE LAUNCH APRON & BLAST PAD */}
      <mesh position={[0, 0.4, 0]} raycast={NOOP_RAYCAST}>
        <cylinderGeometry args={[90, 98, 0.8, 16]} />
        <meshStandardMaterial
          map={concreteTex}
          color="#8592a2"
          roughness={0.92}
          metalness={0.06}
          transparent
          opacity={initialOpacity}
        />
      </mesh>

      {/* Elevated Inner Launch Mount Berm */}
      <mesh position={[0, 1.2, 0]} raycast={NOOP_RAYCAST}>
        <cylinderGeometry args={[40, 46, 1.6, 16]} />
        <meshStandardMaterial
          map={concreteTex}
          color="#94a3b8"
          roughness={0.88}
          metalness={0.08}
          transparent
          opacity={initialOpacity}
        />
      </mesh>

      {/* Safety Hazard Perimeter Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.02, 0]} raycast={NOOP_RAYCAST}>
        <ringGeometry args={[37.8, 39.2, 48]} />
        <meshBasicMaterial color="#d97706" transparent opacity={initialOpacity} />
      </mesh>

      {/* 3. DUAL-EXIT FLAME TRENCH & WATER DELUGE PIPING */}
      <mesh position={[0, 1.0, 0]} raycast={NOOP_RAYCAST}>
        <boxGeometry args={[52.0, 2.4, 13.0]} />
        <meshStandardMaterial color="#0b0f19" roughness={0.96} transparent opacity={initialOpacity} />
      </mesh>

      {[-7.2, 7.2].map((pipeZ) => (
        <group key={`deluge-pipe-${pipeZ}`} position={[0, 2.15, pipeZ]}>
          <mesh rotation={[0, 0, Math.PI / 2]} raycast={NOOP_RAYCAST}>
            <cylinderGeometry args={[0.42, 0.42, 44.0, 16]} />
            <meshStandardMaterial color="#dc2626" metalness={0.75} roughness={0.32} transparent opacity={initialOpacity} />
          </mesh>
          {[-16, -8, 0, 8, 16].map((nx) => (
            <mesh key={`nozzle-${nx}`} position={[nx, 0.38, 0]} raycast={NOOP_RAYCAST}>
              <cylinderGeometry args={[0.18, 0.26, 0.75, 12]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.24} transparent opacity={initialOpacity} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 4. CRYOGENIC LOX SPHERE, RP-1 TANKS & WATER DELUGE TOWER (Set back to authentic perimeter distance) */}
      <group position={[-76, 3.6, 46]}>
        <mesh raycast={NOOP_RAYCAST}>
          <sphereGeometry args={[3.4, 24, 24]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.45} roughness={0.38} transparent opacity={initialOpacity} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} raycast={NOOP_RAYCAST}>
          <torusGeometry args={[3.45, 0.14, 10, 28]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.25} transparent opacity={initialOpacity} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((li) => {
          const angle = (li / 6) * Math.PI * 2;
          return (
            <mesh
              key={`lox-leg-${li}`}
              position={[Math.cos(angle) * 2.7, -2.1, Math.sin(angle) * 2.7]}
              raycast={NOOP_RAYCAST}
            >
              <cylinderGeometry args={[0.16, 0.22, 3.4, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.25} transparent opacity={initialOpacity} />
            </mesh>
          );
        })}
      </group>

      <group position={[-56, 2.5, -28]}>
        {[-3.5, 3.5].map((tz, ti) => (
          <mesh key={`rp1-tank-${ti}`} position={[0, 0, tz]} rotation={[0, 0, Math.PI / 2]} raycast={NOOP_RAYCAST}>
            <cylinderGeometry args={[2.2, 2.2, 16.0, 20]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.45} roughness={0.35} transparent opacity={initialOpacity} />
          </mesh>
        ))}
      </group>

      <group position={[58, 0, -42]}>
        <mesh position={[0, 32.0, 0]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[5.2, 5.2, 9.0, 24]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.45} roughness={0.35} transparent opacity={initialOpacity} />
        </mesh>
        <mesh position={[0, 37.5, 0]} raycast={NOOP_RAYCAST}>
          <coneGeometry args={[5.5, 2.5, 24]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.25} transparent opacity={initialOpacity} />
        </mesh>
        {[-3.2, 3.2].map((px) =>
          [-3.2, 3.2].map((pz) => (
            <mesh key={`wt-leg-${px}-${pz}`} position={[px, 14.0, pz]} raycast={NOOP_RAYCAST}>
              <cylinderGeometry args={[0.35, 0.45, 28.0, 10]} />
              <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.25} transparent opacity={initialOpacity} />
            </mesh>
          ))
        )}
      </group>

      {/* 5. 4 LIGHTNING PROTECTION MAST TOWERS */}
      {lightningTowers.map(([tx, tz], ti) => (
        <group key={`lightning-mast-${ti}`} position={[tx, 0, tz]}>
          <mesh position={[0, 26.0, 0]} raycast={NOOP_RAYCAST}>
            <cylinderGeometry args={[0.35, 1.35, 52.0, 10]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} transparent opacity={initialOpacity} />
          </mesh>
          <mesh position={[0, 56.0, 0]} raycast={NOOP_RAYCAST}>
            <cylinderGeometry args={[0.04, 0.25, 8.0, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.15} transparent opacity={initialOpacity} />
          </mesh>
          <mesh position={[0, 60.5, 0]} raycast={NOOP_RAYCAST}>
            <sphereGeometry args={[0.32, 10, 10]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={initialOpacity} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
