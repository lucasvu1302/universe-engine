# Changelog

All notable changes to universe-engine. Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/); release headings match the `vX.Y.Z` tags on `main`. Decisions behind these changes: [DECISIONS.md](DECISIONS.md).

## [Unreleased]

### Added

- Standalone personal agent-kit setup at the repository root (`.agent-kit/project.json`, `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, CodeGraph MCP config and rendered explorer roles, `UNIV` ADR regime with `DECISIONS.md`, and `CHANGELOG.md`). (`ADR-UNIV-2026-11-23-001`, `SPEC-LUNGTUNG-2026-11-23-001`)
- Offline-first 3D Space Game Hub (`SpaceGameHubModal`) accessible from `SuperNav`, `ObservatoryMegaHub`, and `CommandPalette`, featuring 5 lazy-loaded character-driven 3D games (`Astro Survivor 3D`, `Astro Jetpack Odyssey`, `Orbital Mech Arena 3D`, `Exo-Miner Survival 3D`, `Zero-G Space Rescue`), articulated 3D character rigs, 7 offline Web Audio SFX cues, dual-thumb `MobileGameControls`, and `localStorage` progression (`universe_space_games_v1`). (`ADR-UNIV-2026-11-24-001`, `SPEC-UNIV-2026-11-24-001`)

### Changed

- Updated `.gitignore` and `.dockerignore` to exclude local agent-kit artifacts (`docs/task-report/`, `.tmp/`, `.codegraph/`, `.claude/settings.local.json`, `.claude/worktrees/`) from Git tracking and Docker build contexts. (`ADR-UNIV-2026-11-23-001`)

### Fixed

- Overhauled mobile touch ergonomics by replacing dual pointer/passive-touch handlers with unified Pointer Events (`TouchOrbitGestureEngine`), touch-only zero-allocation orbit inertia, logarithmic 2-finger pinch zoom without 2-to-1 jumps, double-tap quick zoom, `pointercancel` cleanup, `touch-action: none`, `overscroll-behavior: none`, `100dvh` viewport sizing, compact mobile `TargetHUD` (`max-h-[30dvh]`), and one-handed `MobileZoomControls`. (`ADR-UNIV-2026-11-24-001`, `SPEC-UNIV-2026-11-24-001`)
