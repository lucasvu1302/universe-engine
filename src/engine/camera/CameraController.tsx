import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraManager } from './CameraManager';
import { InputManager } from '../input/InputManager';
import { useAppStore } from '@/stores/useAppStore';

export const CameraController: React.FC = () => {
  const { camera, gl } = useThree();
  const camManager = CameraManager.getInstance();
  const input = InputManager.getInstance();

  const cameraMode = useAppStore((state) => state.cameraMode);
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  const prevPointer = useRef({ x: 0, y: 0 });
  const touchDistance = useRef<number | null>(null);
  const flightKeysRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
    precision: false,
    brake: false
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

  // Handle pointer & touch interactions
  useEffect(() => {
    const dom = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      isPanning.current = e.button === 2 || e.button === 1 || e.shiftKey;
      prevPointer.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - prevPointer.current.x;
      const deltaY = e.clientY - prevPointer.current.y;
      prevPointer.current = { x: e.clientX, y: e.clientY };

      if (camManager.activeScenario === 'earth_launch') return;

      if (camManager.state === 'ORBIT' || camManager.state === 'GALAXY') {
        if (isPanning.current) {
          camManager.panOrbit(deltaX, deltaY);
        } else {
          const rotSpeed = 0.0045;
          camManager.rotateOrbit(deltaX * rotSpeed, deltaY * rotSpeed);
        }
      }
    };

    const onPointerUp = () => {
      isDragging.current = false;
      isPanning.current = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Smooth exponential wheel zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (camManager.activeScenario === 'earth_launch') return;
      if (camManager.state === 'ORBIT' || camManager.state === 'GALAXY') {
        camManager.zoomOrbit(e.deltaY);
      }
    };

    // Mobile Pinch-to-Zoom
    const onTouchMove = (e: TouchEvent) => {
      if (camManager.activeScenario === 'earth_launch') return;
      if (e.touches.length === 2 && (camManager.state === 'ORBIT' || camManager.state === 'GALAXY')) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (touchDistance.current !== null) {
          const delta = (touchDistance.current - dist) * 2.5;
          camManager.zoomOrbit(delta);
        }
        touchDistance.current = dist;
      }
    };

    const onTouchEnd = () => {
      touchDistance.current = null;
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('contextmenu', onContextMenu);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('touchmove', onTouchMove, { passive: true });
    dom.addEventListener('touchend', onTouchEnd);

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('contextmenu', onContextMenu);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchmove', onTouchMove);
      dom.removeEventListener('touchend', onTouchEnd);
    };
  }, [gl, camManager]);

  // Frame Loop logic (runs at priority -1 right after EngineLoop -2 and BEFORE all scene useFrame(0) readers!)
  useFrame((_, delta) => {
    if (camManager.activeScenario === 'earth_launch') {
      input.resetDeltas();
      return;
    }

    if (camManager.state === 'TRANSITIONING') {
      input.resetDeltas();
      camManager.updateTransition(delta);
      return;
    }

    // Do not overwrite CinematicDirector's choreographed camera while cinemaMode is active
    if (useAppStore.getState().cinemaMode) {
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
