import * as THREE from 'three';
import { CELESTIAL_BODIES } from '@/data/celestialData';

export class SpacecraftEphemeris {
  private static instance: SpacecraftEphemeris;

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
    const orbitRadius = CELESTIAL_BODIES.earth.visualRadius + 1.15; // 420 km altitude
    const orbitalSpeed = 8.5; // Fast LEO orbital speed
    const angle = simTime * orbitalSpeed;
    const incRad = THREE.MathUtils.degToRad(51.6);

    const x = Math.cos(angle) * orbitRadius;
    const z = Math.sin(angle) * orbitRadius * Math.cos(incRad);
    const y = -Math.sin(angle) * orbitRadius * Math.sin(incRad);

    return target.set(earthCenter.x + x, earthCenter.y + y, earthCenter.z + z);
  }

  /**
   * Calculate James Webb Space Telescope (JWST) position at Sun-Earth L2 Halo Orbit.
   * 1.5 million km beyond Earth on anti-solar axis.
   */
  public getJWSTPosition(simTime: number, earthCenter: THREE.Vector3, target = new THREE.Vector3()): THREE.Vector3 {
    // Vector from Sun (0, 0, 0) to Earth
    const sunToEarth = earthCenter.clone().normalize();
    const l2Distance = 7.5; // Visual distance beyond Earth along anti-solar line

    // Halo orbit around L2
    const haloRadius = 1.4;
    const haloAngle = simTime * 0.8;
    const haloX = Math.cos(haloAngle) * haloRadius;
    const haloY = Math.sin(haloAngle) * haloRadius;

    const baseL2 = earthCenter.clone().add(sunToEarth.multiplyScalar(l2Distance));
    return target.set(baseL2.x + haloX, baseL2.y + haloY, baseL2.z);
  }

  /**
   * Calculate Voyager 1 position at ~163 AU heading towards Constellation Ophiuchus.
   */
  public getVoyager1Position(target = new THREE.Vector3()): THREE.Vector3 {
    const distance = 420.0; // Scaled visual distance at edge of Solar System
    const ra = THREE.MathUtils.degToRad(261.0);
    const dec = THREE.MathUtils.degToRad(35.0);

    const x = distance * Math.cos(dec) * Math.cos(ra);
    const y = distance * Math.sin(dec);
    const z = distance * Math.cos(dec) * Math.sin(ra);

    return target.set(x, y, z);
  }

  /**
   * Calculate Voyager 2 position at ~136 AU heading towards Constellation Pavo.
   */
  public getVoyager2Position(target = new THREE.Vector3()): THREE.Vector3 {
    const distance = 360.0;
    const ra = THREE.MathUtils.degToRad(300.0);
    const dec = THREE.MathUtils.degToRad(-48.0);

    const x = distance * Math.cos(dec) * Math.cos(ra);
    const y = distance * Math.sin(dec);
    const z = distance * Math.cos(dec) * Math.sin(ra);

    return target.set(x, y, z);
  }
}
