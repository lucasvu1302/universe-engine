import { getGPUTier, type TierResult } from 'detect-gpu';
import { useAppStore, type QualityTier } from '@/stores/useAppStore';

export type ResolvedQualityTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

export interface QualityProfile {
  resolvedTier: ResolvedQualityTier;
  dpr: number;
  enablePostProcessing: boolean;
  enableBloom: boolean;
  starCount: number;
  galaxyParticleCount: number;
  asteroidCount: number;
  sphereSegments: number;
  raymarchSteps: number;
  planetaryEventParticleScale: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTimeMs: number;
  gpuTier: number;
  activeQuality: ResolvedQualityTier;
  targetRefreshRate: number;
  drawCalls: number;
  triangles: number;
}

export interface RendererInfoLike {
  info: {
    autoReset: boolean;
    render: {
      calls: number;
      triangles: number;
    };
    reset: () => void;
  };
}

export class PerformanceManager {
  private static instance: PerformanceManager;

  public readonly frameBuffer = new Float64Array(60);
  private readonly sampleSize = 60;
  private frameWriteIndex = 0;
  private frameCount = 0;
  private frameSumMs = 0;
  private lastTimestamp = performance.now();

  public currentFPS: number = 60;
  public currentFrameTimeMs: number = 16.67;
  public targetRefreshRate: number = 60;
  public drawCalls: number = 0;
  public triangles: number = 0;
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
      useAppStore.getState().setTabHidden(Boolean(document.hidden));
    });
  }

  public resolveQualityTier(
    quality: QualityTier = useAppStore.getState().graphicsQuality,
    detectedGPUTier: number = useAppStore.getState().detectedGPUTier
  ): ResolvedQualityTier {
    if (quality !== 'AUTO') {
      return quality;
    }
    if (detectedGPUTier <= 1) return 'LOW';
    if (detectedGPUTier === 2) return 'MEDIUM';
    if (detectedGPUTier === 3) return 'HIGH';
    return 'ULTRA';
  }

  public getQualityProfile(
    quality: QualityTier = useAppStore.getState().graphicsQuality,
    detectedGPUTier: number = useAppStore.getState().detectedGPUTier
  ): QualityProfile {
    const resolvedTier = this.resolveQualityTier(quality, detectedGPUTier);
    const maxDeviceDPR = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    switch (resolvedTier) {
      case 'LOW':
        return {
          resolvedTier: 'LOW',
          dpr: 1.0,
          enablePostProcessing: false,
          enableBloom: false,
          starCount: 7000,
          galaxyParticleCount: 35000,
          asteroidCount: 600,
          sphereSegments: 24,
          raymarchSteps: 24,
          planetaryEventParticleScale: 0.4,
        };
      case 'MEDIUM':
        return {
          resolvedTier: 'MEDIUM',
          dpr: Math.min(maxDeviceDPR, 1.25),
          enablePostProcessing: true,
          enableBloom: true,
          starCount: 14000,
          galaxyParticleCount: 65000,
          asteroidCount: 1200,
          sphereSegments: 36,
          raymarchSteps: 36,
          planetaryEventParticleScale: 0.7,
        };
      case 'HIGH':
        return {
          resolvedTier: 'HIGH',
          dpr: Math.min(maxDeviceDPR, 1.5),
          enablePostProcessing: true,
          enableBloom: true,
          starCount: 22000,
          galaxyParticleCount: 95000,
          asteroidCount: 2000,
          sphereSegments: 48,
          raymarchSteps: 48,
          planetaryEventParticleScale: 1.0,
        };
      case 'ULTRA':
      default:
        return {
          resolvedTier: 'ULTRA',
          dpr: Math.min(maxDeviceDPR, 2.0),
          enablePostProcessing: true,
          enableBloom: true,
          starCount: 35000,
          galaxyParticleCount: 120000,
          asteroidCount: 2800,
          sphereSegments: 64,
          raymarchSteps: 56,
          planetaryEventParticleScale: 1.25,
        };
    }
  }

  /**
   * Zero-allocation O(1) moving-average frame recorder using Float64Array(60).
   */
  public recordFrame(now: number = performance.now()): void {
    const delta = now - this.lastTimestamp;
    this.lastTimestamp = now;

    if (delta > 0 && delta < 500) {
      if (this.frameCount === this.sampleSize) {
        this.frameSumMs -= this.frameBuffer[this.frameWriteIndex];
      } else {
        this.frameCount++;
      }

      this.frameBuffer[this.frameWriteIndex] = delta;
      this.frameSumMs += delta;
      this.frameWriteIndex = (this.frameWriteIndex + 1) % this.sampleSize;

      this.currentFrameTimeMs = this.frameSumMs / this.frameCount;
      this.currentFPS = Math.round(1000 / this.currentFrameTimeMs);

      this.checkAutoDegradation();
    }
  }

  /**
   * Captures accumulated WebGL render pass stats across main + postprocessing passes,
   * then resets gl.info manually for the upcoming frame.
   */
  public recordRendererInfo(gl: RendererInfoLike): void {
    if (gl.info.autoReset !== false) {
      gl.info.autoReset = false;
    }
    this.drawCalls = gl.info.render.calls;
    this.triangles = gl.info.render.triangles;
    gl.info.reset();
  }

  public getMetrics(): PerformanceMetrics {
    const state = useAppStore.getState();
    return {
      fps: this.currentFPS,
      frameTimeMs: this.currentFrameTimeMs,
      gpuTier: state.detectedGPUTier,
      activeQuality: this.resolveQualityTier(state.graphicsQuality, state.detectedGPUTier),
      targetRefreshRate: this.targetRefreshRate,
      drawCalls: this.drawCalls,
      triangles: this.triangles,
    };
  }

  private checkAutoDegradation() {
    const state = useAppStore.getState();
    if (state.graphicsQuality !== 'AUTO') return;

    const frameBudgetMs = 1000 / (this.targetRefreshRate * 0.75);
    if (this.currentFrameTimeMs > frameBudgetMs) {
      this.badFrameCounter++;
      if (this.badFrameCounter >= this.badFrameThreshold) {
        this.badFrameCounter = 0;
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

  public getDPR(
    quality: QualityTier,
    detectedGPUTier: number = useAppStore.getState().detectedGPUTier
  ): number {
    return this.getQualityProfile(quality, detectedGPUTier).dpr;
  }

  public getParticleCount(
    quality: QualityTier,
    detectedGPUTier: number = useAppStore.getState().detectedGPUTier
  ): number {
    return this.getQualityProfile(quality, detectedGPUTier).starCount;
  }
}
