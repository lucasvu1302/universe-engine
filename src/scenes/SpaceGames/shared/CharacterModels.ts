import * as THREE from 'three';
import type { MechPaintId } from '@/stores/useAppStore';

export const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};

export interface ArticulatedRig {
  root: THREE.Group;
  torso?: THREE.Object3D;
  head?: THREE.Object3D;
  leftArm?: THREE.Object3D;
  rightArm?: THREE.Object3D;
  leftLeg?: THREE.Object3D;
  rightLeg?: THREE.Object3D;
  jetpackFlame?: THREE.Object3D;
  visorMesh?: THREE.Mesh;
}

function makeMesh(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.raycast = NOOP_RAYCAST;
  return m;
}

/**
 * Builds an articulated 3D Space Explorer / Combat Astronaut rig with metallic visor,
 * backpack thrusters, animated limbs, and glowing jetpack cones.
 * Every geometry & material is locally owned and must be freed via `disposeObjectTree`.
 */
export function buildAstronautRig(accentHex = '#38bdf8'): ArticulatedRig {
  const root = new THREE.Group();

  const suitMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.42,
    metalness: 0.18,
  });
  const darkJointMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.6,
    metalness: 0.35,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.75,
    roughness: 0.3,
    metalness: 0.4,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: '#f59e0b',
    emissive: '#d97706',
    emissiveIntensity: 0.55,
    roughness: 0.12,
    metalness: 0.92,
  });
  const flameMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.85,
  });

  // Torso group
  const torso = new THREE.Group();
  torso.position.set(0, 1.05, 0);
  root.add(torso);

  const chest = makeMesh(new THREE.BoxGeometry(0.68, 0.78, 0.42), suitMat);
  torso.add(chest);

  const chestCore = makeMesh(new THREE.BoxGeometry(0.24, 0.18, 0.08), accentMat);
  chestCore.position.set(0, 0.08, 0.22);
  torso.add(chestCore);

  const belt = makeMesh(new THREE.BoxGeometry(0.7, 0.14, 0.44), darkJointMat);
  belt.position.set(0, -0.35, 0);
  torso.add(belt);

  // Jetpack backpack
  const pack = makeMesh(new THREE.BoxGeometry(0.56, 0.64, 0.28), darkJointMat);
  pack.position.set(0, 0.05, -0.32);
  torso.add(pack);

  const packStripe = makeMesh(new THREE.BoxGeometry(0.46, 0.1, 0.3), accentMat);
  packStripe.position.set(0, 0.18, -0.32);
  torso.add(packStripe);

  // Dual thruster cones
  const jetpackFlame = new THREE.Group();
  jetpackFlame.position.set(0, -0.35, -0.34);
  const coneGeo = new THREE.ConeGeometry(0.11, 0.58, 10);
  coneGeo.rotateX(Math.PI);
  const flameL = makeMesh(coneGeo, flameMat);
  flameL.position.set(-0.16, -0.24, 0);
  const flameR = makeMesh(coneGeo.clone(), flameMat);
  flameR.position.set(0.16, -0.24, 0);
  jetpackFlame.add(flameL, flameR);
  torso.add(jetpackFlame);

  // Helmet & Gold Visor
  const head = new THREE.Group();
  head.position.set(0, 0.64, 0);
  torso.add(head);

  const helmet = makeMesh(new THREE.SphereGeometry(0.32, 16, 14), suitMat);
  head.add(helmet);

  const visorMesh = makeMesh(new THREE.SphereGeometry(0.26, 14, 12), visorMat);
  visorMesh.scale.set(1.02, 0.84, 0.85);
  visorMesh.position.set(0, 0.02, 0.14);
  head.add(visorMesh);

  const antenna = makeMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 6), accentMat);
  antenna.position.set(0.28, 0.18, -0.05);
  head.add(antenna);

  // Arms
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.46, 0.28, 0);
  const armGeoL = new THREE.BoxGeometry(0.22, 0.66, 0.22);
  const armMeshL = makeMesh(armGeoL, suitMat);
  armMeshL.position.set(0, -0.26, 0);
  leftArm.add(armMeshL);
  torso.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.46, 0.28, 0);
  const armMeshR = makeMesh(armGeoL.clone(), suitMat);
  armMeshR.position.set(0, -0.26, 0);
  rightArm.add(armMeshR);

  // Mounted Plasma Rifle / Tool on right forearm
  const rifle = makeMesh(new THREE.BoxGeometry(0.14, 0.16, 0.62), darkJointMat);
  rifle.position.set(0, -0.45, 0.28);
  const rifleTip = makeMesh(new THREE.BoxGeometry(0.1, 0.1, 0.16), accentMat);
  rifleTip.position.set(0, -0.45, 0.62);
  rightArm.add(rifle, rifleTip);
  torso.add(rightArm);

  // Legs
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.19, 0.64, 0);
  const legGeo = new THREE.BoxGeometry(0.24, 0.62, 0.26);
  const legMeshL = makeMesh(legGeo, suitMat);
  legMeshL.position.set(0, -0.31, 0);
  const bootL = makeMesh(new THREE.BoxGeometry(0.26, 0.16, 0.34), darkJointMat);
  bootL.position.set(0, -0.58, 0.04);
  leftLeg.add(legMeshL, bootL);
  root.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.19, 0.64, 0);
  const legMeshR = makeMesh(legGeo.clone(), suitMat);
  legMeshR.position.set(0, -0.31, 0);
  const bootR = makeMesh(new THREE.BoxGeometry(0.26, 0.16, 0.34), darkJointMat);
  bootR.position.set(0, -0.58, 0.04);
  rightLeg.add(legMeshR, bootR);
  root.add(rightLeg);

  return { root, torso, head, leftArm, rightArm, leftLeg, rightLeg, jetpackFlame, visorMesh };
}

