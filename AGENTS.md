# universe-engine AI Agent Instructions

universe-engine's identity on top of the owner's agent kit (shared policy, kit skills, roles, guard and tools). Where this file is stricter, it wins. Decisions: [DECISIONS.md](DECISIONS.md) (code `UNIV`). Changes: [CHANGELOG.md](CHANGELOG.md).

## Scope & Product Rules

- Standalone personal Git repository at `/Users/VanAnh/WorkSpace/Personal/universe-engine` (`github.com/lucasvu1302/universe-engine`).
- **3D Universe Engine**: a real-time, interactive 3D universe explorer running natively in the browser.
- **Zero-API-Key, Offline-First Invariant**: 100% native browser APIs (Web Speech, Web Audio, WebXR), zero external API keys, zero paid external calls, and bundled offline ephemeris/assets. Never introduce backend runtime dependencies, cloud API keys, or hardcoded secrets.
- **Runtimes**: Claude Code, Antigravity and Codex through the kit, opened from `/Users/VanAnh/WorkSpace/Personal/universe-engine`. `CLAUDE.md` imports this file. Never add `.codex/`, Copilot, Kiro or Gemini CLI files. Cloud and remote sessions have no kit: follow this file alone and say so.

## Stack & Layout

- **Frontend & 3D**: React 19, TypeScript 5.9, Three.js (`0.185`), React Three Fiber (`@react-three/fiber` 9, `@react-three/drei` 10, `@react-three/postprocessing` 3), `three-mesh-bvh`, `maath`, Zustand 5, GSAP 3, Lenis, Tailwind CSS v4.
- **Build & Tooling**: Vite 8 (`vite-plugin-glsl` for shaders under `src/shaders/`), ESLint 9 flat config (`eslint.config.js`), Vitest 4 + jsdom (`src/tests/`), Playwright (`e2e/`, port `3000`).
- **Runtime & Package Manager**: Node 24 (`node:24-alpine` in Docker/CI) and `pnpm >= 12` (`devEngines` in `package.json`, frozen `pnpm-lock.yaml`).
- **Source structure (`src/`)**: `engine/`, `entities/`, `scenes/`, `shaders/`, `simulation/`, `stores/`, `data/`, `i18n/`, `ui/`, `styles/`, `tests/`.

## Verification & Checks

- `pnpm dev`: local Vite dev server (`http://localhost:3000`)
- `pnpm typecheck`: TypeScript check (`tsc --noEmit`)
- `pnpm lint`: ESLint (`eslint src`)
- `pnpm test`: Vitest unit suite (`vitest run`)
- `pnpm test:e2e`: Playwright E2E suite (`e2e/`, Desktop Chrome + Mobile Chrome)
- `pnpm build`: production build (`tsc -b && vite build`)
- Kit checks: `agk check .` and `agk run decision-log check` (combined in manifest `ci`).

## CI & Deployment

- **Release branch**: `main`. Pushing to `main` triggers `.github/workflows/docker-publish.yml` (runs `typecheck`, `lint`, `test`, then builds and pushes `linux/amd64` to `ghcr.io/lucasvu1302/universe-engine:latest` and `sha-*`).
- **Container**: `Dockerfile` + `docker/nginx.conf` — hardened unprivileged `nginx:1.27-alpine` static SPA serving `/usr/share/nginx/html` on port `8080` with `/healthz`, immutable asset caching, and security headers.
- **Production host**: `lucasvu-labs-vps` (look up connection metadata via `agk servers show lucasvu-labs-vps`; secrets never enter this repo). Deployed with `deploy/docker-compose.yml` (`127.0.0.1:18210:8080`, `read_only: true`, `cap_drop: ALL`, `no-new-privileges`) behind host Nginx (`deploy/nginx-vhost.conf`) at `https://universe.lucasvu.io.vn`.

## Working Here

- **Decisions & Changelog**: read `DECISIONS.md` before changing behavior. Durable choices get an ADR in `decisions/` (`ADR-UNIV-...`) via the `decision-log` skill; user-visible or deploy changes get a `CHANGELOG.md` `[Unreleased]` entry.
- **CodeGraph**: enabled (`search.codegraph: true`, `.agents/mcp_config.json`, rendered `.claude/agents/explorer*.md`). Local index `.codegraph/` stays untracked.
- **Kit working files**: specs live in kit state (`agk run spec next-id`); task reports (`docs/task-report/`) and scratch (`.tmp/`) stay gitignored and excluded from Docker builds.
- The repository may hold unfinished owner changes: never stage, revert or reformat files the task does not own.
