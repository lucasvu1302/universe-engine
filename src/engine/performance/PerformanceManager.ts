import { getGPUTier, type TierResult } from 'detect-gpu';
import { useAppStore, type QualityTier } from '@/stores/useAppStore';

export interface PerformanceMetrics {
  fps: number;
  frameTimeMs: number;
  gpuTier: number;
  activeQuality: QualityTier;
  targetRefreshRate: number;
  drawCalls: number;
  triangles: number;
}

export class PerformanceManager {
  private static instance: PerformanceManager;

  private frameTimes: number[] = [];
  private readonly sampleSize = 60;
  private lastTimestamp = performance.now();
  
  public currentFPS: number = 60;
  public currentFrameTimeMs: number = 16.67;
  public targetRefreshRate: number = 60;
  public gpuTierResult: TierResult | null = null;
  
  // Throttle counter for auto-degradation
  private badFrameCounter = 0;
  private readonly badFrameThreshold = 180; // 3 seconds of sustained drops

  private constructor() {
    this.initGPUTier();
    this.setupVisibilityListener();
    this.detectScreenRefreshRate();
  }

  public static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  private async initGPUTier() {
    try {
      this.gpuTierResult = await getGPUTier();
      const tier = this.gpuTierResult?.tier ?? 2;
      useAppStore.getState().setDetectedGPUTier(tier);
    } catch {
      // Default safe tier 2
      useAppStore.getState().setDetectedGPUTier(2);
    }
  }

  private detectScreenRefreshRate() {
    if (typeof window === 'undefined') return;

    let frames = 0;
    const start = performance.now();

    const check = (time: number) => {
      frames++;
      if (time - start < 1000) {
        requestAnimationFrame(check);
      } else {
        const calculatedRate = Math.round(frames);
        if (calculatedRate >= 220) this.targetRefreshRate = 240;
        else if (calculatedRate >= 150) this.targetRefreshRate = 165;
        else if (calculatedRate >= 130) this.targetRefreshRate = 144;
        else if (calculatedRate >= 105) this.targetRefreshRate = 120;
        else if (calculatedRate >= 80) this.targetRefreshRate = 90;
        else this.targetRefreshRate = 60;
      }
    };
    requestAnimationFrame(check);
  }

  private setupVisibilityListener() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      const isHidden = document.hidden;
      if (isHidden) {
        // Automatically suspend expensive tasks
        useAppStore.getState().togglePause();
      }
    });
  }

  /**
   * Called once per frame in main render loop.
   */
  public recordFrame(now: number = performance.now()): void {
    const delta = now - this.lastTimestamp;
    this.lastTimestamp = now;

    if (delta > 0 && delta < 500) {
      this.frameTimes.push(delta);
      if (this.frameTimes.length > this.sampleSize) {
        this.frameTimes.shift();
      }

      // Moving average
      const sum = this.frameTimes.reduce((a, b) => a + b, 0);
      this.currentFrameTimeMs = sum / this.frameTimes.length;
      this.currentFPS = Math.round(1000 / this.currentFrameTimeMs);

      // Check degradation in AUTO quality mode
      this.checkAutoDegradation();
    }
  }

  private checkAutoDegradation() {
    const state = useAppStore.getState();
    if (state.graphicsQuality !== 'AUTO') return;

    const frameBudgetMs = 1000 / (this.targetRefreshRate * 0.75); // 25% tolerance
    if (this.currentFrameTimeMs > frameBudgetMs) {
      this.badFrameCounter++;
      if (this.badFrameCounter >= this.badFrameThreshold) {
        this.badFrameCounter = 0;
        // Step down quality gracefully
        this.stepDownQuality();
      }
    } else {
      this.badFrameCounter = Math.max(0, this.badFrameCounter - 1);
    }
  }

  private stepDownQuality() {
    const state = useAppStore.getState();
    const currentTier = state.detectedGPUTier;
    if (currentTier > 1) {
      useAppStore.getState().setDetectedGPUTier(currentTier - 1);
    }
  }

  public getDPR(quality: QualityTier): number {
    const maxDeviceDPR = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const tier = useAppStore.getState().detectedGPUTier;

    switch (quality) {
      case 'ULTRA':
        return Math.min(maxDeviceDPR, 2.0);
      case 'HIGH':
        return Math.min(maxDeviceDPR, 1.5);
      case 'MEDIUM':
        return Math.min(maxDeviceDPR, 1.25);
      case 'LOW':
        return 1.0;
      case 'AUTO':
      default:
        if (tier >= 3) return Math.min(maxDeviceDPR, 1.75);
        if (tier === 2) return Math.min(maxDeviceDPR, 1.25);
        return 1.0;
    }
  }

  public getParticleCount(quality: QualityTier): number {
    const tier = useAppStore.getState().detectedGPUTier;

    switch (quality) {
      case 'ULTRA':
        return 35000;
      case 'HIGH':
        return 22000;
      case 'MEDIUM':
        return 14000;
      case 'LOW':
        return 7000;
      case 'AUTO':
      default:
        if (tier >= 3) return 25000;
        if (tier === 2) return 15000;
        return 8000;
    }
  }
}