/**
 * Animates humanoid astronaut or mech limbs smoothly without allocations.
 */
export function animateHumanoidRun(
  rig: ArticulatedRig,
  elapsed: number,
  speedNorm: number,
  jetpacking: boolean
): void {
  const swing = Math.sin(elapsed * 11.5) * 0.68 * Math.min(1, speedNorm);
  if (rig.leftLeg) rig.leftLeg.rotation.x = jetpacking ? -0.25 : swing;
  if (rig.rightLeg) rig.rightLeg.rotation.x = jetpacking ? 0.22 : -swing;
  if (rig.leftArm) rig.leftArm.rotation.x = jetpacking ? -0.45 : -swing * 0.85;
  if (rig.rightArm) rig.rightArm.rotation.x = jetpacking ? -0.35 : -0.35 + swing * 0.25;
  if (rig.torso) {
    rig.torso.rotation.x = jetpacking ? 0.18 : speedNorm * 0.08;
  }
  if (rig.jetpackFlame) {
    const flameScale = jetpacking ? 1.15 + Math.sin(elapsed * 42) * 0.25 : speedNorm > 0.2 ? 0.38 : 0.12;
    rig.jetpackFlame.scale.set(1, flameScale, 1);
    rig.jetpackFlame.visible = flameScale > 0.14;
  }
}

/**
 * Builds a hovering miniature TARS companion monolith.
 */
export function buildMiniTarsRig(): ArticulatedRig {
  const root = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: '#64748b',
    roughness: 0.35,
    metalness: 0.78,
  });
  const screenMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });

  for (let i = 0; i < 4; i++) {
    const slab = makeMesh(new THREE.BoxGeometry(0.14, 0.78, 0.18), metalMat);
    slab.position.set((i - 1.5) * 0.16, 0, 0);
    root.add(slab);
  }
  const screen = makeMesh(new THREE.BoxGeometry(0.26, 0.12, 0.03), screenMat);
  screen.position.set(-0.08, 0.18, 0.1);
  root.add(screen);

  return { root };
}

const MECH_PAINTS: Record<MechPaintId, { primary: string; secondary: string; glow: string }> = {
  cobalt: { primary: '#2563eb', secondary: '#1e293b', glow: '#38bdf8' },
  crimson: { primary: '#dc2626', secondary: '#1f2937', glow: '#fb923c' },
  gold: { primary: '#d97706', secondary: '#1c1917', glow: '#fde047' },
  obsidian: { primary: '#334155', secondary: '#0f172a', glow: '#a855f7' },
};

