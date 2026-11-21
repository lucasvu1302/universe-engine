import React, { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LaunchController } from "./LaunchController";
import { AtmosphereController } from "./AtmosphereController";
import { CameraDirector } from "../camera/CameraDirector";
import { SimulationManager } from "../core/SimulationManager";
import { SimulationEventBus } from "../core/SimulationEventBus";
import { RocketModel } from "./RocketModel";
import { CockpitInterior } from "./CockpitInterior";
import { LaunchPadModel } from "./LaunchPadModel";
import { SpaceportTerrain } from "./SpaceportTerrain";
import { LaunchSmokeVolumetrics } from "./LaunchSmokeVolumetrics";
import { SimulationCameraMode } from "../core/types";
import { AssetManager } from "@/engine/assets/AssetManager";
import { CameraManager } from "@/engine/camera/CameraManager";
import { StarField } from "@/entities/StarField/StarField";
import skyVert from "@/shaders/launch/launchSky.vert.glsl";
import skyFrag from "@/shaders/launch/launchSky.frag.glsl";
import earthGroundVert from "@/shaders/earth/earthGround.vert.glsl";
import launchEarthFrag from "@/shaders/launch/launchEarth.frag.glsl";
import launchCloudsFrag from "@/shaders/launch/launchClouds.frag.glsl";
import atmosphereVert from "@/shaders/atmosphere/atmosphere.vert.glsl";
import atmosphereFrag from "@/shaders/atmosphere/atmosphere.frag.glsl";

const NOOP_RAYCAST: THREE.Object3D["raycast"] = () => {};

