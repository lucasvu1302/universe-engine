# 🌌 3D Universe Engine

> **Real-Time Interactive 3D Universe Exploration Engine running natively in the browser.**  
> *Space Engine × NASA × Apple × Interstellar × Awwwards × AAA Game UI*

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r182-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC.svg)](https://tailwindcss.com/)

---

## ✨ Key Features

### 🪐 1. Solar System & Celestial Dynamics
- **Accurate Keplerian Orbital Physics**: Planets follow exact Keplerian elliptical orbits ($y = -z \cdot \sin(\text{inc})$) dead-center on orbital lines.
- **Natural Satellites (Moons Hierarchy)**:
  - **Jupiter**: Io (volcanic sulfur), Europa (cracked ice ocean), Ganymede (magnetic giant), Callisto (ancient cratered ice).
  - **Saturn**: Titan (dense golden atmosphere), Enceladus (cryovolcanic geysers).
  - **Mars**: Phobos & Deimos.
  - **Neptune**: Triton (retrograde cryo-moon).
  - **Earth**: The Moon (Luna).
- **Saturn Ring Shadows**: Real-time optical shadow projection cast by the planet onto its rings and by the rings onto the planet's cloud decks.

### 🕳️ 2. Supermassive Black Hole ("Gargantua")
- **Thorne-Nolan Interstellar Physics**:
  - Pure light-absorbing Event Horizon core.
  - Razor-sharp $1.5 R_s$ Einstein **Photon Sphere Ring**.
  - Burning plasma **Accretion Disk** with **Relativistic Doppler Beaming** (blue-shifted approaching side, red-shifted receding side).
  - **Einstein Gravitational Lensing Halo** dynamically billboarding to camera orientation for seamless $360^\circ$ views with zero clipping seams.

### 🎬 3. IMAX / Film-Quality Post-Processing
- **ACES Filmic Tone Mapping**: Natural cinematic highlight roll-off preventing color clipping.
- **Selective Cinematic Bloom**: Realistic blinding radiance for the Sun and Black Hole accretion disk.
- **Optical Lens Vignette**: Subtle edge falloff mimicking high-end anamorphic space cameras.

### 🌌 4. Deep Space & Galaxies
- **Milky Way Galaxy Overview**: 40,000-particle logarithmic spiral galaxy with zero-unmount buttery smooth 120 FPS cross-fade.
- **Distant Cosmic Objects**: Andromeda Galaxy (M31), Large & Small Magellanic Clouds, and cosmic emission nebulae.

### 🛠️ 5. Exploration Modes & Tools
- **Free Flight Mode (6-DOF)**: Spacecraft Newtonian physics with inertia, boost, braking, and spatial warp audio.
- **Command Palette (`⌘K` / `Ctrl+K`)**: Universal search for planets, moons, singularities, and engine commands.
- **Scale Explorer ($10^n$)**: Interactive logarithmic journey from Earth's radius to the observable universe.
- **Planet Comparison Mode**: Side-by-side scale comparison of any two celestial bodies.
- **Cinematic Auto Tour**: Automated guided tour through iconic worlds and cosmic anomalies.
- **Photo Mode**: High-resolution screenshot capture with FOV and exposure controls.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- [pnpm](https://pnpm.io/) 9+

### Installation
```bash
# Clone the repository
git clone https://github.com/lucasvu1302/universe-engine.git

# Navigate into the project folder
cd universe-engine

# Install dependencies
pnpm install
```

### Development
```bash
# Start local dev server at http://localhost:3000
pnpm dev
```

### Build & Testing
```bash
# Type check TypeScript
pnpm typecheck

# Lint codebase
pnpm lint

# Run unit tests (Vitest)
pnpm test

# Run end-to-end tests (Playwright)
pnpm test:e2e

# Build production bundle
pnpm build
```

---

## 📜 License
MIT License. Built for modern high-performance browser graphics.