/**
 * Builds an imposing 8-meter articulated bipedal Orbital Space Mech with twin weapons
 * (Plasma Autocannon left arm + Armor-Piercing Railgun right arm) and dorsal thrusters.
 */
export function buildSpaceMechRig(paint: MechPaintId = 'cobalt'): ArticulatedRig {
  const palette = MECH_PAINTS[paint] ?? MECH_PAINTS.cobalt;
  const root = new THREE.Group();

  const armorMat = new THREE.MeshStandardMaterial({
    color: palette.primary,
    roughness: 0.32,
    metalness: 0.65,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: palette.secondary,
    roughness: 0.52,
    metalness: 0.55,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: palette.glow,
    emissive: palette.glow,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.2,
  });
  const flameMat = new THREE.MeshBasicMaterial({
    color: palette.glow,
    transparent: true,
    opacity: 0.85,
  });

  // Heavy Torso & Cockpit
  const torso = new THREE.Group();
  torso.position.set(0, 2.35, 0);
  root.add(torso);

  const hull = makeMesh(new THREE.BoxGeometry(1.7, 1.45, 1.2), armorMat);
  torso.add(hull);

  const cockpitVisor = makeMesh(new THREE.BoxGeometry(0.95, 0.42, 0.35), glowMat);
  cockpitVisor.position.set(0, 0.22, 0.55);
  torso.add(cockpitVisor);

  // Broad Shoulder Pauldrons
  const pauldronGeo = new THREE.BoxGeometry(0.75, 0.68, 1.15);
  const pauldronL = makeMesh(pauldronGeo, armorMat);
  pauldronL.position.set(-1.18, 0.45, 0);
  const pauldronR = makeMesh(pauldronGeo.clone(), armorMat);
  pauldronR.position.set(1.18, 0.45, 0);
  torso.add(pauldronL, pauldronR);

  // Dorsal Booster Thrusters
  const jetpackFlame = new THREE.Group();
  jetpackFlame.position.set(0, -0.1, -0.78);
  const coneGeo = new THREE.ConeGeometry(0.24, 1.15, 10);
  coneGeo.rotateX(-Math.PI / 2);
  const jetL = makeMesh(coneGeo, flameMat);
  jetL.position.set(-0.45, 0.2, -0.45);
  const jetR = makeMesh(coneGeo.clone(), flameMat);
  jetR.position.set(0.45, 0.2, -0.45);
  jetpackFlame.add(jetL, jetR);
  torso.add(jetpackFlame);

  // Left Arm: Twin Plasma Autocannon
  const leftArm = new THREE.Group();
  leftArm.position.set(-1.32, 0.05, 0.1);
  const lUpper = makeMesh(new THREE.BoxGeometry(0.42, 0.9, 0.46), frameMat);
  lUpper.position.set(0, -0.35, 0);
  const plasmaPod = makeMesh(new THREE.BoxGeometry(0.46, 0.42, 1.35), armorMat);
  plasmaPod.position.set(0, -0.72, 0.55);
  const barrel1 = makeMesh(new THREE.CylinderGeometry(0.08, 0.08, 0.85, 8), glowMat);
  barrel1.rotation.x = Math.PI / 2;
  barrel1.position.set(-0.1, -0.72, 1.32);
  const barrel2 = makeMesh(new THREE.CylinderGeometry(0.08, 0.08, 0.85, 8), glowMat);
  barrel2.rotation.x = Math.PI / 2;
  barrel2.position.set(0.1, -0.72, 1.32);
  leftArm.add(lUpper, plasmaPod, barrel1, barrel2);
  torso.add(leftArm);

  // Right Arm: Heavy Armor-Piercing Railgun
  const rightArm = new THREE.Group();
  rightArm.position.set(1.32, 0.05, 0.1);
  const rUpper = makeMesh(new THREE.BoxGeometry(0.42, 0.9, 0.46), frameMat);
  rUpper.position.set(0, -0.35, 0);
  const railHousing = makeMesh(new THREE.BoxGeometry(0.42, 0.46, 1.75), frameMat);
  railHousing.position.set(0, -0.72, 0.72);
  const railCore = makeMesh(new THREE.BoxGeometry(0.18, 0.18, 1.95), glowMat);
  railCore.position.set(0, -0.72, 0.92);
  rightArm.add(rUpper, railHousing, railCore);
  torso.add(rightArm);

  // Pelvis & Articulated Mech Legs
  const pelvis = makeMesh(new THREE.BoxGeometry(1.15, 0.42, 0.85), frameMat);
  pelvis.position.set(0, 1.48, 0);
  root.add(pelvis);

  const legGeo = new THREE.BoxGeometry(0.52, 1.38, 0.58);
  const footGeo = new THREE.BoxGeometry(0.68, 0.3, 0.95);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.52, 1.38, 0);
  const lLegMesh = makeMesh(legGeo, armorMat);
  lLegMesh.position.set(0, -0.68, 0);
  const lFoot = makeMesh(footGeo, frameMat);
  lFoot.position.set(0, -1.24, 0.15);
  leftLeg.add(lLegMesh, lFoot);
  root.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.52, 1.38, 0);
  const rLegMesh = makeMesh(legGeo.clone(), armorMat);
  rLegMesh.position.set(0, -0.68, 0);
  const rFoot = makeMesh(footGeo.clone(), frameMat);
  rFoot.position.set(0, -1.24, 0.15);
  rightLeg.add(rLegMesh, rFoot);
  root.add(rightLeg);

  return { root, torso, leftArm, rightArm, leftLeg, rightLeg, jetpackFlame };
}

