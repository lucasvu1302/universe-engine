import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraManager } from './CameraManager';
import { TouchOrbitGestureEngine } from './TouchOrbitGestureEngine';
import { InputManager } from '../input/InputManager';
import { useAppStore } from '@/stores/useAppStore';

export const CameraController: React.FC = () => {
  const { camera, gl } = useThree();
  const camManager = CameraManager.getInstance();
  const input = InputManager.getInstance();

  const cameraMode = useAppStore((state) => state.cameraMode);
  const flightKeysRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
    precision: false,
    brake: false,
  });

  useEffect(() => {
    camManager.setCamera(camera as THREE.PerspectiveCamera);
  }, [camera, camManager]);

  useEffect(() => {
    // Always discard any prior ORBIT/UI pointer drag deltas on camera mode transitions
    input.resetDeltas();
    if (cameraMode === 'FREE_FLIGHT') {
      camManager.cancelActiveTransition();
    }
    camManager.state = cameraMode;
  }, [cameraMode, camManager, input]);

  // Unified multi-pointer mouse & mobile touch gesture handling (ADR-UNIV-2026-11-24-001)
  useEffect(() => {
    const dom = gl.domElement;
    const prevTouchAction = dom.style.touchAction;
    dom.style.touchAction = 'none';

    const canOrbitControl = (): boolean => {
      if (camManager.activeScenario === 'earth_launch') return false;
      const st = useAppStore.getState();
      if (st.cinemaMode || st.activeSpaceGame !== 'none' || st.gameHubOpen) return false;
      return camManager.state === 'ORBIT' || camManager.state === 'GALAXY';
    };

    const gestureEngine = new TouchOrbitGestureEngine({
      onRotate: (dTheta, dPhi) => {
        if (canOrbitControl()) {
          camManager.rotateOrbit(dTheta, dPhi);
        }
      },
      onPan: (dx, dy) => {
        if (canOrbitControl()) {
          camManager.panOrbit(dx, dy);
        }
      },
      onZoom: (deltaRaw) => {
        if (canOrbitControl()) {
          camManager.zoomOrbit(deltaRaw);
        }
      },
      onReleaseInertia: (vTheta, vPhi) => {
        if (canOrbitControl()) {
          camManager.setOrbitInertia(vTheta, vPhi);
        }
      },
      onClearInertia: () => {
        camManager.clearOrbitInertia();
      },
      onDoubleTap: () => {
        if (canOrbitControl()) {
          camManager.triggerDoubleTapZoom();
        }
      },
    });

    const onPointerDown = (e: PointerEvent) => {
      if (!canOrbitControl()) return;
      gestureEngine.onPointerDown(
        {
          pointerId: e.pointerId,
          pointerType: e.pointerType || 'mouse',
          clientX: e.clientX,
          clientY: e.clientY,
          button: e.button,
          shiftKey: e.shiftKey,
        },
        performance.now()
      );
    };

    const onPointerMove = (e: PointerEvent) => {
      if (gestureEngine.getActivePointerCount() === 0) return;
      if (!canOrbitControl()) {
        gestureEngine.reset();
        return;
      }
      // Recover cleanly if desktop mouse button was released over native contextmenu / outside viewport
      if (e.pointerType === 'mouse' && e.buttons === 0) {
        gestureEngine.onPointerCancel(e.pointerId);
        return;
      }
      gestureEngine.onPointerMove(
        {
          pointerId: e.pointerId,
          pointerType: e.pointerType || 'mouse',
          clientX: e.clientX,
          clientY: e.clientY,
          button: e.button,
          shiftKey: e.shiftKey,
        },
        performance.now()
      );
    };

    const onPointerUp = (e: PointerEvent) => {
      if (gestureEngine.getActivePointerCount() === 0) return;
      gestureEngine.onPointerUp(
        {
          pointerId: e.pointerId,
          pointerType: e.pointerType || 'mouse',
          clientX: e.clientX,
          clientY: e.clientY,
          button: e.button,
          shiftKey: e.shiftKey,
        },
        performance.now()
      );
    };

    const onPointerCancel = (e: PointerEvent) => {
      gestureEngine.onPointerCancel(e.pointerId);
    };

    const onWindowBlur = () => {
      gestureEngine.reset();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        gestureEngine.reset();
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Prevent iOS Safari / Android Chrome from hijacking two-finger pinch or rubber-band scroll on WebGL canvas
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 || e.cancelable) {
        e.preventDefault();
      }
    };

    // Smooth exponential wheel zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (canOrbitControl()) {
        camManager.zoomOrbit(e.deltaY);
      }
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    dom.addEventListener('contextmenu', onContextMenu);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      gestureEngine.reset();
      dom.style.touchAction = prevTouchAction;
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      dom.removeEventListener('contextmenu', onContextMenu);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchmove', onTouchMove);
    };
  }, [gl, camManager]);

  // Frame Loop logic (runs at priority -1 right after EngineLoop -2 and BEFORE all scene useFrame(0) readers!)
  useFrame((_, delta) => {
    if (camManager.activeScenario === 'earth_launch') {
      input.resetDeltas();
      return;
    }

    // Active Space Games own the camera exclusively — must precede TRANSITIONING checks (G5)
    const storeState = useAppStore.getState();
    if (storeState.activeSpaceGame !== 'none') {
      input.resetDeltas();
      return;
    }

    if (camManager.state === 'TRANSITIONING') {
      input.resetDeltas();
      camManager.updateTransition(delta);
      return;
    }

    // Do not overwrite CinematicDirector or run Free Flight behind open Game Hub modal
    if (storeState.cinemaMode) {
      input.resetDeltas();
      return;
    }

    if (camManager.state === 'ORBIT' || camManager.state === 'GALAXY') {
      // Discard pointer deltas accumulated outside FREE_FLIGHT so entering FREE_FLIGHT never whips frame 1
      input.resetDeltas();

      // Arrow keys camera movement support
      const up = input.isKeyPressed('ArrowUp');
      const down = input.isKeyPressed('ArrowDown');
      const left = input.isKeyPressed('ArrowLeft');
      const right = input.isKeyPressed('ArrowRight');

      if (up || down || left || right) {
        const panSpeed = Math.min(Math.max(delta, 0), 0.05) * 420;
        let panX = 0;
        let panY = 0;
        if (left) panX += panSpeed;
        if (right) panX -= panSpeed;
        if (up) panY += panSpeed;
        if (down) panY -= panSpeed;
        camManager.panOrbit(panX, panY);
      }

      camManager.updateOrbit(delta);
    } else if (camManager.state === 'FREE_FLIGHT') {
      if (storeState.gameHubOpen) {
        input.resetDeltas();
        return;
      }
      const fk = flightKeysRef.current;
      fk.forward = input.isKeyPressed('w') || input.isKeyPressed('KeyW');
      fk.backward = input.isKeyPressed('s') || input.isKeyPressed('KeyS');
      fk.left = input.isKeyPressed('a') || input.isKeyPressed('KeyA');
      fk.right = input.isKeyPressed('d') || input.isKeyPressed('KeyD');
      fk.up =
        input.isKeyPressed('e') ||
        input.isKeyPressed('KeyE') ||
        input.isKeyPressed('r') ||
        input.isKeyPressed('KeyR');
      fk.down =
        input.isKeyPressed('q') ||
        input.isKeyPressed('KeyQ') ||
        input.isKeyPressed('f') ||
        input.isKeyPressed('KeyF');
      fk.boost = input.isKeyPressed('Shift') || input.isKeyPressed('ShiftLeft');
      fk.precision = input.isKeyPressed('Control') || input.isKeyPressed('Alt');
      fk.brake = input.isKeyPressed(' ') || input.isKeyPressed('Space');

      camManager.updateFreeFlight(delta, fk, input.deltaX, input.deltaY);
      input.resetDeltas();
    } else {
      input.resetDeltas();
    }
  }, -1);

  return null;
};
