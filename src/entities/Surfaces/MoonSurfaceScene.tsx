import React, { useMemo } from 'react';
import * as THREE from 'three';

interface MoonSurfaceSceneProps {
  visible: boolean;
}

export const MoonSurfaceScene: React.FC<MoonSurfaceSceneProps> = ({ visible }) => {
  // 1. Procedural Lunar Regolith Crater Terrain
  const moonTerrainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(300, 300, 96, 96);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Micro craters and rolling highland swells
      const r1 = Math.sin(x * 0.035) * Math.cos(z * 0.035) * 3.2;
      const r2 = Math.cos(x * 0.08 - z * 0.07) * 1.4;
      
      // Distinct impact craters
      const dCenter = Math.sqrt((x - 20) * (x - 20) + (z + 15) * (z + 15));
      const craterA = Math.sin(Math.min(Math.PI, dCenter * 0.15)) * -4.0;

      pos.setY(i, r1 + r2 + (dCenter < 25 ? craterA : 0) - 2.5);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  if (!visible) return null;

  return (
    <group position={[0, -2, 0]}>
      {/* Pitch-Black Airless Lunar Sky */}
      <mesh>
        <sphereGeometry args={[280, 32, 16]} />
        <meshBasicMaterial color="#010103" side={THREE.BackSide} />
      </mesh>

      {/* Earthrise: The Blue Marble hanging low on the Lunar Horizon */}
      <group position={[120, 50, -180]}>
        <mesh>
          <sphereGeometry args={[16, 32, 32]} />
          <meshStandardMaterial
            color="#2b82c9"
            emissive="#113355"
            roughness={0.4}
          />
        </mesh>
        {/* Delicate Earth atmosphere rim */}
        <mesh scale={1.03}>
          <sphereGeometry args={[16, 32, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} side={THREE.BackSide} />
        </mesh>
      </group>

      {/* Lunar Regolith Ground */}
      <mesh geometry={moonTerrainGeo} receiveShadow>
        <meshStandardMaterial
          color="#8c929c"
          roughness={0.96}
          metalness={0.02}
          flatShading
        />
      </mesh>

      {/* Harsh Unfiltered Direct Sunlight in Vacuum */}
      <directionalLight
        position={[-150, 90, 80]}
        intensity={2.8}
        color="#ffffff"
      />
      <ambientLight intensity={0.08} color="#222831" />

      {/* Apollo 11 Lunar Module (Eagle) */}
      <group position={[0, -1.8, 0]}>
        {/* Descent Stage (Octagonal Gold Foil base) */}
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[2.5, 2.8, 1.8, 8]} />
          <meshStandardMaterial color="#d4af37" metalness={0.92} roughness={0.25} />
        </mesh>

        {/* 4 Landing Legs */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => (
          <group key={`leg-${idx}`} rotation={[0, angle, 0]}>
            <mesh position={[2.6, 0.4, 0]} rotation={[0, 0, -0.6]}>
              <cylinderGeometry args={[0.08, 0.08, 2.5]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </mesh>
            {/* Footpad */}
            <mesh position={[3.3, -0.2, 0]}>
              <cylinderGeometry args={[0.55, 0.55, 0.1, 16]} />
              <meshStandardMaterial color="#d4af37" metalness={0.8} />
            </mesh>
          </group>
        ))}

        {/* Ascent Stage (Upper cabin with docking hatch & RCS thrusters) */}
        <mesh position={[0, 2.7, 0]}>
          <boxGeometry args={[2.4, 1.8, 2.2]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.65} roughness={0.4} />
        </mesh>

        {/* Front Triangular Windows */}
        <mesh position={[0.5, 3.0, 1.12]}>
          <boxGeometry args={[0.6, 0.4, 0.05]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
        <mesh position={[-0.5, 3.0, 1.12]}>
          <boxGeometry args={[0.6, 0.4, 0.05]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
      </group>

      {/* Apollo 11 American Flag on Lunar Surface */}
      <group position={[6, -1.6, 4]}>
        {/* Flagpole */}
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 2.8]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} />
        </mesh>
        {/* Horizontal strut and fabric */}
        <mesh position={[0.75, 2.2, 0]}>
          <planeGeometry args={[1.5, 1.0]} />
          <meshStandardMaterial color="#ef4444" side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      </group>

      {/* Astronaut Footprints in Regolith */}
      {[
        [1.2, -1.75, 1.5],
        [1.8, -1.75, 2.2],
        [2.5, -1.75, 2.9],
        [3.3, -1.75, 3.4],
        [4.2, -1.75, 3.7]
      ].map(([fx, fy, fz], idx) => (
        <mesh key={`footprint-${idx}`} position={[fx, fy, fz]} rotation={[-Math.PI / 2, 0, 0.5]}>
          <planeGeometry args={[0.3, 0.6]} />
          <meshBasicMaterial color="#475569" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
};
