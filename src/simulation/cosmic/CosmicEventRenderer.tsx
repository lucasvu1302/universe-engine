import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CosmicPlaybackState } from "./CosmicEventManager";
import { ParticleExplosion } from "../effects/ParticleExplosion";
import { ShockwaveRing } from "../effects/ShockwaveRing";
import { NebulaCloud } from "../effects/NebulaCloud";

interface CosmicEventRendererProps {
  playback: CosmicPlaybackState;
}

export const CosmicEventRenderer: React.FC<CosmicEventRendererProps> = ({ playback }) => {
  const { currentEvent, progress } = playback;
  const centralMeshRef = useRef<THREE.Mesh>(null);
  const discRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (centralMeshRef.current) {
      centralMeshRef.current.rotation.y += delta * 0.2;
    }
    if (discRef.current) {
      discRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group>
      {/* ---------------------------------------------------- */}
      {/* 1. BIG BANG EVENT                                    */}
      {/* ---------------------------------------------------- */}
      {currentEvent.type === "BIG_BANG" && (
        <group>
          {/* Initial Singularity / Core Flash */}
          <mesh ref={centralMeshRef}>
            <sphereGeometry args={[Math.max(0.5, (1.0 - progress) * 12), 32, 32]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={Math.pow(1.0 - progress, 0.8)}
            />
          </mesh>
          <pointLight color="#fffae0" intensity={(1.0 - progress) * 25} distance={300} />
          {/* Expanding Primordial Plasma Particles */}
          <ParticleExplosion
            progress={progress}
            count={2500}
            primaryColor="#ffffff"
            secondaryColor="#f59e0b"
            maxSpread={120}
          />
          {/* Relativistic Cosmic Inflation Shockwave */}
          <ShockwaveRing progress={progress} maxRadius={140} color="#fbbf24" thickness={4} />
          {/* Primordial Gas Cloud */}
          <NebulaCloud color="#f59e0b" size={60} intensity={(1.0 - progress) * 0.7} />
        </group>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. FIRST STAR BIRTH                                  */}
      {/* ---------------------------------------------------- */}
      {currentEvent.type === "STAR_BIRTH" && (
        <group>
          {/* Protostar Core Ignition */}
          <mesh ref={centralMeshRef}>
            <sphereGeometry args={[14, 32, 32]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={2.5}
              roughness={0.2}
            />
          </mesh>
          <pointLight color="#38bdf8" intensity={12} distance={200} />
          {/* Stellar Wind Shockwave */}
          <ShockwaveRing progress={progress} maxRadius={95} color="#38bdf8" thickness={2.5} />
          {/* Stellar Ignition & Accretion Inflow Sparks */}
          <ParticleExplosion
            progress={progress}
            count={1600}
            primaryColor="#38bdf8"
            secondaryColor="#818cf8"
            maxSpread={85}
          />
          {/* Gas Nebula Nursery */}
          <NebulaCloud color="#818cf8" size={55} intensity={0.65} />
        </group>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. SUPERNOVA CATACLYSM                               */}
      {/* ---------------------------------------------------- */}
      {currentEvent.type === "SUPERNOVA" && (
        <group>
          {/* Collapsing Core / Remnant Neutron Star */}
          <mesh ref={centralMeshRef}>
            <sphereGeometry args={[3.5, 32, 32]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <pointLight color="#ec4899" intensity={(1.0 - progress) * 20} distance={250} />
          {/* Titanic Debris Blast */}
          <ParticleExplosion
            progress={progress}
            count={3000}
            primaryColor="#ec4899"
            secondaryColor="#e11d48"
            maxSpread={130}
          />
          {/* Expanding Shockwaves (Double rings) */}
          <ShockwaveRing progress={progress} maxRadius={110} color="#f43f5e" thickness={3} />
          <ShockwaveRing
            progress={Math.max(0, progress - 0.15)}
            maxRadius={80}
            color="#fb7185"
            thickness={2}
          />
          <NebulaCloud color="#db2777" size={50} intensity={(1.0 - progress) * 0.6} />
        </group>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. PLANET FORMATION & ACCRETION DISC                 */}
      {/* ---------------------------------------------------- */}
      {currentEvent.type === "PLANET_FORMATION" && (
        <group>
          {/* Proto-Earth Core */}
          <mesh ref={centralMeshRef}>
            <sphereGeometry args={[12, 32, 32]} />
            <meshStandardMaterial
              color="#ea580c"
              emissive="#c2410c"
              emissiveIntensity={1.2}
              roughness={0.6}
            />
          </mesh>
          <pointLight color="#f97316" intensity={6} distance={120} />

          {/* Accretion Ring of Planetesimals */}
          <group ref={discRef}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[18, 55, 64]} />
              <meshBasicMaterial
                color="#78350f"
                transparent
                opacity={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
            <ParticleExplosion
              progress={progress * 0.5}
              count={800}
              primaryColor="#f97316"
              secondaryColor="#78350f"
              maxSpread={50}
            />
          </group>
        </group>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. GALAXY COLLISION                                  */}
      {/* ---------------------------------------------------- */}
      {currentEvent.type === "GALAXY_COLLISION" && (
        <group>
          {/* Galaxy A Center */}
          <mesh position={[-25 * (1.0 - progress), 0, 0]}>
            <sphereGeometry args={[6, 32, 32]} />
            <meshBasicMaterial color="#ffffff" />
            <pointLight color="#a855f7" intensity={8} distance={150} />
          </mesh>
          {/* Galaxy B Center */}
          <mesh position={[25 * (1.0 - progress), 8 * Math.sin(progress * 3), 0]}>
            <sphereGeometry args={[5, 32, 32]} />
            <meshBasicMaterial color="#ffffff" />
            <pointLight color="#6366f1" intensity={7} distance={150} />
          </mesh>

          {/* Tidal Star Stream Particles */}
          <ParticleExplosion
            progress={progress}
            count={2800}
            primaryColor="#c084fc"
            secondaryColor="#818cf8"
            maxSpread={100}
          />
          <NebulaCloud color="#7c3aed" size={65} intensity={0.55} />
        </group>
      )}
    </group>
  );
};
