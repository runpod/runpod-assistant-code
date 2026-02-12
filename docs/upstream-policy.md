# Upstream Merge Policy

This repository is a fork of [OpenCode](https://github.com/opencode-ai/opencode). To keep merges clean and minimize conflicts, follow these rules:

## Rules

1. **Prefer new files over editing existing ones.** Runpod-specific code lives in dedicated files (e.g., `provider/runpod.ts`, `cli/cmd/runpod.ts`).
2. **Minimize core edits.** When editing upstream files is unavoidable, keep changes small and isolated — ideally single-line injections at clear extension points.
3. **No renames or moves of upstream files.** If a file needs a different name, create a new file that re-exports from the original.
4. **Keep imports lazy where possible.** Use dynamic `import()` for Runpod modules so they don't affect startup when unused.
5. **Document every upstream edit.** Each modified upstream file should have a comment or commit message explaining the change and why a new file wasn't sufficient.

## Current Upstream Edits

| File | Change | Reason |
|------|--------|--------|
| `packages/opencode/src/provider/models.ts` | Inject Runpod provider in `get()` | Single integration point for the model database |
| `packages/opencode/src/index.ts` | Register `RunpodCommand` | CLI command registration requires the yargs chain |
| `packages/opencode/src/cli/cmd/tui/thread.ts` | Auto-trigger Runpod setup on first launch | Onboarding must happen before TUI starts |

## Merge Strategy

When pulling upstream changes:

1. `git fetch upstream && git merge upstream/main`
2. Resolve conflicts in the two edited files above (usually trivial).
3. Run `bun run build` and `bun test` to verify nothing broke.
