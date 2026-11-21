import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CelestialBodyData, CELESTIAL_BODIES } from '@/data/celestialData';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { AssetManager } from '@/engine/assets/AssetManager';
import { PerformanceManager } from '@/engine/performance/PerformanceManager';
import { useAppStore } from '@/stores/useAppStore';
import { OrbitLine } from '@/entities/Orbits/OrbitLine';
import { PlanetaryEventsLayer } from '@/entities/Phenomena/PlanetaryEventsLayer';

import earthGroundVert from '@/shaders/earth/earthGround.vert.glsl';
import earthGroundFrag from '@/shaders/earth/earthGround.frag.glsl';
import atmosphereVert from '@/shaders/atmosphere/atmosphere.vert.glsl';
import atmosphereFrag from '@/shaders/atmosphere/atmosphere.frag.glsl';
import saturnRingVert from '@/shaders/saturn/saturnRing.vert.glsl';
import saturnRingFrag from '@/shaders/saturn/saturnRing.frag.glsl';
import saturnPlanetVert from '@/shaders/saturn/saturnPlanet.vert.glsl';
import saturnPlanetFrag from '@/shaders/saturn/saturnPlanet.frag.glsl';

interface PlanetProps {
  data: CelestialBodyData;
  onSelect?: (id: string) => void;
  onFocus?: (id: string) => void;
  parentPosition?: THREE.Vector3;
  hideMoons?: boolean;
  hideEvents?: boolean;
  sunPosition?: [number, number, number];
}

const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};

const EARTH_CLOUDS_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vObjPos;
  void main() {
    vUv = uv;
    vObjPos = position;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const EARTH_CLOUDS_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uCloudsMap;
  uniform vec3 uSunPosition;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vObjPos;

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash31(i);
    float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }

  float fbm2(vec3 p) {
    float v = 0.62 * noise3(p);
    p = p * 2.11 + vec3(11.3, 5.7, 17.9);
    v += 0.38 * noise3(p);
    return v;
  }

  void main() {
    float camDist = length(cameraPosition - vWorldPos);
    float leoDetail = 1.0 - smoothstep(1.5, 8.0, camDist);

    float density = texture2D(uCloudsMap, vUv).r;
    float cumulus = 0.5;
    if (leoDetail > 0.01) {
      // Early-skip clear ocean skies before evaluating close-up cumulus FBM without hard-clipping soft cloud wisps
      if (density < 0.004) discard;
      float w1 = fbm2(vObjPos * 22.0);
      cumulus = fbm2(vObjPos * 66.0 + vec3(23.4, 9.1, 14.8));
      vec2 warp = (vec2(w1, cumulus) - 0.5) * (0.0072 * leoDetail);
      vec2 cUv = vec2(fract(vUv.x + warp.x), clamp(vUv.y + warp.y, 0.001, 0.999));
      float baseCloud = texture2D(uCloudsMap, cUv).r;
      float detailedCloud = smoothstep(
        0.12,
        0.86,
        baseCloud * (0.78 + 0.44 * cumulus)
      );
      density = mix(baseCloud, detailedCloud, leoDetail);
    }
    if (density < 0.012) discard;

    vec3 norm = normalize(vNormal);
    vec3 sunDir = normalize(uSunPosition - vWorldPos);
    float NdotL = dot(norm, sunDir);
    float dayLit = smoothstep(-0.14, 0.22, NdotL);
    float twilight = smoothstep(-0.18, 0.05, NdotL) * (1.0 - smoothstep(0.02, 0.26, NdotL));

    // Self-shadowed cloud tops with golden-rose sunset terminator tint
    float billowLight = 0.84 + 0.22 * cumulus * leoDetail;
    vec3 dayCloudCol = vec3(0.97, 0.98, 1.0) * billowLight * (0.35 + 0.65 * max(NdotL, 0.0));
    vec3 twilightCol = vec3(0.96, 0.64, 0.44) * 0.55;
    vec3 nightCloudCol = vec3(0.02, 0.035, 0.07);

    vec3 col = mix(nightCloudCol, dayCloudCol, dayLit) + twilightCol * twilight;
    gl_FragColor = vec4(col, density * 0.84);
  }