export const LaunchScene: React.FC = () => {
  const simulationManager = useMemo(() => SimulationManager.getInstance(), []);
  const timeline = useMemo(() => simulationManager.getTimelineEngine(), [simulationManager]);
  const launchController = useMemo(() => LaunchController.getInstance(), []);
  const atmosphereController = useMemo(() => AtmosphereController.getInstance(), []);
  const cameraDirector = useMemo(() => CameraDirector.getInstance(), []);
  const eventBus = useMemo(() => SimulationEventBus.getInstance(), []);
  const assets = useMemo(() => AssetManager.getInstance(), []);

  const [cameraMode, setCameraMode] = useState<SimulationCameraMode>(
    cameraDirector.getMode()
  );

  const starGroupRef = useRef<THREE.Group>(null);
  const skyMatRef = useRef<THREE.ShaderMaterial>(null);
  const skyMeshRef = useRef<THREE.Mesh>(null);
  const earthGroupRef = useRef<THREE.Group>(null);
  const earthGlobeRef = useRef<THREE.Mesh>(null);
  const earthGroundMatRef = useRef<THREE.ShaderMaterial>(null);
  const earthAtmMatRef = useRef<THREE.ShaderMaterial>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const cloudsMatRef = useRef<THREE.ShaderMaterial>(null);

  const sunDir = useMemo(() => new THREE.Vector3(0.32, 0.86, 0.40).normalize(), []);
  const sunWorldPos = useMemo(() => sunDir.clone().multiplyScalar(18000), [sunDir]);
  const orbitalSphereGeo = useMemo(() => new THREE.SphereGeometry(1, 128, 96), []);

  const earthDayMap = useMemo(
    () => assets.loadTexture("earth_day", () => assets.getProceduralPlanetTexture("earth", "#1e3a8a")),
    [assets]
  );
  const earthNightMap = useMemo(() => assets.getEarthNightMap(), [assets]);
  const earthSpecularMap = useMemo(() => assets.getEarthSpecularMap(), [assets]);
  const earthCloudsMap = useMemo(() => assets.getEarthCloudsMap(), [assets]);

  const earthGroundUniforms = useMemo(
    () => ({
      uDayMap: { value: earthDayMap },
      uNightMap: { value: earthNightMap },
      uSpecularMap: { value: earthSpecularMap },
      uCloudsMap: { value: earthCloudsMap },
      uSunPosition: { value: sunWorldPos }
    }),
    [earthDayMap, earthNightMap, earthSpecularMap, earthCloudsMap, sunWorldPos]
  );

  const earthCloudsUniforms = useMemo(
    () => ({
      uCloudsMap: { value: earthCloudsMap },
      uSunPosition: { value: sunWorldPos },
      uOpacity: { value: 0.0 }
    }),
    [earthCloudsMap, sunWorldPos]
  );

  const atmosphereUniforms = useMemo(
    () => ({
      uSunPosition: { value: sunWorldPos },
      uAtmosphereColor: { value: new THREE.Color("#38bdf8") },
      uOpacity: { value: 0.0 }
    }),
    [sunWorldPos]
  );

  const skyUniforms = useMemo(
    () => ({
      uSkyColor: { value: new THREE.Color(0.35, 0.65, 0.98) },
      uSunDir: { value: sunDir },
      uStarVisibility: { value: 0.0 },
      uAltitudeKm: { value: 0.0 },
      uReentryGlow: { value: 0.0 }
    }),
    [sunDir]
  );

  useEffect(() => {
    const unsubCam = eventBus.on("camera:mode_change", (mode) => {
      setCameraMode(mode);
    });
    const sMat = skyMatRef.current;
    const gMat = earthGroundMatRef.current;
    const aMat = earthAtmMatRef.current;
    const cMat = cloudsMatRef.current;
    const sGeo = skyMeshRef.current?.geometry;
    return () => {
      unsubCam();
      CameraManager.getInstance().camera?.up.set(0, 1, 0);
      orbitalSphereGeo.dispose();
      sGeo?.dispose();
      sMat?.dispose();
      gMat?.dispose();
      aMat?.dispose();
      cMat?.dispose();
    };
  }, [eventBus, orbitalSphereGeo]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(Math.max(rawDelta, 0), 0.05);
    // 1. Advance simulation timeline BEFORE child RocketModel & CockpitInterior useFrame(0) callbacks!
    simulationManager.update(delta);

    // 2. Evaluate rocket trajectory once per frame
    const curTime = timeline.getCurrentTime();
    const cachedTraj = launchController.getTrajectoryState();
    const currentTraj =
      Math.abs(cachedTraj.timeSeconds - curTime) < 1e-6 && curTime !== 0
        ? cachedTraj
        : launchController.evaluateAtTime(curTime);

    // 3. Update Camera
    cameraDirector.update(delta);

    // 4. Update Atmosphere & Sky shader imperatively
    const atmState = atmosphereController.getState();
    const altKm = atmState.altitudeKm;

    if (skyMatRef.current) {
      skyMatRef.current.uniforms.uSkyColor.value.copy(atmState.skyColor);
      skyMatRef.current.uniforms.uStarVisibility.value = atmState.starVisibility;
      skyMatRef.current.uniforms.uAltitudeKm.value = altKm;
      skyMatRef.current.uniforms.uReentryGlow.value = atmState.reentryGlow;
    }

    if (skyMeshRef.current) {
      skyMeshRef.current.position.copy(currentTraj.position);
    }
    if (starGroupRef.current) {
      starGroupRef.current.position.copy(currentTraj.position);
    }

    // 5. Anchor macro Earth globe cleanly beneath SpaceportTerrain at low altitude, blending smoothly into LEO limb
    if (earthGroupRef.current) {
      // Keep globe top safely beneath SpaceportTerrain (y = -14) while Cape Canaveral fades out (7.5..12 km),
      // then smoothly raise to orbital LEO drop (48..74u on R=2600, strictly outside the 29.9u atmosphere shell at 78.4..400 km
      // while framing curved sunlit continents & blue limb boldly across both CINEMATIC and COCKPIT windshields!)
      const lowAltSurfaceTopY = -22.0;
      const orbitalDrop = 48.0 + THREE.MathUtils.clamp(altKm * 0.14, 0.0, 26.0);
      const orbitalSurfaceTopY = currentTraj.position.y - orbitalDrop;
      const globeBlend = THREE.MathUtils.smoothstep(altKm, 8.0, 38.0);
      const surfaceTopY = THREE.MathUtils.lerp(lowAltSurfaceTopY, orbitalSurfaceTopY, globeBlend);
      earthGroupRef.current.position.set(
        currentTraj.position.x,
        surfaceTopY - 2600.0,
        currentTraj.position.z
      );
      earthGroupRef.current.visible = altKm > 6.5;
    }

    if (cloudsMatRef.current) {
      const cloudFade = THREE.MathUtils.smoothstep(altKm, 7.0, 20.0);
      cloudsMatRef.current.uniforms.uOpacity.value = cloudFade;
      if (cloudsRef.current) {
        cloudsRef.current.visible = cloudFade > 0.005;
      }
    }

    if (earthAtmMatRef.current) {
      earthAtmMatRef.current.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(altKm, 8.0, 32.0);
    }

    // Simulate orbital ground track rolling beneath spacecraft only while simulation timeline is playing
    if (timeline.getIsPlaying()) {
      const groundTrackRate = 0.0008 + currentTraj.velocityKms * 0.0042;
      if (earthGlobeRef.current) {
        earthGlobeRef.current.rotation.x -= delta * groundTrackRate;
        earthGlobeRef.current.rotation.y += delta * 0.0012;
      }
      if (cloudsRef.current) {
        cloudsRef.current.rotation.x -= delta * (groundTrackRate * 1.06);
        cloudsRef.current.rotation.y += delta * 0.0022;
      }
    }
  }, -1);

  return (
    <group>
      {/* 0. DEEP-SPACE 3D SPECTRAL STARFIELD (Shines through as upper atmosphere thins) */}
      <group ref={starGroupRef}>
        <StarField radius={14000} />
      </group>

      {/* 1. ATMOSPHERIC SKY DOME SHADER */}
      <mesh ref={skyMeshRef} raycast={NOOP_RAYCAST} renderOrder={-1}>
        <sphereGeometry args={[2800, 32, 32]} />
        <shaderMaterial
          ref={skyMatRef}
          vertexShader={skyVert}
          fragmentShader={skyFrag}
          uniforms={skyUniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* 2. PHOTOREALISTIC CURVED EARTH HORIZON GLOBE, VOLUMETRIC CLOUDS & RAYLEIGH LIMB */}
      <group ref={earthGroupRef} position={[0, -2628.0, 0]} visible={false}>
        <mesh
          ref={earthGlobeRef}
          geometry={orbitalSphereGeo}
          scale={2600}
          rotation={[1.05, 1.95, 0.12]}
          raycast={NOOP_RAYCAST}
        >
          <shaderMaterial
            ref={earthGroundMatRef}
            vertexShader={earthGroundVert}
            fragmentShader={launchEarthFrag}
            uniforms={earthGroundUniforms}
          />
        </mesh>

        <mesh
          ref={cloudsRef}
          geometry={orbitalSphereGeo}
          scale={2600 * 1.0035}
          rotation={[1.05, 1.95, 0.12]}
          raycast={NOOP_RAYCAST}
          visible={false}
        >
          <shaderMaterial
            ref={cloudsMatRef}
            vertexShader={earthGroundVert}
            fragmentShader={launchCloudsFrag}
            uniforms={earthCloudsUniforms}
            transparent
            depthWrite={false}
          />
        </mesh>

        <mesh geometry={orbitalSphereGeo} scale={2600 * 1.0115} raycast={NOOP_RAYCAST}>
          <shaderMaterial
            ref={earthAtmMatRef}
            vertexShader={atmosphereVert}
            fragmentShader={atmosphereFrag}
            uniforms={atmosphereUniforms}
            transparent
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 3. CAPE CANAVERAL SPACEPORT TERRAIN COMPLEX */}
      <SpaceportTerrain altitudeKm={atmosphereController.getState().altitudeKm} />
      <LaunchPadModel />

      {/* 4. PHOTOREALISTIC WATER DELUGE STEAM & SMOKE BILLOWS (1 InstancedMesh) */}
      <LaunchSmokeVolumetrics />

      {/* 5. ROCKET MODEL & CREW DRAGON COCKPIT INTERIOR */}
      <RocketModel cameraMode={cameraMode} />
      <CockpitInterior cameraMode={cameraMode} />

      {/* 6. NATURAL AEROSPACE SUNLIGHTING (Balanced below Bloom threshold on diffuse hulls) */}
      <directionalLight
        position={[sunDir.x * 300, sunDir.y * 300, sunDir.z * 300]}
        intensity={1.72}
        color="#fff9f0"
      />
      <directionalLight
        position={[-120, 40, -160]}
        intensity={0.34}
        color="#7dd3fc"
      />
      <ambientLight intensity={0.24} color="#dbeafe" />
    </group>
  );
};
