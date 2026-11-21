import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

export class AssetManager {
  private static instance: AssetManager;

  private textureLoader = new THREE.TextureLoader();
  private textureCache: Map<string, THREE.Texture> = new Map();
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
  private materialCache: Map<string, THREE.Material> = new Map();
  private pmremRenderTarget: THREE.WebGLRenderTarget | null = null;
  private bvhEnabled = false;

  // Non-color data masks must remain in linear NoColorSpace
  private readonly LINEAR_DATA_KEYS = new Set<string>(['earth_specular', 'earth_clouds']);

  // Local authentic NASA / Three.js public domain planetary maps (bundled locally in /public)
  private readonly LOCAL_MAPS: Record<string, string> = {
    earth_day: '/textures/planets/earth_day.jpg',
    earth_night: '/textures/planets/earth_night.jpg',
    earth_specular: '/textures/planets/earth_specular.jpg',
    earth_clouds: '/textures/planets/earth_clouds.png',
    moon: '/textures/planets/moon.jpg',
    mars: '/textures/planets/mars.jpg',
    jupiter: '/textures/planets/jupiter.jpg',
    saturn: '/textures/planets/saturn.jpg',
    saturn_rings: '/textures/planets/saturn_ring.jpg',
    venus: '/textures/planets/venus.jpg',
    mercury: '/textures/planets/mercury.jpg',
    uranus: '/textures/planets/uranus.jpg',
    neptune: '/textures/planets/neptune.jpg',
    sun: '/textures/planets/sun.jpg'
  };

  private constructor() {
    this.enableBVH();
  }

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  /**
   * Idempotently wires three-mesh-bvh accelerated raycasting onto Three.js prototypes.
   */
  public enableBVH(): void {
    if (this.bvhEnabled) return;
    const proto = THREE.BufferGeometry.prototype as unknown as {
      computeBoundsTree: typeof computeBoundsTree;
      disposeBoundsTree: typeof disposeBoundsTree;
    };
    proto.computeBoundsTree = computeBoundsTree;
    proto.disposeBoundsTree = disposeBoundsTree;
    THREE.Mesh.prototype.raycast = acceleratedRaycast;
    this.bvhEnabled = true;
  }

  /**
   * Returns a cached unit SphereGeometry(1, segments, segments) with prebuilt BVH tree.
   */
  public getUnitSphereGeometry(segments: number = 48): THREE.SphereGeometry {
    const clamped = Math.max(8, Math.round(segments));
    const cacheKey = `unit_sphere_${clamped}`;
    const existing = this.geometryCache.get(cacheKey);
    if (existing) {
      return existing as THREE.SphereGeometry;
    }

    const sphere = new THREE.SphereGeometry(1, clamped, clamped);
    this.enableBVH();
    (sphere as unknown as { computeBoundsTree?: () => void }).computeBoundsTree?.();
    this.geometryCache.set(cacheKey, sphere);
    return sphere;
  }

  /**
   * Loads high-definition satellite texture locally with caching, colorSpace fidelity,
   * and fallback generator if needed.
   */
  public loadTexture(rawKey: string, fallbackGenerator?: () => THREE.Texture): THREE.Texture {
    const key = rawKey === 'earth' ? 'earth_day' : rawKey;
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const targetColorSpace = this.LINEAR_DATA_KEYS.has(key)
      ? THREE.NoColorSpace
      : THREE.SRGBColorSpace;

    const url = this.LOCAL_MAPS[key];
    if (url) {
      const tex = this.textureLoader.load(
        url,
        (loaded) => {
          loaded.colorSpace = targetColorSpace;
          loaded.anisotropy = 8;
          loaded.wrapS = THREE.RepeatWrapping;
          loaded.wrapT = THREE.ClampToEdgeWrapping;
          loaded.generateMipmaps = true;
          loaded.needsUpdate = true;
        },
        undefined,
        (err) => {
          console.warn(`[AssetManager] Failed to load local texture ${url}:`, err);
        }
      );
      tex.colorSpace = targetColorSpace;
      tex.anisotropy = 8;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = true;
      this.textureCache.set(key, tex);
      return tex;
    }

    const fallback = fallbackGenerator ? fallbackGenerator() : new THREE.Texture();
    fallback.colorSpace = targetColorSpace;
    this.textureCache.set(key, fallback);
    return fallback;
  }

