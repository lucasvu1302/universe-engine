import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CelestialBodyData, CELESTIAL_BODIES } from '@/data/celestialData';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { AssetManager } from '@/engine/assets/AssetManager';
import { useAppStore } from '@/stores/useAppStore';
import { OrbitLine } from '@/entities/Orbits/OrbitLine';

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
}

export const Planet: React.FC<PlanetProps> = ({
  data,
  onSelect,
  onFocus,
  parentPosition
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const planetMeshRef = useRef<THREE.Mesh>(null);
  const cloudsMeshRef = useRef<THREE.Mesh>(null);
  const earthMatRef = useRef<THREE.ShaderMaterial>(null);
  const saturnPlanetMatRef = useRef<THREE.ShaderMaterial>(null);
  const saturnRingMatRef = useRef<THREE.ShaderMaterial>(null);
  const reticleRef = useRef<THREE.Group>(null);

  const setHoveredId = useAppStore((state) => state.setHoveredId);
  const selectedTarget = useAppStore((state) => state.targetId);
  const showOrbits = useAppStore((state) => state.showOrbits);
  const isSelected = selectedTarget === data.id;

  const scratchPos = useMemo(() => new THREE.Vector3(), []);
  const assets = AssetManager.getInstance();

  // 1. Textures from local /public/textures/planets/
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

  const saturnRingsMap = useMemo(() => {
    return data.rings ? assets.getSaturnRingsTexture() : null;
  }, [assets, data.rings]);

  // 2. Earth Multi-Pass Shader Uniforms
  const earthGroundUniforms = useMemo(() => {
    if (data.id !== 'earth') return null;
    return {
      uDayMap: { value: surfaceTexture },
      uNightMap: { value: earthNightMap },
      uSpecularMap: { value: earthSpecularMap },
      uCloudsMap: { value: earthCloudsMap },
      uSunPosition: { value: new THREE.Vector3(0, 0, 0) }
    };
  }, [data.id, surfaceTexture, earthNightMap, earthSpecularMap, earthCloudsMap]);

  // 3. Atmosphere Uniforms
  const atmosphereUniforms = useMemo(() => {
    return {
      uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
      uAtmosphereColor: {
        value: new THREE.Color(data.atmosphere?.color || '#38bdf8')
      }
    };
  }, [data.atmosphere?.color]);

  // 4. Saturn Planet & Ring Shadow Uniforms
  const saturnPlanetUniforms = useMemo(() => {
    if (data.id !== 'saturn') return null;
    return {
      uSurfaceTexture: { value: surfaceTexture },
      uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
      uRingNormal: { value: new THREE.Vector3(0, 1, 0) },
      uPlanetCenter: { value: new THREE.Vector3() },
      uRingInnerRadius: { value: data.rings?.innerRadius || 8.5 },
      uRingOuterRadius: { value: data.rings?.outerRadius || 15.0 }
    };
  }, [data.id, surfaceTexture, data.rings]);

  const saturnRingUniforms = useMemo(() => {
    if (!data.rings) return null;
    return {
      uRingTexture: { value: saturnRingsMap },
      uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
      uPlanetCenter: { value: new THREE.Vector3() },
      uPlanetRadius: { value: data.visualRadius }
    };
  }, [data.rings, saturnRingsMap, data.visualRadius]);

  useFrame(() => {
    const clock = SimulationClock.getInstance();
    const simTime = clock.simulationTime;

    // 1. Orbital position calculation
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

    // 2. Update Saturn shadow centers with live world position
    if (data.id === 'saturn' && groupRef.current) {
      const worldPos = groupRef.current.position;
      if (saturnPlanetMatRef.current) {
        saturnPlanetMatRef.current.uniforms.uPlanetCenter.value.copy(worldPos);
      }
      if (saturnRingMatRef.current) {
        saturnRingMatRef.current.uniforms.uPlanetCenter.value.copy(worldPos);
      }
    }

    // 3. Planet self-rotation
    if (planetMeshRef.current) {
      planetMeshRef.current.rotation.y = SimulationClock.calculateRotationAngle(
        data.rotationSpeed,
        simTime
      );
    }

    // 4. Earth Clouds Differential Rotation
    if (cloudsMeshRef.current) {
      cloudsMeshRef.current.rotation.y = SimulationClock.calculateRotationAngle(
        data.rotationSpeed * 1.15,
        simTime
      );
    }

    // 5. Reticle slow rotation & breathing
    if (reticleRef.current) {
      reticleRef.current.rotation.z += 0.008;
    }
  });

  return (
    <>
      <group ref={groupRef}>
        {/* Axial Tilt Container */}
        <group rotation={[THREE.MathUtils.degToRad(data.axialTiltDeg), 0, 0]}>
          {/* Case A: Earth Multi-Pass Photorealistic Surface */}
          {data.id === 'earth' && earthGroundUniforms ? (
            <mesh
              ref={planetMeshRef}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(data.id);
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
              <sphereGeometry args={[data.visualRadius, 64, 64]} />
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
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(data.id);
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
              <sphereGeometry args={[data.visualRadius, 64, 64]} />
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
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(data.id);
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
              <sphereGeometry args={[data.visualRadius, 64, 64]} />
              <meshStandardMaterial
                map={surfaceTexture}
                roughness={data.type === 'gas_giant' ? 0.75 : 0.85}
                metalness={0.02}
              />
            </mesh>
          )}

          {/* Earth Clouds Sphere */}
          {data.id === 'earth' && earthCloudsMap && (
            <mesh ref={cloudsMeshRef} scale={1.018}>
              <sphereGeometry args={[data.visualRadius, 64, 64]} />
              <meshStandardMaterial
                map={earthCloudsMap}
                transparent
                opacity={0.82}
                depthWrite={false}
                blending={THREE.NormalBlending}
              />
            </mesh>
          )}

          {/* Atmospheric Rayleigh Scattering Outer Shell - ISS Delicate Rim */}
          {data.atmosphere && (
            <mesh scale={1.018}>
              <sphereGeometry args={[data.visualRadius, 64, 64]} />
              <shaderMaterial
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
          {data.rings && saturnRingUniforms && (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry
                args={[
                  data.rings.innerRadius,
                  data.rings.outerRadius,
                  128
                ]}
              />
              <shaderMaterial
                ref={saturnRingMatRef}
                vertexShader={saturnRingVert}
                fragmentShader={saturnRingFrag}
                uniforms={saturnRingUniforms}
                side={THREE.DoubleSide}
                transparent
              />
            </mesh>
          )}

          {/* Sleek AAA Sci-Fi Holographic Targeting Reticle */}
          {isSelected && (
            <group ref={reticleRef}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry
                  args={[
                    data.visualRadius * 1.32,
                    data.visualRadius * 1.34,
                    128
                  ]}
                />
                <meshBasicMaterial
                  color="#38bdf8"
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.4}
                />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry
                  args={[
                    data.visualRadius * 1.22,
                    data.visualRadius * 1.23,
                    128
                  ]}
                />
                <meshBasicMaterial
                  color="#0284c7"
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.6}
                />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* Hierarchical Moons Orbiting this Parent Planet */}
      {data.moons &&
        data.moons.map((moonKey) => {
          const moonData = CELESTIAL_BODIES[moonKey];
          if (!moonData) return null;
          const showMoonOrbit = showOrbits && (selectedTarget === data.id || selectedTarget === moonKey);
          return (
            <React.Fragment key={`moon-group-${moonKey}`}>
              {/* Moon Orbit Line centered on parent planet only when focused */}
              {showMoonOrbit && (
                <group position={scratchPos}>
                  <OrbitLine
                    distance={moonData.visualDistance}
                    color={moonData.color}
                    isSelected={selectedTarget === moonKey}
                    eccentricity={0.02}
                    inclinationDeg={moonData.orbitalInclinationDeg ?? 1.5}
                  />
                </group>
              )}

              {/* Moon Celestial Body */}
              <Planet
                data={moonData}
                onSelect={onSelect}
                onFocus={onFocus}
                parentPosition={scratchPos}
              />
            </React.Fragment>
          );
        })}
    </>
  );
};
