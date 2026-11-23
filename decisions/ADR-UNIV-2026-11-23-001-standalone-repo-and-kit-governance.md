---
id: ADR-UNIV-2026-11-23-001
status: accepted
date: 2026-11-23
decision-makers: [owner]
scope: ["*"]
supersedes: []
superseded-by:
refs: [SPEC-LUNGTUNG-2026-11-23-001]
---

# Keep universe-engine as a standalone personal repository with full agent-kit governance

## Rule

Keep universe-engine as a standalone personal repository with agent-kit (`UNIV` ADRs, `CHANGELOG.md`, CodeGraph) committed at root; keep `docs/task-report/`, `.tmp/`, `.codegraph/` and `.claude/settings.local.json` gitignored and excluded from Docker builds.

## Context

`universe-engine` previously lived as a nested Git repository inside the multi-project sandbox folder `lung_tung`, sharing `lung_tung`'s `multi` manifest with `decisions: off` and `codegraph: false`. As `universe-engine` grew to 220 source files with its own CI/CD (`docker-publish.yml`) and live VPS deployment (`universe.lucasvu.io.vn`), the owner moved it to `/Users/VanAnh/WorkSpace/Personal/universe-engine` and requested a dedicated personal agent-kit setup with `UNIV` decision tracking, `CHANGELOG.md`, and CodeGraph.

## Decision

1. Manage `universe-engine` as a `single`-layout `personal` repository under `~/WorkSpace/Personal/universe-engine` with its own `.agent-kit/project.json`, `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `.claude/agents/` (rendered via `agk render-roles`), and `.agents/mcp_config.json`.
2. Enable the `decision-log` regime with root code `UNIV` (`decisions/`, generated `DECISIONS.md`) and a Keep a Changelog 1.1.0 `CHANGELOG.md` at the repository root.
3. Enable CodeGraph (`search.codegraph: true`) with local index `.codegraph/` excluded from Git and Docker build contexts alongside `docs/task-report/`, `.tmp/`, and local Claude overrides.

## Rejected alternatives

- Keep `universe-engine` nested under `lung_tung`: mixes a live deployed product with an unversioned scratch folder and forces sessions to open from the parent sandbox.
- Keep `decisions: off` and `codegraph: false`: loses durable architectural rules as the 3D codebase expands and leaves 220 source files without symbol-graph lookup.
- Commit `.codegraph/`, `docs/task-report/`, or `.tmp/` into Git or Docker images: bloats Git history and Docker build contexts with local artifacts.

## Consequences

- Agents open `/Users/VanAnh/WorkSpace/Personal/universe-engine` directly and load its dedicated identity card, ADR index, and CodeGraph MCP.
- Durable architectural changes require an `ADR-UNIV-*` record and `agk run decision-log check --update`; user-visible or deploy changes require a `CHANGELOG.md` `[Unreleased]` entry.
- Specs live in `~/.agent-kit/state/projects/universe-engine/plans/` and are never committed.

## Confirmation

Verified by `agk check .`, `agk run decision-log check`, and `git check-ignore` on `docs/task-report/`, `.tmp/`, `.codegraph/`, and `.claude/settings.local.json`.

## Revisit when

`universe-engine` is split into multiple coordinated repositories or migrated into a larger monorepo workspace.
