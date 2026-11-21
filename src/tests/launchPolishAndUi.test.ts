import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { AtmosphereController } from '@/simulation/launch/AtmosphereController';

const SRC_ROOT = path.resolve(__dirname, '..');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relPath), 'utf8');
}

describe('Launch Earth Photorealism, Pad Clearance & Cockpit HUD Layout (SPEC-LUNGTUNG-2026-11-21-005)', () => {
  describe('R1: High-Detail Orbital Launch Earth/Clouds Shaders & Outside-Shell Mesosphere Sky', () => {
    it('R1.a uses dedicated multi-scale orbital launchEarth and launchClouds shaders with Rayleigh limb haze and keeps the camera outside the BackSide atmosphere shell at 78.4 km', () => {
      const launchSceneSrc = readSrc('simulation/launch/LaunchScene.tsx');
      expect(launchSceneSrc).toContain('launchEarth.frag.glsl');
      expect(launchSceneSrc).toContain('launchClouds.frag.glsl');

      const earthShaderPath = path.join(SRC_ROOT, 'shaders/launch/launchEarth.frag.glsl');
      const cloudsShaderPath = path.join(SRC_ROOT, 'shaders/launch/launchClouds.frag.glsl');
      expect(fs.existsSync(earthShaderPath)).toBe(true);
      expect(fs.existsSync(cloudsShaderPath)).toBe(true);

      const earthFrag = fs.readFileSync(earthShaderPath, 'utf8');
      const cloudsFrag = fs.readFileSync(cloudsShaderPath, 'utf8');
      // Orbital Earth shader must compute 3D spherical FBM geography & Rayleigh horizon scattering without camDist < 7.5 cutoff
      // and clamp viewDot to [0, 1] so pow(1.0 - viewDot, ...) never yields NaN at nadir on Metal/ANGLE GPUs
      expect(earthFrag).toContain('vObjPos');
      expect(earthFrag).toContain('limbHaze');
      expect(earthFrag).toContain('clamp(dot(norm, viewDir), 0.0, 1.0)');
      expect(earthFrag).not.toContain('smoothstep(1.4, 7.5, camDist)');
      // Volumetric launch clouds must use custom shader with 3D spherical cloud detail and clamped viewDot
      expect(cloudsFrag).toContain('vObjPos');
      expect(cloudsFrag).toContain('uOpacity');
      expect(cloudsFrag).toContain('clamp(dot(norm, viewDir), 0.0, 1.0)');

      // Atmosphere shell thickness must be strictly smaller than orbitalDrop at 78.4 km so the camera never sits inside the BackSide additive shell
      const atmoScaleMatch = launchSceneSrc.match(/scale=\{2600 \* (1\.\d+)\}/g) || [];
      const atmoShellRatio = Math.max(
        ...atmoScaleMatch.map((s) => parseFloat(s.replace(/.*\* /, '').replace('}', '')))
      );
      expect(atmoShellRatio).toBeLessThanOrEqual(1.013); // <= 33.8 units thick (< orbitalDrop ~68u at 78.4 km)

      // At 78.4 km mesosphere, sky must already be near-space dark indigo/black with bright stars visible
      const atm = AtmosphereController.getInstance().update(78.4, 3.6);
      expect(atm.starVisibility).toBeGreaterThanOrEqual(0.75);
      expect(atm.skyColor.b).toBeLessThan(0.18);
    });

    it('R1.b (neg) eliminates the oversized 1.022 atmosphere shell and plain blurry MeshStandardMaterial clouds in LaunchScene', () => {
      const launchSceneSrc = readSrc('simulation/launch/LaunchScene.tsx');
      expect(launchSceneSrc).not.toContain('2600 * 1.022');
      expect(launchSceneSrc).not.toContain('<meshStandardMaterial\n            ref={cloudsMatRef}');
    });
  });

  describe('R2 & R3: Crew Access Arm Cabin Clearance & Collision-Free CockpitHUD Layout', () => {
    it('R2.a keeps Crew Access Arm White Room & Concertina Seal strictly outside the R=1.76m Dragon hull (world x <= -1.76) so T+00:00 COCKPIT has zero wall clipping', () => {
      const padSrc = readSrc('simulation/launch/LaunchPadModel.tsx');
      // Tower is at x = -7.8, crewArmRef hinge is at +1.45 -> world hinge x = -6.35
      // Parse exact numeric X centers & widths for White Room and Concertina Seal and assert world reach <= -1.76
      const whiteRoomMatch = padSrc.match(
        /Environmental Cleanroom[\s\S]*?<mesh position=\{\[(\d+(?:\.\d+)?),\s*0,\s*0\]\}>\s*<boxGeometry args=\{\[(\d+(?:\.\d+)?),/
      );
      const sealMatch = padSrc.match(
        /Environmental Cleanroom[\s\S]*?<mesh position=\{\[(\d+(?:\.\d+)?),\s*0,\s*0\]\} rotation=\{\[0,\s*0,\s*Math\.PI \/ 2\]\}>\s*<cylinderGeometry args=\{\[[\d.]+,\s*[\d.]+,\s*(\d+(?:\.\d+)?),/
      );
      expect(whiteRoomMatch).not.toBeNull();
      expect(sealMatch).not.toBeNull();

      const hingeWorldX = -7.8 + 1.45; // -6.35
      const whiteRoomMaxWorldX =
        hingeWorldX + parseFloat(whiteRoomMatch![1]) + parseFloat(whiteRoomMatch![2]) / 2;
      const sealTipWorldX =
        hingeWorldX + parseFloat(sealMatch![1]) + parseFloat(sealMatch![2]) / 2;

      expect(whiteRoomMaxWorldX).toBeLessThanOrEqual(-1.76);
      expect(sealTipWorldX).toBeLessThanOrEqual(-1.76);
    });

    it('R3.a & R3.b (neg) stacks CockpitHUD narration card and camera selector cleanly in flow beneath the top header without fixed md:top-20 overlap', () => {
      const hudSrc = readSrc('simulation/launch/CockpitHUD.tsx');
      expect(hudSrc).not.toContain('md:top-20');
      expect(hudSrc).not.toContain('md:fixed md:top-24 md:right-6');
      expect(hudSrc).toContain('data-testid="launch-header-badge"');
      expect(hudSrc).toContain('data-testid="launch-narration-card"');
      expect(hudSrc).toContain('data-testid="launch-camera-dock"');
      expect(hudSrc).toContain('data-testid="launch-exit-btn"');
    });
  });
});
