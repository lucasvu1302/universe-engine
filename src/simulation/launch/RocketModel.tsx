import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AssetManager } from "@/engine/assets/AssetManager";
import { LaunchController, LaunchTrajectoryState } from "./LaunchController";
import { SimulationManager } from "../core/SimulationManager";
import { SimulationCameraMode } from "../core/types";
import plumeVert from "@/shaders/launch/rocketPlume.vert.glsl";
import plumeFrag from "@/shaders/launch/rocketPlume.frag.glsl";

interface RocketModelProps {
  trajectory?: LaunchTrajectoryState;
  cameraMode?: SimulationCameraMode;
}

function createDualShellPlumeGeometry(radialSegs: number, heightSegs: number): THREE.BufferGeometry {
  const outer = new THREE.CylinderGeometry(1.0, 1.0, 1.0, radialSegs, heightSegs, true);
  outer.translate(0, -0.5, 0);
  const inner = new THREE.CylinderGeometry(0.45, 0.45, 1.0, radialSegs, heightSegs, true);
  inner.translate(0, -0.5, 0);

  const posA = outer.attributes.position.array as Float32Array;
  const posB = inner.attributes.position.array as Float32Array;
  const normA = outer.attributes.normal.array as Float32Array;
  const normB = inner.attributes.normal.array as Float32Array;
  const uvA = outer.attributes.uv.array as Float32Array;
  const uvB = inner.attributes.uv.array as Float32Array;
  const idxA = outer.index!.array;
  const idxB = inner.index!.array;

  const positions = new Float32Array(posA.length + posB.length);
  positions.set(posA, 0);
  positions.set(posB, posA.length);

  const normals = new Float32Array(normA.length + normB.length);
  normals.set(normA, 0);
  normals.set(normB, normA.length);

  const uvs = new Float32Array(uvA.length + uvB.length);
  uvs.set(uvA, 0);
  uvs.set(uvB, uvA.length);

  const vertOffset = outer.attributes.position.count;
  const indices = new Uint16Array(idxA.length + idxB.length);
  for (let i = 0; i < idxA.length; i++) indices[i] = idxA[i];
  for (let i = 0; i < idxB.length; i++) indices[idxA.length + i] = idxB[i] + vertOffset;

  outer.dispose();
  inner.dispose();

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  merged.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}