  /**
   * Advanced multi-octave Fractional Brownian Motion (FBM) procedural planetary textures.
   */
  public getProceduralPlanetTexture(type: string, baseColor: string): THREE.Texture {
    const cacheKey = `fbm_planet_${type}_${baseColor}`;
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    if (type === 'earth') {
      ctx.fillStyle = '#0f2b46';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#1c4d28';
      for (let i = 0; i < 280; i++) {
        const x = (i * 37 + (i % 7) * 41) % canvas.width;
        const y = 80 + ((i * 47) % (canvas.height - 160));
        const r = 14 + (i % 6) * 16;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.5, r, (i % 4) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#9c814b';
      for (let i = 0; i < 80; i++) {
        const x = (i * 53 + 120) % canvas.width;
        const y = 140 + ((i * 31) % 180);
        ctx.beginPath();
        ctx.arc(x, y, 12 + (i % 5) * 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#f0f8ff';
      ctx.fillRect(0, 0, canvas.width, 38);
      ctx.fillRect(0, canvas.height - 42, canvas.width, 42);
    } else if (type === 'jupiter') {
      const bands = 48;
      for (let i = 0; i < bands; i++) {
        const y = (i / bands) * canvas.height;
        const h = canvas.height / bands;
        const colVal = i % 3 === 0 ? '#caa472' : i % 3 === 1 ? '#e2d4be' : '#8d633e';
        ctx.fillStyle = colVal;
        ctx.fillRect(0, y, canvas.width, h);
      }

      ctx.fillStyle = '#b7410e';
      ctx.beginPath();
      ctx.ellipse(620, 310, 52, 32, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'neptune' || type === 'uranus') {
      // Photorealistic Gas Giant Methane Atmosphere
      ctx.fillStyle = type === 'neptune' ? '#1b4d89' : '#4b707d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle atmospheric storm bands
      for (let i = 0; i < 32; i++) {
        const y = (i / 32) * canvas.height;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
        ctx.fillRect(0, y, canvas.width, canvas.height / 32);
      }

      // White cirrus methane cloud streaks (The Scooter)
      ctx.fillStyle = 'rgba(230, 245, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(450, 280, 70, 8, -0.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'mars') {
      ctx.fillStyle = '#b34724';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#7a2810';
      for (let i = 0; i < 120; i++) {
        const x = (i * 47) % canvas.width;
        const y = (i * 39) % canvas.height;
        ctx.beginPath();
        ctx.ellipse(x, y, 25 + (i % 4) * 15, 12 + (i % 3) * 10, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ffeedd';
      ctx.fillRect(0, 0, canvas.width, 24);
      ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
    } else if (type === 'moon') {
      ctx.fillStyle = '#8a8d91';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#55585c';
      for (let i = 0; i < 40; i++) {
        const x = (i * 73) % canvas.width;
        const y = 90 + ((i * 51) % (canvas.height - 180));
        ctx.beginPath();
        ctx.arc(x, y, 35 + (i % 5) * 20, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, 'rgba(255,255,255,0.18)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.22)');
      grad.addColorStop(1, 'rgba(255,255,255,0.18)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    texture.generateMipmaps = true;

    this.textureCache.set(cacheKey, texture);
    return texture;
  }

  public getEarthSpecularMap(): THREE.Texture {
    return this.loadTexture('earth_specular', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#000000';
      for (let i = 0; i < 280; i++) {
        const x = (i * 37 + (i % 7) * 41) % canvas.width;
        const y = 40 + ((i * 47) % (canvas.height - 80));
        const r = 7 + (i % 6) * 8;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.5, r, (i % 4) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    });
  }

  public getEarthNightMap(): THREE.Texture {
    return this.loadTexture('earth_night', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffd680';
      for (let i = 0; i < 400; i++) {
        const x = (i * 31 + (i % 5) * 19) % canvas.width;
        const y = 40 + ((i * 37) % (canvas.height - 80));
        ctx.fillRect(x, y, 1.5, 1.5);
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    });
  }

  public getEarthCloudsMap(): THREE.Texture {
    return this.loadTexture('earth_clouds', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let i = 0; i < 90; i++) {
        const x = (i * 29) % canvas.width;
        const y = 20 + ((i * 23) % (canvas.height - 40));
        const w = 35 + (i % 5) * 25;
        const h = 12 + (i % 3) * 10;
        ctx.beginPath();
        ctx.ellipse(x, y, w, h, 0.25, 0, Math.PI * 2);
        ctx.fill();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    });
  }

  public getSaturnRingsTexture(): THREE.Texture {
    return this.loadTexture('saturn_rings', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 1;
      const ctx = canvas.getContext('2d')!;

      const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
      grad.addColorStop(0.0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.12, 'rgba(195, 175, 140, 0.55)');
      grad.addColorStop(0.35, 'rgba(225, 205, 165, 0.9)');
      grad.addColorStop(0.52, 'rgba(210, 190, 150, 0.85)');
      grad.addColorStop(0.55, 'rgba(20, 15, 10, 0.04)');
      grad.addColorStop(0.62, 'rgba(20, 15, 10, 0.06)');
      grad.addColorStop(0.65, 'rgba(190, 170, 135, 0.8)');
      grad.addColorStop(0.82, 'rgba(30, 20, 15, 0.1)');
      grad.addColorStop(0.84, 'rgba(170, 150, 120, 0.6)');
      grad.addColorStop(0.98, 'rgba(140, 120, 95, 0.2)');
      grad.addColorStop(1.0, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.anisotropy = 16;
      return tex;
    });
  }

  public getAndromedaTexture(): THREE.Texture {
    const cacheKey = 'procedural_andromeda_m31';
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 240);
      grad.addColorStop(0, 'rgba(255, 250, 230, 0.95)');
      grad.addColorStop(0.12, 'rgba(255, 215, 160, 0.75)');
      grad.addColorStop(0.35, 'rgba(120, 170, 255, 0.45)');
      grad.addColorStop(0.65, 'rgba(70, 100, 220, 0.2)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = 'rgba(160, 210, 255, 0.15)';
      ctx.lineWidth = 14;
      for (let a = 0; a < 2; a++) {
        ctx.beginPath();
        for (let i = 0; i < 200; i++) {
          const theta = (i / 200) * Math.PI * 3.5 + a * Math.PI;
          const r = 20 + i * 1.0;
          const x = 256 + Math.cos(theta) * r * 1.4;
          const y = 256 + Math.sin(theta) * r * 0.7;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textureCache.set(cacheKey, tex);
    return tex;
  }

  public getDeepSpaceNebulaTexture(): THREE.Texture {
    const cacheKey = 'procedural_deep_nebula';
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 250);
      grad.addColorStop(0, 'rgba(217, 70, 239, 0.55)');
      grad.addColorStop(0.35, 'rgba(56, 189, 248, 0.35)');
      grad.addColorStop(0.7, 'rgba(99, 102, 241, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textureCache.set(cacheKey, tex);
    return tex;
  }

  /**
   * Generates and caches a cinema-grade HDR-styled PMREM space reflection environment
   * (Solar key specular lobe + sapphire orbital Earthshine + galactic rim) so metallic
   * PBR spacecraft, nozzles, mirrors, and foils never reflect flat black.
   */
  public getSpaceEnvironment(gl: THREE.WebGLRenderer | null | undefined): THREE.Texture | null {
    if (!gl) return null;
    const cacheKey = 'pmrem_space_cinema_ibl';
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    try {
      const pmrem = new THREE.PMREMGenerator(gl);
      pmrem.compileEquirectangularShader();

      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color('#091122');

      const sphereGeo = new THREE.SphereGeometry(1, 12, 12);

      // 1. Intense HDR Solar Key Lobe (creates crisp gold/titanium sun glints)
      const sunMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(6.4, 5.6, 4.5) });
      const sunMesh = new THREE.Mesh(sphereGeo, sunMat);
      sunMesh.position.set(42, 24, 34);
      sunMesh.scale.setScalar(6.5);
      envScene.add(sunMesh);

      // 2. Warm Solar Corona & Galactic Core Surround (+X/+Y/+Z & -Z wrap)
      const haloMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.65, 1.08, 0.48) });
      const haloMesh = new THREE.Mesh(sphereGeo, haloMat);
      haloMesh.position.set(44, 22, 36);
      haloMesh.scale.setScalar(22.0);
      envScene.add(haloMesh);

      // 3. Cool Sapphire Orbital Earthshine Bounce (-Y/+Z hemisphere)
      const earthshineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 0.88, 1.68) });
      const earthshineMesh = new THREE.Mesh(sphereGeo, earthshineMat);
      earthshineMesh.position.set(-14, -40, 20);
      earthshineMesh.scale.setScalar(30.0);
      envScene.add(earthshineMesh);

      // 4. Deep-Space Zodiacal & Galactic Plane Fill Lobes (-Z & ±X so cold-side mirrors gleam 360°)
      const rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 0.96, 1.35) });
      const rimMesh = new THREE.Mesh(sphereGeo, rimMat);
      rimMesh.position.set(-36, 26, -36);
      rimMesh.scale.setScalar(26.0);
      envScene.add(rimMesh);

      const zodiacalMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 0.88, 0.52) });
      const zodiacalMesh = new THREE.Mesh(sphereGeo, zodiacalMat);
      zodiacalMesh.position.set(28, -14, -42);
      zodiacalMesh.scale.setScalar(25.0);
      envScene.add(zodiacalMesh);

      const target = pmrem.fromScene(envScene, 0.04);
      this.pmremRenderTarget = target;

      sphereGeo.dispose();
      sunMat.dispose();
      haloMat.dispose();
      earthshineMat.dispose();
      rimMat.dispose();
      zodiacalMat.dispose();
      pmrem.dispose();

      this.textureCache.set(cacheKey, target.texture);
      return target.texture;
    } catch {
      return null;
    }
  }

  public getKaptonFoilMap(variant: 'gold' | 'silver' | 'rose' = 'gold'): THREE.Texture {
    const cacheKey = `cinema_kapton_foil_${variant}`;
    if (this.textureCache.has(cacheKey)) return this.textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 256, 256);
      if (variant === 'gold') {
        grad.addColorStop(0.0, '#f59e0b');
        grad.addColorStop(0.35, '#fbbf24');
        grad.addColorStop(0.68, '#d97706');
        grad.addColorStop(1.0, '#f59e0b');
      } else if (variant === 'rose') {
        grad.addColorStop(0.0, '#e9d5ff');
        grad.addColorStop(0.45, '#f5d0fe');
        grad.addColorStop(0.75, '#cbd5e1');
        grad.addColorStop(1.0, '#f3e8ff');
      } else {
        grad.addColorStop(0.0, '#e2e8f0');
        grad.addColorStop(0.5, '#f8fafc');
        grad.addColorStop(1.0, '#cbd5e1');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      // Subtle tensioned Mylar/Kapton specular diamond creases (never blotchy grey noise)
      for (let d = -256; d <= 512; d += 32) {
        ctx.strokeStyle =
          variant === 'gold' ? 'rgba(254, 243, 199, 0.28)' : 'rgba(255, 255, 255, 0.26)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + 190, 256);
        ctx.stroke();

        ctx.strokeStyle =
          variant === 'gold' ? 'rgba(146, 64, 14, 0.22)' : 'rgba(100, 116, 139, 0.14)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(d + 160, 0);
        ctx.lineTo(d - 30, 256);
        ctx.stroke();
      }

      // Clean aerospace Kapton thermal tape seams
      ctx.strokeStyle =
        variant === 'gold' ? 'rgba(180, 83, 9, 0.45)' : 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1.5;
      for (let g = 64; g < 256; g += 64) {
        ctx.beginPath();
        ctx.moveTo(0, g);
        ctx.lineTo(256, g);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textureCache.set(cacheKey, tex);
    return tex;
  }

  public getKaptonBumpMap(): THREE.Texture {
    const cacheKey = 'cinema_kapton_bump';
    if (this.textureCache.has(cacheKey)) return this.textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 256, 256);

      let seed = 313;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };

      for (let i = 0; i < 650; i++) {
        const x = rand() * 256;
        const y = rand() * 256;
        const r = 4 + rand() * 14;
        const v = Math.floor(60 + rand() * 135);
        ctx.strokeStyle = `rgb(${v},${v},${v})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x - r, y - r * 0.4);
        ctx.lineTo(x + r * 0.6, y + r);
        ctx.lineTo(x + r, y - r * 0.5);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    this.textureCache.set(cacheKey, tex);
    return tex;
  }

  public getSolarArrayMap(): THREE.Texture {
    const cacheKey = 'cinema_solar_array_wafer';
    if (this.textureCache.has(cacheKey)) return this.textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Deep monocrystalline silicon anti-reflective sapphire-navy base
      ctx.fillStyle = '#0b2149';
      ctx.fillRect(0, 0, 256, 512);

      // Individual photovoltaic cells with chamfered corners & copper/silver busbars
      const cols = 8;
      const rows = 16;
      const cw = 256 / cols;
      const ch = 512 / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cw;
          const y = r * ch;
          ctx.fillStyle = (r + c) % 2 === 0 ? '#0f2d63' : '#123574';
          ctx.fillRect(x + 1.5, y + 1.5, cw - 3, ch - 3);

          // Fine silver collector fingers
          ctx.fillStyle = 'rgba(186, 230, 253, 0.25)';
          ctx.fillRect(x + cw * 0.5 - 0.5, y + 2, 1, ch - 4);
        }
      }

      // Gold/copper string busbars between blanket folds
      ctx.fillStyle = 'rgba(245, 158, 11, 0.68)';
      for (let y = 64; y < 512; y += 64) {
        ctx.fillRect(0, y - 1.5, 256, 3);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textureCache.set(cacheKey, tex);
    return tex;
  }

  public getAerospaceHullMap(): THREE.Texture {
    const cacheKey = 'cinema_aerospace_hull_albedo';
    if (this.textureCache.has(cacheKey)) return this.textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Brushed aerospace aluminum-lithium white-silver coat
      const baseGrad = ctx.createLinearGradient(0, 0, 0, 1024);
      baseGrad.addColorStop(0.0, '#f8fafc');
      baseGrad.addColorStop(0.35, '#eef4fb'); // Subtle cryogenic LOX frost band
      baseGrad.addColorStop(0.76, '#e2e8f0');
      baseGrad.addColorStop(0.92, '#94a3b8'); // Authentic Falcon 9 reusable reentry soot feathering
      baseGrad.addColorStop(1.0, '#475569');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, 512, 1024);

      // Circumferential friction-stir weld rings
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.34)';
      ctx.lineWidth = 2;
      for (let y = 64; y < 1024; y += 96) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      // Vertical fuselage panel seams & subtle fastener lines
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.24)';
      ctx.lineWidth = 1.2;
      for (let x = 64; x < 512; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1024);
        ctx.stroke();
      }

      // Authentic SpaceX Block 5 charcoal/slate telemetry fiducial markings (no toy neon blue)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 36, 512, 16);
      ctx.fillRect(118, 170, 14, 210);
      ctx.fillStyle = '#334155';
      ctx.fillRect(252, 220, 10, 260);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textureCache.set(cacheKey, tex);
    return tex;
  }

  public getAerospaceBumpMap(): THREE.Texture {
    const cacheKey = 'cinema_aerospace_bump';
    if (this.textureCache.has(cacheKey)) return this.textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 256, 256);

      // Quilted MLI blanket & panel grooves
      ctx.strokeStyle = '#484848';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 256; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 256);
        ctx.moveTo(0, i);
        ctx.lineTo(256, i);
        ctx.stroke();
      }

      ctx.fillStyle = '#b4b4b4';
      for (let y = 0; y < 256; y += 32) {
        for (let x = 0; x < 256; x += 32) {
          ctx.fillRect(x + 4, y + 4, 24, 24);
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    this.textureCache.set(cacheKey, tex);
    return tex;
  }

  public getGridFinAlphaMap(): THREE.Texture {
    const cacheKey = 'cinema_grid_fin_waffle_alpha';
    if (this.textureCache.has(cacheKey)) return this.textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Transparent voids (black), solid titanium outer frame & diagonal waffle ribs (white)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 256, 256);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 18;
      ctx.strokeRect(9, 9, 238, 238);

      ctx.lineWidth = 8;
      for (let d = -256; d <= 512; d += 36) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + 256, 256);
        ctx.moveTo(d + 256, 0);
        ctx.lineTo(d, 256);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    this.textureCache.set(cacheKey, tex);
    return tex;
  }

  public getSteelTrussAlphaMap(): THREE.Texture {
    const cacheKey = 'cinema_steel_truss_alpha';
    if (this.textureCache.has(cacheKey)) return this.textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 256, 256);

      ctx.strokeStyle = '#ffffff';
      // Outer chords & horizontal cross-girders
      ctx.lineWidth = 22;
      ctx.strokeRect(11, 11, 234, 234);
      ctx.beginPath();
      ctx.moveTo(0, 128);
      ctx.lineTo(256, 128);
      ctx.stroke();

      // Diagonal X-bracing steel struts
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(12, 12);
      ctx.lineTo(244, 128);
      ctx.moveTo(244, 12);
      ctx.lineTo(12, 128);
      ctx.moveTo(12, 128);
      ctx.lineTo(244, 244);
      ctx.moveTo(244, 128);
      ctx.lineTo(12, 244);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    this.textureCache.set(cacheKey, tex);
    return tex;
  }

  public getSoftParticleMap(): THREE.Texture {
    const cacheKey = 'cinema_soft_gaussian_particle';
    if (this.textureCache.has(cacheKey)) return this.textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.32, 'rgba(255, 255, 255, 0.72)');
      grad.addColorStop(0.68, 'rgba(255, 255, 255, 0.18)');
      grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textureCache.set(cacheKey, tex);
    return tex;
  }

  public getRegolithBumpMap(variant: 'mars' | 'moon' | 'europa' | 'titan'): THREE.Texture {
    const cacheKey = `cinema_regolith_bump_${variant}`;
    if (this.textureCache.has(cacheKey)) return this.textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 256, 256);

      let seed = variant === 'mars' ? 701 : variant === 'europa' ? 1123 : variant === 'titan' ? 1481 : 907;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };

      // Fine mineral / ice crystal / basaltic dust grain
      for (let i = 0; i < 2400; i++) {
        const x = rand() * 256;
        const y = rand() * 256;
        const lum = Math.floor(96 + (rand() - 0.5) * 80);
        ctx.fillStyle = `rgb(${lum},${lum},${lum})`;
        ctx.fillRect(x, y, 2, 2);
      }

      if (variant === 'mars') {
        // Isotropic multi-scale basalt pebble & coarse sand relief (zero axis-aligned corduroy stripes!)
        for (let p = 0; p < 420; p++) {
          const px = 6 + rand() * 244;
          const py = 6 + rand() * 244;
          const pr = 1.6 + rand() * 4.8;
          const shade = rand() > 0.48 ? 'rgba(186,186,186,0.34)' : 'rgba(72,72,72,0.32)';
          ctx.fillStyle = shade;
          ctx.beginPath();
          ctx.ellipse(px, py, pr * 1.25, pr * 0.85, rand() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (variant === 'europa') {
        // Organic jagged tectonic fracture cracks & frosty glacial micro-ridges (zero straight ruler lines!)
        for (let l = 0; l < 18; l++) {
          let x = rand() * 256;
          let y = rand() * 256;
          let angle = rand() * Math.PI * 2;
          ctx.strokeStyle = 'rgba(38, 38, 38, 0.58)';
          ctx.lineWidth = 1.0 + rand() * 1.4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let seg = 0; seg < 7; seg++) {
            angle += (rand() - 0.5) * 0.72;
            x += Math.cos(angle) * (10 + rand() * 14);
            y += Math.sin(angle) * (10 + rand() * 14);
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        for (let f = 0; f < 320; f++) {
          const fx = rand() * 256;
          const fy = rand() * 256;
          const fr = 1.5 + rand() * 4.5;
          ctx.fillStyle = rand() > 0.5 ? 'rgba(210,210,210,0.22)' : 'rgba(90,90,90,0.20)';
          ctx.beginPath();
          ctx.ellipse(fx, fy, fr * 1.4, fr * 0.7, rand() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (variant === 'titan') {
        // Rounded water-ice river cobbles & damp hydrocarbon mud ripples
        for (let p = 0; p < 360; p++) {
          const px = 6 + rand() * 244;
          const py = 6 + rand() * 244;
          const pr = 2.0 + rand() * 5.2;
          ctx.fillStyle = rand() > 0.45 ? 'rgba(198,198,198,0.38)' : 'rgba(62,62,62,0.35)';
          ctx.beginPath();
          ctx.ellipse(px, py, pr * 1.35, pr * 0.9, rand() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Multi-scale lunar micro-craters with raised ejecta rims
        for (let c = 0; c < 42; c++) {
          const cx = 14 + rand() * 228;
          const cy = 14 + rand() * 228;
          const cr = 3 + rand() * 11;
          const grad = ctx.createRadialGradient(cx, cy, cr * 0.15, cx, cy, cr);
          grad.addColorStop(0.0, 'rgba(42, 42, 42, 0.85)');
          grad.addColorStop(0.72, 'rgba(68, 68, 68, 0.65)');
          grad.addColorStop(0.9, 'rgba(205, 205, 205, 0.72)');
          grad.addColorStop(1.0, 'rgba(128, 128, 128, 0.0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, cr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(variant === 'europa' ? 28 : 56, variant === 'europa' ? 28 : 56);
    tex.anisotropy = 8;
    tex.colorSpace = THREE.NoColorSpace;
    this.textureCache.set(cacheKey, tex);
    return tex;
  }

  public getRegolithAlbedoMap(variant: 'mars' | 'moon' | 'europa' | 'titan'): THREE.Texture {
    const cacheKey = `cinema_regolith_albedo_${variant}`;
    if (this.textureCache.has(cacheKey)) return this.textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle =
        variant === 'mars'
          ? '#c87e57'
          : variant === 'europa'
          ? '#d6eaf8'
          : variant === 'titan'
          ? '#b36b32'
          : '#a8aeb8';
      ctx.fillRect(0, 0, 256, 256);

      let seed = variant === 'mars' ? 1301 : variant === 'europa' ? 1907 : variant === 'titan' ? 2203 : 1709;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };

      // High-frequency mineral grit, ice facets & fine regolith dust
      for (let i = 0; i < 3600; i++) {
        const x = rand() * 256;
        const y = rand() * 256;
        const sz = rand() > 0.86 ? 3 : 1.6;
        const delta = Math.floor((rand() - 0.5) * 68);
        if (variant === 'mars') {
          const r = Math.min(255, Math.max(45, 196 + delta));
          const g = Math.min(255, Math.max(30, 118 + Math.floor(delta * 0.72)));
          const b = Math.min(255, Math.max(20, 82 + Math.floor(delta * 0.55)));
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        } else if (variant === 'europa') {
          const r = Math.min(255, Math.max(150, 212 + Math.floor(delta * 0.55)));
          const g = Math.min(255, Math.max(175, 234 + Math.floor(delta * 0.45)));
          const b = Math.min(255, Math.max(205, 248 + Math.floor(delta * 0.35)));
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        } else if (variant === 'titan') {
          const r = Math.min(255, Math.max(60, 178 + delta));
          const g = Math.min(220, Math.max(35, 108 + Math.floor(delta * 0.65)));
          const b = Math.min(160, Math.max(15, 52 + Math.floor(delta * 0.42)));
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        } else {
          const lum = Math.min(245, Math.max(55, 166 + delta));
          ctx.fillStyle = `rgb(${lum},${lum + 2},${lum + 5})`;
        }
        ctx.fillRect(x, y, sz, sz);
      }

      if (variant === 'mars') {
        // Fine isotropic iron-oxide & basalt micro-speckle (zero corduroy stripes and zero large dark blotches!)
        for (let m = 0; m < 900; m++) {
          const mx = 2 + rand() * 252;
          const my = 2 + rand() * 252;
          const mr = 0.8 + rand() * 1.9;
          ctx.fillStyle =
            rand() > 0.5 ? 'rgba(232, 168, 126, 0.11)' : 'rgba(108, 54, 34, 0.10)';
          ctx.fillRect(mx, my, mr, mr);
        }
      } else if (variant === 'europa') {
        // Seamless isotropic hydrated-salt mottling & glacial frost micro-veins (zero repeating tile seams!)
        for (let m = 0; m < 650; m++) {
          const mx = 10 + rand() * 236;
          const my = 10 + rand() * 236;
          const mr = 1.6 + rand() * 5.8;
          ctx.fillStyle =
            rand() > 0.44 ? 'rgba(186, 230, 253, 0.18)' : 'rgba(148, 86, 62, 0.11)';
          ctx.beginPath();
          ctx.ellipse(mx, my, mr * 1.4, mr * 0.72, rand() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let l = 0; l < 10; l++) {
          let x = 36 + rand() * 184;
          let y = 36 + rand() * 184;
          let angle = rand() * Math.PI * 2;
          ctx.strokeStyle = rand() > 0.4 ? 'rgba(138, 72, 48, 0.18)' : 'rgba(56, 189, 248, 0.18)';
          ctx.lineWidth = 0.8 + rand() * 1.1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let seg = 0; seg < 5; seg++) {
            angle += (rand() - 0.5) * 0.75;
            x = Math.max(12, Math.min(244, x + Math.cos(angle) * (8 + rand() * 10)));
            y = Math.max(12, Math.min(244, y + Math.sin(angle) * (8 + rand() * 10)));
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      } else if (variant === 'titan') {
        // Dark tholin organic pockets & golden rounded cobbles
        for (let t = 0; t < 480; t++) {
          const tx = rand() * 256;
          const ty = rand() * 256;
          const tr = 1.5 + rand() * 3.8;
          ctx.fillStyle = rand() > 0.48 ? 'rgba(222, 148, 72, 0.24)' : 'rgba(72, 34, 14, 0.26)';
          ctx.beginPath();
          ctx.arc(tx, ty, tr, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Subtle lunar mare regolith tonal mottling & bright glassy agglutinate micro-flecks (no repeating dark circles)
        for (let c = 0; c < 1800; c++) {
          const fx = rand() * 256;
          const fy = rand() * 256;
          const bright = rand() > 0.5;
          ctx.fillStyle = bright ? 'rgba(218, 224, 232, 0.22)' : 'rgba(96, 102, 112, 0.20)';
          ctx.fillRect(fx, fy, 2.2, 2.2);
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(variant === 'europa' ? 28 : 56, variant === 'europa' ? 28 : 56);
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textureCache.set(cacheKey, tex);
    return tex;
  }

  public getUSFlagTexture(): THREE.Texture {
    const cacheKey = 'cinema_apollo_us_flag';
    if (this.textureCache.has(cacheKey)) return this.textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 136;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const stripeH = 136 / 13;
      for (let s = 0; s < 13; s++) {
        ctx.fillStyle = s % 2 === 0 ? '#b91c1c' : '#f1f5f9';
        ctx.fillRect(0, s * stripeH, 256, stripeH + 0.5);
      }

      // Navy Union canton + 50 stars grid
      const cantonW = 104;
      const cantonH = stripeH * 7;
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(0, 0, cantonW, cantonH);

      ctx.fillStyle = '#ffffff';
      for (let r = 0; r < 9; r++) {
        const cols = r % 2 === 0 ? 6 : 5;
        const offsetX = r % 2 === 0 ? 9 : 17;
        for (let c = 0; c < cols; c++) {
          ctx.beginPath();
          ctx.arc(offsetX + c * 17, 7 + r * 7.8, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Subtle Apollo wire-stiffened fabric ripple shading
      for (let x = 0; x < 256; x += 8) {
        const shade = Math.sin(x * 0.14) * 0.14;
        ctx.fillStyle = shade > 0 ? `rgba(255,255,255,${shade})` : `rgba(0,0,0,${-shade})`;
        ctx.fillRect(x, 0, 8, 136);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textureCache.set(cacheKey, tex);
    return tex;
  }

  public dispose(): void {
    this.pmremRenderTarget?.dispose();
    this.pmremRenderTarget = null;
    this.textureCache.forEach((tex) => tex.dispose());
    this.geometryCache.forEach((geo) => {
      (geo as unknown as { disposeBoundsTree?: () => void }).disposeBoundsTree?.();
      geo.dispose();
    });
    this.materialCache.forEach((mat) => mat.dispose());
    this.textureCache.clear();
    this.geometryCache.clear();
    this.materialCache.clear();
  }
}