/**
 * Builds an aggressive Alien Drone / Mechanical Parasite enemy mesh.
 */
export function buildAlienDroneRig(accentHex = '#ef4444'): ArticulatedRig {
  const root = new THREE.Group();

  const shellMat = new THREE.MeshStandardMaterial({
    color: '#1e1b4b',
    roughness: 0.35,
    metalness: 0.72,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  const body = makeMesh(new THREE.OctahedronGeometry(0.62, 1), shellMat);
  body.scale.set(1.15, 0.75, 1.25);
  body.position.set(0, 0.72, 0);
  root.add(body);

  const eye = makeMesh(new THREE.SphereGeometry(0.24, 12, 10), glowMat);
  eye.position.set(0, 0.76, 0.56);
  root.add(eye);

  const spikeGeo = new THREE.ConeGeometry(0.12, 0.72, 6);
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = makeMesh(spikeGeo, shellMat);
    leg.position.set(Math.cos(angle) * 0.65, 0.42, Math.sin(angle) * 0.65);
    leg.rotation.z = Math.cos(angle) * 0.65;
    leg.rotation.x = -Math.sin(angle) * 0.65;
    root.add(leg);
  }

  return { root, torso: body };
}

/**
 * Builds a towering Planetary / Titan Boss rig with armored crown and blazing core.
 */
export function buildBossTitanRig(): ArticulatedRig {
  const mech = buildSpaceMechRig('crimson');
  mech.root.scale.setScalar(1.65);
  return mech;
}

/**
 * Safely disposes every locally created BufferGeometry and Material inside a character/prop tree.
 * Never touches AssetManager shared textures or cached geometries.
 */
export function disposeObjectTree(root: THREE.Object3D): void {
  const disposedGeos = new Set<THREE.BufferGeometry>();
  const disposedMats = new Set<THREE.Material>();

  root.traverse((obj) => {
    const meshLike = obj as THREE.Mesh;
    if (meshLike.geometry && !disposedGeos.has(meshLike.geometry)) {
      disposedGeos.add(meshLike.geometry);
      meshLike.geometry.dispose();
    }
    if (meshLike.material) {
      const mats = Array.isArray(meshLike.material) ? meshLike.material : [meshLike.material];
      for (const m of mats) {
        if (m && !disposedMats.has(m)) {
          disposedMats.add(m);
          m.dispose();
        }
      }
    }
  });
}
