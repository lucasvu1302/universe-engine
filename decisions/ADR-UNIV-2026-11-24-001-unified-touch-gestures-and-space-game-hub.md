---
id: ADR-UNIV-2026-11-24-001
status: proposed
date: 2026-11-24
decision-makers: [owner]
scope: ["src/engine/camera/**", "src/scenes/SpaceGames/**", "src/ui/SpaceGames/**"]
supersedes: []
superseded-by:
refs: [SPEC-UNIV-2026-11-24-001]
---

# Unified Pointer Events Touch Camera & Lazy-Loaded Two-Layer Space Game Hub

## Rule

Route all canvas orbit/pinch gestures through `TouchOrbitGestureEngine` with touch-only zero-allocation inertia in `CameraManager`. Build every Space Game as a pure TypeScript engine plus a lazy-loaded R3F scene (`0` dynamic point/spot lights, `disposeObjectTree` cleanup, `<= 15 Hz` HUD sync).

## Context

On mobile touchscreens, pairing single-pointer `pointermove` listeners with a passive `touchmove` pinch listener caused erratic camera rotation spikes during two-finger pinch, 2-to-1 finger coordinate jumps, stuck drags on `pointercancel`, sluggish desktop-tuned drag speed (`0.0045`), and browser scroll hijacking. Simultaneously, adding five full 3D character-driven space games (`Astro Survivor 3D`, `Astro Jetpack Odyssey`, `Orbital Mech Arena 3D`, `Exo-Miner Survival 3D`, `Zero-G Space Rescue`) risked inflating the initial bundle, leaking GPU memory, or triggering 60 FPS React re-render stalls on mobile GPUs.

## Decision

1. **Unified Pointer Events Gesture State Machine:** Consolidate mouse and multi-touch camera input into `src/engine/camera/TouchOrbitGestureEngine.ts` (`Map<pointerId, TrackedPointer>`) with `touch-action: none`, `overscroll-behavior: none`, `100dvh` root sizing, responsive touch drag (`0.0095 rad/px`), logarithmic two-finger pinch zoom (`Math.log(prevDist / currDist)`), double-tap quick zoom, and touch-only zero-allocation orbit inertia (`angularVelTheta`/`angularVelPhi`) in `CameraManager.updateOrbit`. Keep desktop mouse drag strictly zero-inertia.
2. **Two-Layer Offline Space Game Hub:** Separate each of the five games into a DOM/WebGL-free deterministic simulation module under `src/scenes/SpaceGames/engines/*.ts` and an independently code-split R3F 3D scene (`React.lazy` inside inner `<Suspense>`) paired with a `<= 15 Hz` throttled HUD (`createHudThrottle`) and shared `MobileGameControls`. Character rigs (`CharacterModels.ts`) return locally owned `THREE.Group` trees freed via `disposeObjectTree` on unmount without touching `AssetManager` shared assets, and persistent progress/upgrades live under `universe_space_games_v1` in `localStorage`.

## Rejected alternatives

- **Patching `touchmove` alongside `pointermove` or adopting `@use-gesture/react`:** Dual event lifecycles still jump on 2->1 finger release and clash with R3F canvas raycasting, whereas a focused ~200-line Pointer Events state machine is deterministic, dependency-free, and directly unit-testable.
- **Bundling all 5 games into the main chunk or putting physics inside JSX `useFrame`:** Inflates initial Solar System load time and prevents deterministic unit testing of gravity, waves, boss telegraphs, mining economy, and zero-G repair mechanics.
- **Caching shared character geometries globally:** Risks accidental `.dispose()` corruption across game switches; per-scene local ownership freed by `disposeObjectTree` guarantees leak-free unmounts.

## Consequences

- Mobile orbiting, pinching, one-handed zoom (`MobileZoomControls`), and HUD scrolling behave predictably on real touchscreens with zero browser gesture hijacking.
- All five 3D games ship as separate lazy JS chunks, keeping Solar System startup fast while sharing `InputManager`, `AudioManager` offline SFX, `ModeOrchestrator` exclusivity, and `MobileGameControls`.
- Future Space Games must follow the same engine/scene/HUD-throttle split and GPU light/disposal invariants.

## Confirmation

Enforced by `src/tests/mobileTouchAndUx.test.ts`, `src/tests/spaceGamesCore.test.ts`, `src/tests/spaceGamesModulesA.test.ts`, `src/tests/spaceGamesModulesB.test.ts`, `src/tests/performanceArchitecture.test.ts`, and Desktop/Mobile suites in `e2e/universe.spec.ts`.

## Revisit when

A future engine release introduces hardware gamepad / WebXR controllers or migrates the physics loop to a Web Worker / WASM runtime.
