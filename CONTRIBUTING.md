# Contributing

## Ground rules

- New executable code in Bun/TypeScript only. No Python.
- `src/patterns.ts` is the single source of truth for trigger classes.
  All three CLI tools import it — never duplicate a pattern in a tool.
- Every pattern change needs a fixture and a test:
  - add a `fixtures/dirty-*.md` sample (or extend the mixed fixture),
  - assert it in `tests/scan-repair-verify.test.ts`.
- Keep precision high: a pattern that fires on ordinary prose is a bug.
  Test against `fixtures/clean.md` — it must stay at zero hits.
- The boundary is load-bearing. Any change to the refusal heuristic in
  `csd-repair.ts` must update the boundary test and SECURITY.md together.

## Workflow

```sh
bun install
bun test            # all green before a PR
bun bin/csd-scan.ts .          # self-scan
bun bin/csd-verify.ts README.md docs/ SKILL.md
```

Commit with clear messages; keep the tree clean.