export const RocketModel: React.FC<RocketModelProps> = ({ trajectory, cameraMode }) => {
  const rocketRootRef = useRef<THREE.Group>(null);
  const stage1Ref = useRef<THREE.Group>(null);
  const stage2Ref = useRef<THREE.Group>(null);
  const plume1GroupRef = useRef<THREE.Group>(null);
  const plume2GroupRef = useRef<THREE.Group>(null);
  const plume1MatRef = useRef<THREE.ShaderMaterial>(null);
  const plume2MatRef = useRef<THREE.ShaderMaterial>(null);
  const engineLightRef = useRef<THREE.PointLight>(null);
  const gridFinsRef = useRef<THREE.Group>(null);

  const assets = useMemo(() => AssetManager.getInstance(), []);
  const hullMap = useMemo(() => assets.getAerospaceHullMap(), [assets]);
  const aeroBumpMap = useMemo(() => assets.getAerospaceBumpMap(), [assets]);
  const gridFinAlphaMap = useMemo(() => assets.getGridFinAlphaMap(), [assets]);
  const solarArrayMap = useMemo(() => assets.getSolarArrayMap(), [assets]);

  // 1. Parabolic Open-Ended Merlin 1D Regeneratively-Cooled Bell Nozzle (LatheGeometry)
  const merlinBellGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.14, 0.0),
      new THREE.Vector2(0.11, -0.1),
      new THREE.Vector2(0.18, -0.24),
      new THREE.Vector2(0.31, -0.46),
      new THREE.Vector2(0.43, -0.7),
      new THREE.Vector2(0.51, -0.92)
    ];
    const geo = new THREE.LatheGeometry(pts, 28);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 2. Large Niobium-Alloy MVac Vacuum Expansion Bell Nozzle (LatheGeometry)
  const mvacBellGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.28, 0.0),
      new THREE.Vector2(0.22, -0.16),
      new THREE.Vector2(0.46, -0.48),
      new THREE.Vector2(0.82, -0.95),
      new THREE.Vector2(1.12, -1.42),
      new THREE.Vector2(1.28, -1.78)
    ];
    const geo = new THREE.LatheGeometry(pts, 36);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 3. Aerodynamic Curved Ogive Crew Dragon Pressure Hull & Nosecone (LatheGeometry)
  const dragonOgiveGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(1.76, 0.0),
      new THREE.Vector2(1.72, 0.22),
      new THREE.Vector2(1.58, 0.62),
      new THREE.Vector2(1.36, 1.08),
      new THREE.Vector2(1.08, 1.54),
      new THREE.Vector2(0.76, 1.92),
      new THREE.Vector2(0.42, 2.18),
      new THREE.Vector2(0.0, 2.24)
    ];
    const geo = new THREE.LatheGeometry(pts, 48);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 5. Downward-Translated Coaxial Dual-Shell Supersonic Plumes (shaped by Prandtl-Meyer expansion strictly BELOW nozzles!)
  const plume1Geo = useMemo(() => createDualShellPlumeGeometry(44, 28), []);
  const plume2Geo = useMemo(() => createDualShellPlumeGeometry(36, 24), []);
  const legFairingGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.06, -2.6),
      new THREE.Vector2(0.26, -2.2),
      new THREE.Vector2(0.3, -0.6),
      new THREE.Vector2(0.22, 1.4),
      new THREE.Vector2(0.05, 2.55)
    ];
    const geo = new THREE.LatheGeometry(pts, 16, -Math.PI * 0.5, Math.PI);
    geo.computeVertexNormals();
    return geo;
  }, []);

  const merlinNozzleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#334155",
        emissive: "#000000",
        emissiveIntensity: 0,
        bumpMap: aeroBumpMap,
        bumpScale: 0.015,
        metalness: 0.94,
        roughness: 0.22,
        side: THREE.DoubleSide
      }),
    [aeroBumpMap]
  );

  const mvacNozzleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#475569",
        emissive: "#000000",
        emissiveIntensity: 0,
        bumpMap: aeroBumpMap,
        bumpScale: 0.02,
        metalness: 0.92,
        roughness: 0.26,
        side: THREE.DoubleSide
      }),
    [aeroBumpMap]
  );

  const gridFinWaffleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#64748b",
        alphaMap: gridFinAlphaMap,
        alphaTest: 0.42,
        metalness: 0.92,
        roughness: 0.26,
        side: THREE.DoubleSide
      }),
    [gridFinAlphaMap]
  );

  const plume1Uniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uColorCore: { value: new THREE.Color("#fffbeb") },
      uColorFlame: { value: new THREE.Color("#f97316") },
      uThroatRadius: { value: 1.66 },
      uLength: { value: 24.0 },
      uExpansion: { value: 1.9 }
    }),
    []
  );

  const plume2Uniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uColorCore: { value: new THREE.Color("#e0e7ff") },
      uColorFlame: { value: new THREE.Color("#818cf8") },
      uThroatRadius: { value: 0.96 },
      uLength: { value: 19.0 },
      uExpansion: { value: 4.2 }
    }),
    []
  );

  useEffect(() => {
    const root = rocketRootRef.current;
    const p1 = plume1MatRef.current;
    const p2 = plume2MatRef.current;
    return () => {
      merlinBellGeo.dispose();
      mvacBellGeo.dispose();
      dragonOgiveGeo.dispose();
      legFairingGeo.dispose();
      plume1Geo.dispose();
      plume2Geo.dispose();
      merlinNozzleMat.dispose();
      mvacNozzleMat.dispose();
      gridFinWaffleMat.dispose();
      p1?.dispose();
      p2?.dispose();
      root?.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          if (
            mesh.geometry !== merlinBellGeo &&
            mesh.geometry !== mvacBellGeo &&
            mesh.geometry !== dragonOgiveGeo &&
            mesh.geometry !== legFairingGeo &&
            mesh.geometry !== plume1Geo &&
            mesh.geometry !== plume2Geo
          ) {
            mesh.geometry?.dispose();
          }
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    };
  }, [
    merlinBellGeo,
    mvacBellGeo,
    dragonOgiveGeo,
    legFairingGeo,
    plume1Geo,
    plume2Geo,
    merlinNozzleMat,
    mvacNozzleMat,
    gridFinWaffleMat
  ]);

  useFrame((_, delta) => {
    if (!rocketRootRef.current) return;

    const liveTraj = trajectory ?? LaunchController.getInstance().getTrajectoryState();

    // Apply world position & orientation calculated by LaunchController
    rocketRootRef.current.position.copy(liveTraj.position);
    rocketRootRef.current.quaternion.copy(liveTraj.quaternion);

    const dt = Math.min(Math.max(delta, 0), 0.05);
    // Deterministic staging physics animation (pause & scrub safe — zero infinite drift!)
    if (liveTraj.stage1Separated && stage1Ref.current) {
      const sepElapsed = Math.min(Math.max(0, liveTraj.timeSeconds - 100.0), 45.0);
      stage1Ref.current.position.set(0, -sepElapsed * 14.0, sepElapsed * 3.0);
      stage1Ref.current.rotation.set(sepElapsed * 0.18, 0, 0);
    } else if (stage1Ref.current) {
      stage1Ref.current.position.set(0, 0, 0);
      stage1Ref.current.rotation.set(0, 0, 0);
    }

    // Grid fins stay stowed flush against the interstage during Stage 1 ascent, deploying after MECO/separation
    if (gridFinsRef.current) {
      const stowedAngle = -Math.PI * 0.47;
      const finWobble = Math.sin(liveTraj.timeSeconds * 5.0) * 0.08;
      const finDamp = 1 - Math.exp(-8.0 * dt);
      gridFinsRef.current.children.forEach((fin, idx) => {
        const targetFinZ = liveTraj.stage1Separated
          ? (idx % 2 === 0 ? 1 : -1) * finWobble
          : stowedAngle;
        fin.rotation.z = THREE.MathUtils.lerp(fin.rotation.z, targetFinZ, finDamp);
      });
    }

    // Engine exhaust plume & persistent light animation (zero light mount/unmount)
    const time = liveTraj.timeSeconds;
    const isStage1Firing = time >= 10 && time < 100;
    const isStage2Firing = time >= 105 && time < 280;
    const isDelugePreIgnition = time >= 7.5 && time < 10;

    merlinNozzleMat.color.set(isStage1Firing ? "#9a5b32" : "#334155");
    merlinNozzleMat.emissive.set(isStage1Firing ? "#ea580c" : "#000000");
    merlinNozzleMat.emissiveIntensity = isStage1Firing ? 0.95 : 0;

    mvacNozzleMat.color.set(isStage2Firing ? "#c2410c" : "#475569");
    mvacNozzleMat.emissive.set(isStage2Firing ? "#fb923c" : "#000000");
    mvacNozzleMat.emissiveIntensity = isStage2Firing ? 1.35 : 0;

    if (plume1GroupRef.current) {
      plume1GroupRef.current.visible = isStage1Firing;
    }
    if (plume2GroupRef.current) {
      plume2GroupRef.current.visible = isStage2Firing;
    }

    // Altitude-driven atmospheric pressure expansion (sea level tight Mach column -> upper-air vacuum blossom)
    const altExpansion1 = THREE.MathUtils.clamp(liveTraj.altitudeKm / 68.0, 0.0, 1.0);
    const altExpansion2 = THREE.MathUtils.clamp((liveTraj.altitudeKm - 70.0) / 110.0, 0.0, 1.0);

    const isPlaying = SimulationManager.getInstance().getTimelineEngine().getIsPlaying();
    if (plume1MatRef.current && isStage1Firing) {
      if (isPlaying) {
        plume1MatRef.current.uniforms.uTime.value += dt;
      }
      plume1MatRef.current.uniforms.uExpansion.value = 1.85 + altExpansion1 * 3.55;
      plume1MatRef.current.uniforms.uLength.value = 23.0 + altExpansion1 * 8.0;
    }
    if (plume2MatRef.current && isStage2Firing) {
      if (isPlaying) {
        plume2MatRef.current.uniforms.uTime.value += dt;
      }
      plume2MatRef.current.uniforms.uExpansion.value = 4.2 + altExpansion2 * 1.75;
    }

    if (engineLightRef.current) {
      if (isStage1Firing) {
        engineLightRef.current.position.set(0, -11.75, 0);
        engineLightRef.current.color.set("#ff7711");
        engineLightRef.current.intensity = 24;
        engineLightRef.current.distance = 130;
      } else if (isDelugePreIgnition) {
        engineLightRef.current.position.set(0, -11.75, 0);
        engineLightRef.current.color.set("#ffaa33");
        engineLightRef.current.intensity = ((time - 7.5) / 2.5) * 18;
        engineLightRef.current.distance = 90;
      } else if (isStage2Firing) {
        engineLightRef.current.position.set(0, 0.45, 0);
        engineLightRef.current.color.set("#fb923c");
        engineLightRef.current.intensity = 14;
        engineLightRef.current.distance = 85;
      } else {
        engineLightRef.current.intensity = 0;
      }
    }
  });

  const isChaseCam = cameraMode !== "COCKPIT" && cameraMode !== "WINDOW";

  return (
    <group ref={rocketRootRef}>
      {/* ---------------------------------------------------- */}
      {/* 1. FIRST STAGE BOOSTER (FALCON 9 BLOCK 5)            */}
      {/* ---------------------------------------------------- */}
      <group ref={stage1Ref}>
        {/* Main Booster Fuselage (Friction-Stir Welded Al-Li + Cryo Frost + Reusable Soot) */}
        <mesh position={[0, -4.5, 0]}>
          <cylinderGeometry args={[1.8, 1.8, 12, 56]} />
          <meshStandardMaterial
            map={hullMap}
            bumpMap={aeroBumpMap}
            bumpScale={0.016}
            color="#ffffff"
            metalness={0.38}
            roughness={0.34}
          />
        </mesh>

        {/* Subtle Cryogenic LOX Condensation Frost Band */}
        <mesh position={[0, -1.65, 0]}>
          <cylinderGeometry args={[1.806, 1.806, 4.4, 48, 1, true]} />
          <meshStandardMaterial
            color="#f8fafc"
            bumpMap={aeroBumpMap}
            bumpScale={0.024}
            metalness={0.08}
            roughness={0.78}
            transparent
            opacity={0.42}
          />
        </mesh>

        {/* Twin External Avionics & Propellant Transfer Raceways */}
        {[1.81, -1.81].map((rx) => (
          <mesh key={`raceway-s1-${rx}`} position={[rx, -4.5, 0]}>
            <boxGeometry args={[0.09, 11.7, 0.2]} />
            <meshStandardMaterial color="#111827" metalness={0.82} roughness={0.28} />
          </mesh>
        ))}

        {/* Matte Carbon-Composite Interstage & Pneumatic Pusher Collar */}
        <mesh position={[0, 1.62, 0]}>
          <cylinderGeometry args={[1.815, 1.81, 0.56, 56]} />
          <meshStandardMaterial
            color="#0b101b"
            bumpMap={aeroBumpMap}
            bumpScale={0.025}
            metalness={0.68}
            roughness={0.38}
          />
        </mesh>

        {/* 4 Cast-Titanium Perforated Hypersonic Waffle Grid Fins */}
        <group ref={gridFinsRef}>
          {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
            <group
              key={`grid-fin-group-${i}`}
              position={[Math.cos(angle) * 1.84, 1.32, Math.sin(angle) * 1.84]}
              rotation={[0, -angle, 0]}
            >
              {/* Titanium Gimbal Root Yoke */}
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.11, 0.14, 0.3, 16]} />
                <meshStandardMaterial color="#334155" metalness={0.92} roughness={0.22} />
              </mesh>
              {/* See-Through Perforated Titanium Waffle Blade */}
              <mesh position={[0.48, 0, 0]} material={gridFinWaffleMat}>
                <planeGeometry args={[0.88, 0.88]} />
              </mesh>
              {/* Sculpted Swept Outer Titanium Frame */}
              <mesh position={[0.48, 0.44, 0]}>
                <boxGeometry args={[0.88, 0.035, 0.09]} />
                <meshStandardMaterial color="#475569" metalness={0.94} roughness={0.22} />
              </mesh>
              <mesh position={[0.48, -0.44, 0]}>
                <boxGeometry args={[0.88, 0.035, 0.09]} />
                <meshStandardMaterial color="#475569" metalness={0.94} roughness={0.22} />
              </mesh>
              <mesh position={[0.91, 0, 0]}>
                <boxGeometry args={[0.04, 0.9, 0.09]} />
                <meshStandardMaterial color="#475569" metalness={0.94} roughness={0.22} />
              </mesh>
            </group>
          ))}
        </group>

        {/* 4 Contoured Carbon-Composite Folded Landing Legs */}
        {[Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map(
          (angle, i) => (
            <group
              key={`landing-leg-group-${i}`}
              position={[Math.cos(angle) * 1.79, -7.85, Math.sin(angle) * 1.79]}
              rotation={[0, -angle, 0]}
            >
              <mesh geometry={legFairingGeo}>
                <meshStandardMaterial
                  color="#090d16"
                  bumpMap={aeroBumpMap}
                  bumpScale={0.02}
                  metalness={0.72}
                  roughness={0.34}
                />
              </mesh>
              <mesh position={[0.14, 2.35, 0]}>
                <cylinderGeometry args={[0.075, 0.09, 0.34, 14]} />
                <meshStandardMaterial color="#64748b" metalness={0.94} roughness={0.16} />
              </mesh>
            </group>
          )
        )}

        {/* Titanium/Carbon Octaweb Thrust Structure & Thermal Base Shield */}
        <mesh position={[0, -10.38, 0]}>
          <cylinderGeometry args={[1.8, 1.66, 0.58, 56]} />
          <meshStandardMaterial
            color="#0b101b"
            bumpMap={aeroBumpMap}
            bumpScale={0.025}
            metalness={0.86}
            roughness={0.28}
          />
        </mesh>
        <mesh position={[0, -10.7, 0]}>
          <cylinderGeometry args={[1.66, 1.62, 0.1, 48]} />
          <meshStandardMaterial color="#1e293b" metalness={0.92} roughness={0.2} />
        </mesh>

        {/* 9 Gimballed Merlin 1D Open Parabolic Bell Nozzles (Octaweb + Center) */}
        {[
          [0, 0],
          [-0.85, 0],
          [0.85, 0],
          [0, -0.85],
          [0, 0.85],
          [-0.6, -0.6],
          [0.6, -0.6],
          [-0.6, 0.6],
          [0.6, 0.6]
        ].map(([x, z], ei) => (
          <group key={`merlin-${ei}`} position={[x * 1.14, -10.72, z * 1.14]}>
            {/* Turbopump & Gimbal Actuator Head */}
            <mesh position={[0, -0.06, 0]}>
              <cylinderGeometry args={[0.2, 0.16, 0.22, 16]} />
              <meshStandardMaterial color="#475569" metalness={0.92} roughness={0.22} />
            </mesh>
            {/* Open-Ended Parabolic Lathe Bell Nozzle */}
            <mesh geometry={merlinBellGeo} position={[0, -0.12, 0]} material={merlinNozzleMat} />
            {/* Regenerative Cooling Stiffener Ring */}
            <mesh position={[0, -0.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.36, 0.018, 8, 24]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.18} />
            </mesh>
            {/* Gas-Generator Exhaust Pipe */}
            <mesh position={[0.26, -0.52, 0]}>
              <cylinderGeometry args={[0.045, 0.065, 0.58, 12]} />
              <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.28} />
            </mesh>
          </group>
        ))}

        {/* ---------------------------------------------------- */}
        {/* SUPERSONIC STAGE 1 PLUME (Downward -Y Translated, 0 Opaque Cones) */}
        {/* ---------------------------------------------------- */}
        <group ref={plume1GroupRef} position={[0, -11.62, 0]} visible={false}>
          <mesh geometry={plume1Geo}>
            <shaderMaterial
              ref={plume1MatRef}
              vertexShader={plumeVert}
              fragmentShader={plumeFrag}
              uniforms={plume1Uniforms}
              transparent
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      </group>

      {/* Single Persistent Engine Illumination Light */}
      <pointLight
        ref={engineLightRef}
        position={[0, -11.75, 0]}
        color="#ff7711"
        intensity={0}
        distance={130}
      />

      {/* ---------------------------------------------------- */}
      {/* 2. SECOND STAGE & MVAC NIOBIUM BELL                  */}
      {/* ---------------------------------------------------- */}
      <group ref={stage2Ref}>
        <mesh position={[0, 4.2, 0]}>
          <cylinderGeometry args={[1.78, 1.78, 4.8, 56]} />
          <meshStandardMaterial
            map={hullMap}
            bumpMap={aeroBumpMap}
            bumpScale={0.014}
            color="#f8fafc"
            metalness={0.36}
            roughness={0.3}
          />
        </mesh>

        <mesh position={[1.79, 4.2, 0]}>
          <boxGeometry args={[0.06, 4.65, 0.15]} />
          <meshStandardMaterial color="#111827" metalness={0.82} roughness={0.26} />
        </mesh>

        {/* Open-Ended Parabolic Niobium MVac Nozzle */}
        <mesh geometry={mvacBellGeo} position={[0, 1.82, 0]} material={mvacNozzleMat} />

        {/* Stage 2 Vacuum Plume (Downward -Y Translated) */}
        <group ref={plume2GroupRef} position={[0, 0.08, 0]} visible={false}>
          <mesh geometry={plume2Geo}>
            <shaderMaterial
              ref={plume2MatRef}
              vertexShader={plumeVert}
              fragmentShader={plumeFrag}
              uniforms={plume2Uniforms}
              transparent
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* ---------------------------------------------------- */}
        {/* 3. CREW DRAGON OGIVE CAPSULE & SOLAR SERVICE TRUNK   */}
        {/* ---------------------------------------------------- */}
        {isChaseCam && (
          <group>
            {/* A. Service Trunk: Half Composite Radiator + Half Photovoltaic Solar Array */}
            <mesh position={[0, 7.0, 0]}>
              <cylinderGeometry args={[1.76, 1.78, 1.22, 56]} />
              <meshStandardMaterial
                color="#f1f5f9"
                bumpMap={aeroBumpMap}
                bumpScale={0.02}
                metalness={0.34}
                roughness={0.34}
              />
            </mesh>
            <mesh position={[0, 7.0, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <cylinderGeometry args={[1.772, 1.792, 1.16, 40, 1, true, 0, Math.PI]} />
              <meshStandardMaterial
                map={solarArrayMap}
                bumpMap={aeroBumpMap}
                bumpScale={0.012}
                color="#ffffff"
                metalness={0.72}
                roughness={0.22}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* 4 Trunk Aerodynamic Stabilizer Strakes */}
            {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((fAngle, fi) => (
              <mesh
                key={`trunk-fin-${fi}`}
                position={[Math.cos(fAngle) * 1.88, 7.0, Math.sin(fAngle) * 1.88]}
                rotation={[0, -fAngle, 0]}
              >
                <boxGeometry args={[0.28, 1.14, 0.045]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.55} roughness={0.3} />
              </mesh>
            ))}

            {/* B. PICA-X Ablative Heatshield Rim */}
            <mesh position={[0, 7.62, 0]}>
              <cylinderGeometry args={[1.76, 1.77, 0.14, 56]} />
              <meshStandardMaterial
                color="#090d16"
                bumpMap={aeroBumpMap}
                bumpScale={0.03}
                metalness={0.75}
                roughness={0.48}
              />
            </mesh>

            {/* C. Continuous Curved Ogive Crew Dragon Pressure Vessel (LatheGeometry) */}
            <mesh geometry={dragonOgiveGeo} position={[0, 7.64, 0]}>
              <meshStandardMaterial
                map={hullMap}
                bumpMap={aeroBumpMap}
                bumpScale={0.014}
                color="#f8fafc"
                metalness={0.38}
                roughness={0.26}
              />
            </mesh>

            {/* Nosecone Hinge Seam & Apex Docking Ring Collar */}
            <mesh position={[0, 9.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.66, 0.018, 10, 36]} />
              <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.28} />
            </mesh>
            <mesh position={[0, 9.86, 0]}>
              <cylinderGeometry args={[0.38, 0.42, 0.1, 32]} />
              <meshStandardMaterial color="#64748b" metalness={0.92} roughness={0.18} />
            </mesh>

            {/* 4 Contoured Teardrop SuperDraco Launch Escape Pods */}
            {[
              Math.PI / 4,
              (3 * Math.PI) / 4,
              (5 * Math.PI) / 4,
              (7 * Math.PI) / 4
            ].map((angle, bi) => (
              <group
                key={`superdraco-${bi}`}
                position={[Math.cos(angle) * 1.44, 8.28, Math.sin(angle) * 1.44]}
                rotation={[0, -angle, -0.36]}
              >
                <mesh scale={[0.42, 1.0, 0.58]}>
                  <capsuleGeometry args={[0.26, 0.34, 8, 16]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.55} roughness={0.28} />
                </mesh>
                {[-0.07, 0.07].map((nz) => (
                  <mesh key={`sd-noz-${nz}`} position={[0.04, -0.22, nz]} rotation={[0, 0, -0.2]}>
                    <cylinderGeometry args={[0.045, 0.068, 0.14, 12]} />
                    <meshStandardMaterial color="#0f172a" metalness={0.95} roughness={0.16} />
                  </mesh>
                ))}
              </group>
            ))}

            {/* Flush Contoured Crew Windows & Forward Hatch Frame */}
            <mesh position={[0, 8.48, 1.44]} rotation={[-0.42, 0, 0]}>
              <cylinderGeometry args={[0.22, 0.28, 0.05, 24]} />
              <meshPhysicalMaterial
                color="#050811"
                roughness={0.06}
                metalness={0.88}
                clearcoat={1.0}
                clearcoatRoughness={0.08}
              />
            </mesh>
            {[-1, 1].map((wSign) => (
              <mesh
                key={`side-win-${wSign}`}
                position={[wSign * 1.46, 8.32, 0.18]}
                rotation={[0, 0, -wSign * 1.22]}
              >
                <cylinderGeometry args={[0.15, 0.15, 0.05, 24]} />
                <meshPhysicalMaterial
                  color="#050811"
                  roughness={0.06}
                  metalness={0.88}
                  clearcoat={1.0}
                />
              </mesh>
            ))}
          </group>
        )}
      </group>
    </group>
  );
};
