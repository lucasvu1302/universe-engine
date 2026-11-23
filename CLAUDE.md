@AGENTS.md

# Claude Code in universe-engine

The kit's Claude adapter, imported from `~/.claude/CLAUDE.md`, maps the policy onto Claude Code: roles, skills, budgets, plan mode and the kit guard. universe-engine adds only this:

- Open Claude Code (the CLI or the desktop app's Code tab) on this folder so `CLAUDE.md`, `.claude/` and `.agent-kit/` load. Never edit `~/.claude` global config for this project.
- `.claude/settings.json` turns commit and PR attribution off (also for sessions without the kit), allows `mcp__codegraph__codegraph_explore` and denies reading git internals, key files and secret folders. Personal overrides go in the untracked `.claude/settings.local.json`.
