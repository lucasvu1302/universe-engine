import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import megawaveVert from '@/shaders/ocean/megawave.vert.glsl';
import megawaveFrag from '@/shaders/ocean/megawave.frag.glsl';
import { ArrowLeftCircle, Clock, Waves, AlertTriangle } from 'lucide-react';
import { AudioManager } from '@/engine/audio/AudioManager';

interface MillersPlanetSceneProps {
  visible: boolean;
  onExit?: () => void;
}

export const MillersPlanetScene: React.FC<MillersPlanetSceneProps> = ({ visible, onExit: _onExit }) => {
  const oceanMatRef = useRef<THREE.ShaderMaterial>(null);
  const audio = AudioManager.getInstance();

  // Ticking sound effect for 1.25s time dilation
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      audio.playUIClick();
    }, 1250);

    return () => clearInterval(interval);
  }, [visible, audio]);

  useFrame((_, delta) => {
    if (oceanMatRef.current && visible) {
      oceanMatRef.current.uniforms.uTime.value += delta;
    }
  });

  if (!visible) return null;

  return (
    <group position={[0, -5, 0]}>
      {/* Sky Sphere dominated by Supermassive Black Hole Gargantua */}
      <mesh>
        <sphereGeometry args={[450, 32, 16]} />
        <meshBasicMaterial color="#050811" side={THREE.BackSide} />
      </mesh>

      {/* Gargantua in the sky */}
      <group position={[0, 180, -320]} scale={2.8}>
        {/* Event horizon core */}
        <mesh>
          <sphereGeometry args={[22, 32, 32]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* Blazing accretion halo */}
        <mesh rotation={[0.4, 0, 0]}>
          <ringGeometry args={[26, 60, 64]} />
          <meshBasicMaterial
            color="#ff9922"
            side={THREE.DoubleSide}
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* Endless Ocean Surface with 1,200m Megawaves */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[600, 600, 128, 128]} />
        <shaderMaterial
          ref={oceanMatRef}
          vertexShader={megawaveVert}
          fragmentShader={megawaveFrag}
          uniforms={{
            uTime: { value: 0.0 },
            uDepthColor: { value: new THREE.Color('#032840') },
            uSurfaceColor: { value: new THREE.Color('#0ea5e9') }
          }}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Endurance Lander Ranger Spacecraft floating on water */}
      <group position={[0, 4.5, 0]} scale={0.8}>
        <mesh>
          <boxGeometry args={[4.5, 1.2, 7.5]} />
          <meshStandardMaterial color="#f1f5f9" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Cockpit Canopy */}
        <mesh position={[0, 0.8, 1.8]}>
          <boxGeometry args={[2.0, 0.7, 2.5]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
      </group>

      {/* Lighting */}
      <directionalLight position={[0, 200, -300]} intensity={3.5} color="#ffb866" />
      <ambientLight intensity={0.5} color="#0c4a6e" />
    </group>
  );
};

export const MillersHUD: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-4 md:p-6 select-none font-mono">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full">
        <div className="pointer-events-auto flex items-center space-x-3 bg-black/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-sky-500/30 shadow-2xl">
          <Waves className="w-4 h-4 text-sky-400 animate-bounce" />
          <div>
            <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
              EXOPLANET EXPEDITION
            </div>
            <div className="text-sm font-bold text-white tracking-widest">
              MILLER'S OCEAN WORLD
            </div>
          </div>
        </div>

        {/* Exit Button */}
        <button
          onClick={onExit}
          className="pointer-events-auto flex items-center space-x-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/20 transition-all cursor-pointer backdrop-blur-md"
        >
          <ArrowLeftCircle className="w-4 h-4 text-sky-400" />
          <span className="text-xs">Exit Through Wormhole</span>
        </button>
      </div>

      {/* Bottom Time Dilation Alert */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
        <div className="pointer-events-auto flex items-center space-x-3 bg-red-950/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-red-500/40 shadow-2xl animate-pulse">
          <Clock className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <div className="text-xs font-bold text-red-300">
              GRAVITATIONAL TIME DILATION: 61,320×
            </div>
            <div className="text-[11px] text-slate-300">
              1 HOUR ON THIS WORLD = <strong className="text-white">7 YEARS ON EARTH</strong>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center space-x-2 bg-amber-950/70 backdrop-blur-md px-3 py-2 rounded-xl border border-amber-500/30 text-[11px] text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>TIDAL MEGAWAVE APPROACHING • 1,200 METERS</span>
        </div>
      </div>
    </div>
  );
};