`;

export const Planet: React.FC<PlanetProps> = ({
  data,
  onSelect,
  onFocus,
  parentPosition,
  hideMoons = false,
  hideEvents = false,
  sunPosition = [0, 0, 0]
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const planetMeshRef = useRef<THREE.Mesh>(null);
  const cloudsMeshRef = useRef<THREE.Mesh>(null);
  const cloudsMatRef = useRef<THREE.ShaderMaterial>(null);
  const stdSurfaceMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const earthMatRef = useRef<THREE.ShaderMaterial>(null);
  const atmoMatRef = useRef<THREE.ShaderMaterial>(null);
  const saturnPlanetMatRef = useRef<THREE.ShaderMaterial>(null);
  const saturnRingMeshRef = useRef<THREE.Mesh>(null);
  const saturnRingMatRef = useRef<THREE.ShaderMaterial>(null);
  const reticleRef = useRef<THREE.Group>(null);

  const setHoveredId = useAppStore((state) => state.setHoveredId);
  const selectedTarget = useAppStore((state) => state.targetId);
  const showOrbits = useAppStore((state) => state.showOrbits);
  const quality = useAppStore((state) => state.graphicsQuality);
  const detectedGPUTier = useAppStore((state) => state.detectedGPUTier);
  const isSelected = selectedTarget === data.id;

  const scratchPos = useMemo(() => new THREE.Vector3(), []);
  const scratchWorldPos = useMemo(() => new THREE.Vector3(), []);
  const assets = AssetManager.getInstance();

  const unitSphere = useMemo(() => {
    const baseSegs = PerformanceManager.getInstance().getQualityProfile(
      quality,
      detectedGPUTier
    ).sphereSegments;
    const segs = data.type === 'moon' ? Math.max(16, Math.floor(baseSegs * 0.5)) : baseSegs;
    return assets.getUnitSphereGeometry(segs);
  }, [assets, data.type, quality, detectedGPUTier]);

  const surfaceTexture = useMemo(() => {
    return assets.loadTexture(data.id, () =>
      assets.getProceduralPlanetTexture(data.id, data.color)
    );
  }, [assets, data.id, data.color]);

  const earthNightMap = useMemo(() => {
    return data.id === 'earth' ? assets.getEarthNightMap() : null;
  }, [assets, data.id]);

  const earthSpecularMap = useMemo(() => {
    return data.id === 'earth' ? assets.getEarthSpecularMap() : null;
  }, [assets, data.id]);

  const earthCloudsMap = useMemo(() => {
    return data.id === 'earth' ? assets.getEarthCloudsMap() : null;
  }, [assets, data.id]);

  const earthGroundUniforms = useMemo(() => {
    if (data.id !== 'earth') return null;
    return {
      uDayMap: { value: surfaceTexture },
      uNightMap: { value: earthNightMap },
      uSpecularMap: { value: earthSpecularMap },
      uCloudsMap: { value: earthCloudsMap },
      uSunPosition: { value: new THREE.Vector3(sunPosition[0], sunPosition[1], sunPosition[2]) }
    };
  }, [data.id]);

  const earthCloudsUniforms = useMemo(() => {
    if (data.id !== 'earth') return null;
    return {
      uCloudsMap: { value: earthCloudsMap },
      uSunPosition: { value: new THREE.Vector3(sunPosition[0], sunPosition[1], sunPosition[2]) }
    };
  }, [data.id]);

  const atmosphereUniforms = useMemo(() => {
    return {
      uSunPosition: { value: new THREE.Vector3(sunPosition[0], sunPosition[1], sunPosition[2]) },
      uAtmosphereColor: {
        value: new THREE.Color(data.atmosphere?.color || '#38bdf8')
      },
      uOpacity: { value: 1.0 }
    };
  }, [data.id]);

  // Saturn Planet & Ring Shadow Uniforms (incorporates axialTiltDeg around +X; stable wrapper references)
  const saturnPlanetUniforms = useMemo(() => {
    if (data.id !== 'saturn') return null;
    const tiltRad = THREE.MathUtils.degToRad(data.axialTiltDeg);
    const ringNormal = new THREE.Vector3(0, Math.cos(tiltRad), Math.sin(tiltRad)).normalize();
    return {
      uSurfaceTexture: { value: surfaceTexture },
      uSunPosition: { value: new THREE.Vector3(sunPosition[0], sunPosition[1], sunPosition[2]) },
      uRingNormal: { value: ringNormal },
      uPlanetCenter: { value: new THREE.Vector3() },
      uRingInnerRadius: { value: data.rings?.innerRadius || 8.5 },
      uRingOuterRadius: { value: data.rings?.outerRadius || 15.0 }
    };
  }, [data.id]);

  const saturnRingUniforms = useMemo(() => {
    if (!data.rings) return null;
    return {
      uSunPosition: { value: new THREE.Vector3(sunPosition[0], sunPosition[1], sunPosition[2]) },
      uPlanetCenter: { value: new THREE.Vector3() },
      uPlanetRadius: { value: data.visualRadius },
      uInnerRadius: { value: data.rings.innerRadius },
      uOuterRadius: { value: data.rings.outerRadius }
    };
  }, [data.id, Boolean(data.rings)]);

  const ringGeometry = useMemo(() => {
    if (!data.rings) return null;
    return new THREE.RingGeometry(data.rings.innerRadius, data.rings.outerRadius, 128);
  }, [data.rings]);

  useEffect(() => {
    return () => {
      ringGeometry?.dispose();
    };
  }, [ringGeometry]);

  const [sunX, sunY, sunZ] = sunPosition;

  useEffect(() => {
    if (earthGroundUniforms) {
      earthGroundUniforms.uDayMap.value = surfaceTexture;
      earthGroundUniforms.uNightMap.value = earthNightMap;
      earthGroundUniforms.uSpecularMap.value = earthSpecularMap;
      earthGroundUniforms.uCloudsMap.value = earthCloudsMap;
      earthGroundUniforms.uSunPosition.value.set(sunX, sunY, sunZ);
    }
    if (earthCloudsUniforms) {
      earthCloudsUniforms.uCloudsMap.value = earthCloudsMap;
      earthCloudsUniforms.uSunPosition.value.set(sunX, sunY, sunZ);
    }
    atmosphereUniforms.uAtmosphereColor.value.set(data.atmosphere?.color || '#38bdf8');
    atmosphereUniforms.uSunPosition.value.set(sunX, sunY, sunZ);

    if (saturnPlanetUniforms) {
      const tiltRad = THREE.MathUtils.degToRad(data.axialTiltDeg);
      saturnPlanetUniforms.uSurfaceTexture.value = surfaceTexture;
      saturnPlanetUniforms.uSunPosition.value.set(sunX, sunY, sunZ);
      saturnPlanetUniforms.uRingNormal.value.set(0, Math.cos(tiltRad), Math.sin(tiltRad)).normalize();
      saturnPlanetUniforms.uRingInnerRadius.value = data.rings?.innerRadius || 8.5;
      saturnPlanetUniforms.uRingOuterRadius.value = data.rings?.outerRadius || 15.0;
    }

    if (saturnRingUniforms && data.rings) {
      saturnRingUniforms.uSunPosition.value.set(sunX, sunY, sunZ);
      saturnRingUniforms.uPlanetRadius.value = data.visualRadius;
      saturnRingUniforms.uInnerRadius.value = data.rings.innerRadius;
      saturnRingUniforms.uOuterRadius.value = data.rings.outerRadius;
    }
  }, [
    data.axialTiltDeg,
    data.atmosphere?.color,
    data.rings,
    data.visualRadius,
    surfaceTexture,
    earthNightMap,
    earthSpecularMap,
    earthCloudsMap,
    sunX,
    sunY,
    sunZ,
    earthGroundUniforms,
    earthCloudsUniforms,
    atmosphereUniforms,
    saturnPlanetUniforms,
    saturnRingUniforms
  ]);

  // Dispose component-owned materials & reticle geometries on unmount (preserve shared unitSphere & cached textures)
  useEffect(() => {
    const earthMat = earthMatRef.current;
    const atmoMat = atmoMatRef.current;
    const satPlanetMat = saturnPlanetMatRef.current;
    const satRingMat = saturnRingMatRef.current;
    const cloudsMat = cloudsMatRef.current;
    const stdMat = stdSurfaceMatRef.current;
    const reticleGroup = reticleRef.current;
    return () => {
      earthMat?.dispose();
      atmoMat?.dispose();
      satPlanetMat?.dispose();
      satRingMat?.dispose();
      cloudsMat?.dispose();
      stdMat?.dispose();
      reticleGroup?.traverse((obj) => {
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
  }, []);

  useFrame((state) => {
    const clock = SimulationClock.getInstance();
    const simTime = clock.simulationTime;

    if (data.visualDistance > 0) {
      SimulationClock.calculateOrbitPosition(
        {
          distance: data.visualDistance,
          speed: data.orbitalSpeed,
          eccentricity: data.type === 'rocky' ? 0.04 : 0.01,
          inclinationDeg: data.orbitalInclinationDeg ?? 0.0
        },
        simTime,
        scratchPos
      );

      if (parentPosition) {
        scratchPos.add(parentPosition);
      }

      if (groupRef.current) {
        groupRef.current.position.copy(scratchPos);
      }
    }

    if ((data.id === 'saturn' || data.rings) && groupRef.current) {
      groupRef.current.getWorldPosition(scratchWorldPos);
      if (saturnPlanetMatRef.current) {
        saturnPlanetMatRef.current.uniforms.uPlanetCenter.value.copy(scratchWorldPos);
      }
      if (saturnRingMatRef.current) {
        saturnRingMatRef.current.uniforms.uPlanetCenter.value.copy(scratchWorldPos);
      }
    }

    if (planetMeshRef.current) {
      planetMeshRef.current.rotation.y = SimulationClock.calculateRotationAngle(
        data.rotationSpeed,
        simTime
      );
    }

    if (cloudsMeshRef.current) {
      cloudsMeshRef.current.rotation.y = SimulationClock.calculateRotationAngle(
        data.rotationSpeed * 1.15,
        simTime
      );
    }

    if (reticleRef.current) {
      const camDist = state.camera.position.distanceTo(scratchPos);
      // Hide 3D vector selection rings during close-up cinema inspection (< 7.2 * radius)
      reticleRef.current.visible = isSelected && camDist > data.visualRadius * 7.2;
      if (reticleRef.current.visible) {
        reticleRef.current.rotation.z += 0.008;
      }
    }
  });

  return (
    <>
      <group ref={groupRef}>
        {/* Moon Orbit Rings stay centered on live moving parent planet inside un-tilted groupRef */}
        {!hideMoons &&
          data.moons &&
          data.moons.map((moonKey) => {
            const moonData = CELESTIAL_BODIES[moonKey];
            if (!moonData) return null;
            const showMoonOrbit =
              showOrbits && (selectedTarget === data.id || selectedTarget === moonKey);
            if (!showMoonOrbit) return null;
            return (
              <OrbitLine
                key={`moon-orbit-${moonKey}`}
                distance={moonData.visualDistance}
                color={moonData.color}
                isSelected={selectedTarget === moonKey}
                eccentricity={0.02}
                inclinationDeg={moonData.orbitalInclinationDeg ?? 1.5}
              />
            );
          })}

        {/* Axial Tilt Container */}
        <group rotation={[THREE.MathUtils.degToRad(data.axialTiltDeg), 0, 0]}>
          {/* Case A: Earth Multi-Pass Photorealistic Surface */}
          {data.id === 'earth' && earthGroundUniforms ? (
            <mesh
              ref={planetMeshRef}
              geometry={unitSphere}
              scale={data.visualRadius}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(data.id);
                onFocus?.(data.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onFocus?.(data.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredId(data.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredId(null);
                document.body.style.cursor = 'auto';
              }}
            >
              <shaderMaterial
                ref={earthMatRef}
                vertexShader={earthGroundVert}
                fragmentShader={earthGroundFrag}
                uniforms={earthGroundUniforms}
              />
            </mesh>
          ) : data.id === 'saturn' && saturnPlanetUniforms ? (
            /* Case B: Saturn Sphere with Ring Shadow Casting */
            <mesh
              ref={planetMeshRef}
              geometry={unitSphere}
              scale={data.visualRadius}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(data.id);
                onFocus?.(data.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onFocus?.(data.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredId(data.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredId(null);
                document.body.style.cursor = 'auto';
              }}
            >
              <shaderMaterial
                ref={saturnPlanetMatRef}
                vertexShader={saturnPlanetVert}
                fragmentShader={saturnPlanetFrag}
                uniforms={saturnPlanetUniforms}
              />
            </mesh>
          ) : (
            /* Case C: Generic / Rocky / Gas Giant Photorealistic Surface */
            <mesh
              ref={planetMeshRef}
              geometry={unitSphere}
              scale={data.visualRadius}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(data.id);
                onFocus?.(data.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onFocus?.(data.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredId(data.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredId(null);
                document.body.style.cursor = 'auto';
              }}
            >
              <meshStandardMaterial
                ref={stdSurfaceMatRef}
                map={surfaceTexture}
                roughness={data.type === 'gas_giant' ? 0.75 : 0.85}
                metalness={0.02}
              />
            </mesh>
          )}

          {/* Earth Clouds Sphere (1.012× — procedural LEO cumulus FBM beneath 1.028× Rayleigh limb) */}
          {data.id === 'earth' && earthCloudsMap && earthCloudsUniforms && (
            <mesh
              ref={cloudsMeshRef}
              geometry={unitSphere}
              scale={data.visualRadius * 1.012}
              raycast={NOOP_RAYCAST}
            >
              <shaderMaterial
                ref={cloudsMatRef}
                vertexShader={EARTH_CLOUDS_VERT}
                fragmentShader={EARTH_CLOUDS_FRAG}
                uniforms={earthCloudsUniforms}
                transparent
                depthWrite={false}
                blending={THREE.NormalBlending}
              />
            </mesh>
          )}

          {/* Atmospheric Rayleigh Scattering Outer Shell */}
          {data.atmosphere && (
            <mesh
              geometry={unitSphere}
              scale={data.visualRadius * 1.028}
              raycast={NOOP_RAYCAST}
            >
              <shaderMaterial
                ref={atmoMatRef}
                vertexShader={atmosphereVert}
                fragmentShader={atmosphereFrag}
                uniforms={atmosphereUniforms}
                transparent
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          )}

          {/* Saturn Rings with Optical Depth & Planet Shadow Occlusion */}
          {data.rings && saturnRingUniforms && ringGeometry && (
            <mesh
              ref={saturnRingMeshRef}
              geometry={ringGeometry}
              rotation={[Math.PI / 2, 0, 0]}
              raycast={NOOP_RAYCAST}
            >
              <shaderMaterial
                ref={saturnRingMatRef}
                vertexShader={saturnRingVert}
                fragmentShader={saturnRingFrag}
                uniforms={saturnRingUniforms}
                side={THREE.DoubleSide}
                transparent
                depthWrite={false}
              />
            </mesh>
          )}

          {/* Live Per-Planet Surface & Atmospheric Events (curved GLSL caps, GPU ballistic plumes, polar auroras & spokes) */}
          {!hideEvents && (
            <PlanetaryEventsLayer
              bodyId={data.id}
              visualRadius={data.visualRadius}
              ringInnerRadius={data.rings?.innerRadius}
              ringOuterRadius={data.rings?.outerRadius}
            />
          )}

          {/* Sleek AAA Sci-Fi Holographic Targeting Reticle (Kept mounted via visible for zero allocation churn) */}
          <group ref={reticleRef} visible={isSelected} scale={data.visualRadius}>
            <mesh rotation={[Math.PI / 2, 0, 0]} raycast={NOOP_RAYCAST}>
              <ringGeometry args={[1.32, 1.34, 96]} />
              <meshBasicMaterial
                color="#38bdf8"
                side={THREE.DoubleSide}
                transparent
                opacity={0.4}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} raycast={NOOP_RAYCAST}>
              <ringGeometry args={[1.22, 1.23, 96]} />
              <meshBasicMaterial
                color="#0284c7"
                side={THREE.DoubleSide}
                transparent
                opacity={0.6}
              />
            </mesh>
          </group>
        </group>
      </group>

      {/* Hierarchical Moons Orbiting this Parent Planet */}
      {!hideMoons &&
        data.moons &&
        data.moons.map((moonKey) => {
          const moonData = CELESTIAL_BODIES[moonKey];
          if (!moonData) return null;
          return (
            <Planet
              key={`moon-body-${moonKey}`}
              data={moonData}
              onSelect={onSelect}
              onFocus={onFocus}
              parentPosition={scratchPos}
              hideEvents={hideEvents}
            />
          );
        })}
    </>
  );
};
