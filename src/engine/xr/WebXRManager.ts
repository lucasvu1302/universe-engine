/**
 * WebXRManager.ts
 * 100% Native W3C WebXR Device API bridge for Apple Vision Pro and Meta Quest.
 * Zero external libraries, zero API keys, 100% free and standards-compliant.
 */

interface RendererWithXR {
  xr?: {
    setSession: (session: XRSession) => Promise<void>;
  };
}

export class WebXRManager {
  private static instance: WebXRManager;
  private isVRSupported = false;
  private currentSession: XRSession | null = null;

  private constructor() {
    this.checkVRSupport();
  }

  public static getInstance(): WebXRManager {
    if (!WebXRManager.instance) {
      WebXRManager.instance = new WebXRManager();
    }
    return WebXRManager.instance;
  }

  private async checkVRSupport(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) {
      try {
        const supported = await navigator.xr?.isSessionSupported('immersive-vr');
        this.isVRSupported = !!supported;
      } catch {
        this.isVRSupported = false;
      }
    }
  }

  public getIsVRSupported(): boolean {
    return this.isVRSupported;
  }

  public async enterVR(renderer?: RendererWithXR): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('xr' in navigator) || !navigator.xr) return false;

    try {
      if (this.currentSession) {
        await this.currentSession.end();
        this.currentSession = null;
        return false;
      }

      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
      });

      this.currentSession = session;
      if (renderer?.xr) {
        await renderer.xr.setSession(session);
      }

      session.addEventListener('end', () => {
        this.currentSession = null;
      });

      return true;
    } catch (err) {
      console.warn('Could not launch WebXR immersive-vr session:', err);
      return false;
    }
  }
}
