import * as THREE from 'three';
import { CELESTIAL_BODIES } from '@/data/celestialData';

export class SpacecraftEphemeris {
  private static instance: SpacecraftEphemeris;

  private readonly scratchSunToEarth = new THREE.Vector3();
  private readonly scratchBaseL2 = new THREE.Vector3();
  private readonly scratchPerpRight = new THREE.Vector3();
  private readonly scratchPerpUp = new THREE.Vector3();

  private constructor() {}

  public static getInstance(): SpacecraftEphemeris {
    if (!SpacecraftEphemeris.instance) {
      SpacecraftEphemeris.instance = new SpacecraftEphemeris();
    }
    return SpacecraftEphemeris.instance;
  }

  /**
   * Calculate live ISS position relative to Earth's center.
   * Inclination = 51.6 degrees, Period ~ 92.6 minutes.
   */
  public getISSPosition(simTime: number, earthCenter: THREE.Vector3, target = new THREE.Vector3()): THREE.Vector3 {
    const out = target;
    const orbitRadius = CELESTIAL_BODIES.earth.visualRadius + 1.15; // 420 km altitude
    const orbitalSpeed = 0.22; // Smooth cinematic LEO glide (~28.5s per orbit at 1x)
    const angle = simTime * orbitalSpeed + 2.35; // Start over sunlit blue Earth limb instead of midnight shadow
    const incRad = THREE.MathUtils.degToRad(51.6);

    const x = Math.cos(angle) * orbitRadius;
    const z = Math.sin(angle) * orbitRadius * Math.cos(incRad);
    const y = -Math.sin(angle) * orbitRadius * Math.sin(incRad);

    return out.set(earthCenter.x + x, earthCenter.y + y, earthCenter.z + z);
  }

  /**
   * Calculate James Webb Space Telescope (JWST) position at Sun-Earth L2 Halo Orbit.
   * 1.5 million km beyond Earth on anti-solar axis.
   */
  public getJWSTPosition(simTime: number, earthCenter: THREE.Vector3, target = new THREE.Vector3()): THREE.Vector3 {
    const out = target;
    // Vector from Sun (0, 0, 0) to Earth without allocating or cloning
    this.scratchSunToEarth.copy(earthCenter);
    if (this.scratchSunToEarth.lengthSq() > 0) {
      this.scratchSunToEarth.normalize();
    } else {
      this.scratchSunToEarth.set(1, 0, 0);
    }
    const l2Distance = 7.5; // Visual distance beyond Earth along anti-solar line

    // Halo orbit around L2 in the plane orthogonal to the Sun-Earth axis
    this.scratchPerpRight.set(-this.scratchSunToEarth.z, 0, this.scratchSunToEarth.x);
    if (this.scratchPerpRight.lengthSq() > 1e-6) {
      this.scratchPerpRight.normalize();
    } else {
      this.scratchPerpRight.set(0, 0, 1);
    }
    this.scratchPerpUp.crossVectors(this.scratchSunToEarth, this.scratchPerpRight).normalize();

    const haloRadius = 0.85;
    const haloAngle = simTime * 0.14;
    const cosH = Math.cos(haloAngle) * haloRadius;
    const sinH = Math.sin(haloAngle) * haloRadius;

    this.scratchBaseL2.copy(earthCenter).addScaledVector(this.scratchSunToEarth, l2Distance);
    return out
      .copy(this.scratchBaseL2)
      .addScaledVector(this.scratchPerpRight, cosH)
      .addScaledVector(this.scratchPerpUp, sinH);
  }

  /**
   * Calculate Voyager 1 position at ~163 AU heading towards Constellation Ophiuchus.
   */
  public getVoyager1Position(target = new THREE.Vector3()): THREE.Vector3 {
    const out = target;
    const distance = 420.0; // Scaled visual distance at edge of Solar System
    const ra = THREE.MathUtils.degToRad(261.0);
    const dec = THREE.MathUtils.degToRad(35.0);

    const x = distance * Math.cos(dec) * Math.cos(ra);
    const y = distance * Math.sin(dec);
    const z = distance * Math.cos(dec) * Math.sin(ra);

    return out.set(x, y, z);
  }

  /**
   * Calculate Voyager 2 position at ~136 AU heading towards Constellation Pavo.
   */
  public getVoyager2Position(target = new THREE.Vector3()): THREE.Vector3 {
    const out = target;
    const distance = 360.0;
    const ra = THREE.MathUtils.degToRad(300.0);
    const dec = THREE.MathUtils.degToRad(-48.0);

    const x = distance * Math.cos(dec) * Math.cos(ra);
    const y = distance * Math.sin(dec);
    const z = distance * Math.cos(dec) * Math.sin(ra);

    return out.set(x, y, z);
  }
}
