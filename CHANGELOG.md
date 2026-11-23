# Changelog

All notable changes to universe-engine. Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/); release headings match the `vX.Y.Z` tags on `main`. Decisions behind these changes: [DECISIONS.md](DECISIONS.md).

## [Unreleased]

### Added

- Standalone personal agent-kit setup at the repository root (`.agent-kit/project.json`, `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, CodeGraph MCP config and rendered explorer roles, `UNIV` ADR regime with `DECISIONS.md`, and `CHANGELOG.md`). (`ADR-UNIV-2026-11-23-001`, `SPEC-LUNGTUNG-2026-11-23-001`)

### Changed

- Updated `.gitignore` and `.dockerignore` to exclude local agent-kit artifacts (`docs/task-report/`, `.tmp/`, `.codegraph/`, `.claude/settings.local.json`, `.claude/worktrees/`) from Git tracking and Docker build contexts. (`ADR-UNIV-2026-11-23-001`)
