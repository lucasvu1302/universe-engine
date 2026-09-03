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
  const prevPointer = useRef({ x: 0, y: 0 });
  const touchDistance = useRef<number | null>(null);

  useEffect(() => {
    camManager.setCamera(camera as THREE.PerspectiveCamera);
  }, [camera, camManager]);

  useEffect(() => {
    camManager.state = cameraMode;
  }, [cameraMode, camManager]);

  // Handle pointer & touch interactions
  useEffect(() => {
    const dom = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      prevPointer.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - prevPointer.current.x;
      const deltaY = e.clientY - prevPointer.current.y;
      prevPointer.current = { x: e.clientX, y: e.clientY };

      if (camManager.state === 'ORBIT' || camManager.state === 'GALAXY') {
        const rotSpeed = 0.0045;
        camManager.rotateOrbit(deltaX * rotSpeed, deltaY * rotSpeed);
      }
    };

    const onPointerUp = () => {
      isDragging.current = false;
    };

    // Smooth exponential wheel zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (camManager.state === 'ORBIT' || camManager.state === 'GALAXY') {
        camManager.zoomOrbit(e.deltaY);
      }
    };

    // Mobile Pinch-to-Zoom
    const onTouchMove = (e: TouchEvent) => {
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
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('touchmove', onTouchMove, { passive: true });
    dom.addEventListener('touchend', onTouchEnd);

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchmove', onTouchMove);
      dom.removeEventListener('touchend', onTouchEnd);
    };
  }, [gl, camManager]);

  // Frame Loop logic
  useFrame((_, delta) => {
    if (camManager.state === 'ORBIT' || camManager.state === 'GALAXY') {
      camManager.updateOrbit(delta);
    } else if (camManager.state === 'FREE_FLIGHT') {
      camManager.updateFreeFlight(
        delta,
        {
          forward: input.isKeyPressed('w') || input.isKeyPressed('KeyW') || input.isKeyPressed('ArrowUp'),
          backward: input.isKeyPressed('s') || input.isKeyPressed('KeyS') || input.isKeyPressed('ArrowDown'),
          left: input.isKeyPressed('a') || input.isKeyPressed('KeyA') || input.isKeyPressed('ArrowLeft'),
          right: input.isKeyPressed('d') || input.isKeyPressed('KeyD') || input.isKeyPressed('ArrowRight'),
          up: input.isKeyPressed('e') || input.isKeyPressed('KeyE'),
          down: input.isKeyPressed('q') || input.isKeyPressed('KeyQ'),
          boost: input.isKeyPressed('Shift') || input.isKeyPressed('ShiftLeft'),
          precision: input.isKeyPressed('Control') || input.isKeyPressed('Alt'),
          brake: input.isKeyPressed(' ') || input.isKeyPressed('Space')
        },
        input.deltaX,
        input.deltaY
      );
      input.resetDeltas();
    }
  });

  return null;
};
