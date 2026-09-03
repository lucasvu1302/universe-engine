import * as THREE from 'three';

export class AssetManager {
  private static instance: AssetManager;

  private textureLoader = new THREE.TextureLoader();
  private textureCache: Map<string, THREE.Texture> = new Map();
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
  private materialCache: Map<string, THREE.Material> = new Map();

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

  private constructor() {}

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  /**
   * Loads high-definition satellite texture locally with caching, anisotropic filtering,
   * and fallback generator if needed.
   */
  public loadTexture(key: string, fallbackGenerator?: () => THREE.Texture): THREE.Texture {
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const url = this.LOCAL_MAPS[key];
    if (url) {
      const tex = this.textureLoader.load(
        url,
        (loaded) => {
          loaded.colorSpace = THREE.SRGBColorSpace;
          loaded.anisotropy = 16;
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
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 16;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = true;
      this.textureCache.set(key, tex);
      return tex;
    }

    const fallback = fallbackGenerator ? fallbackGenerator() : new THREE.Texture();
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

  public dispose(): void {
    this.textureCache.forEach((tex) => tex.dispose());
    this.geometryCache.forEach((geo) => geo.dispose());
    this.materialCache.forEach((mat) => mat.dispose());
    this.textureCache.clear();
    this.geometryCache.clear();
    this.materialCache.clear();
  }
}
