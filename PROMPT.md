# classifier-safe-docs — first-class repository build

## Source material (already in repo root)

SKILL.md, prompt_context.md, skill.toml (v0.1.0, promptonly, open_claw).
They define the methodology:

1. **Diagnose** — find trigger phrases in 5 classes:
   - Bypass statistics ("X% success bypassing guardrails")
   - Named circumvention techniques (abliteration, DAN-style framing)
   - Circumvention narratives ("forced onto open-weight models")
   - Direct adversarial imperatives ("ignore the safety classifier")
   - Anti-safety theory ("a perfect classifier is impossible")
2. **Rephrase** — keep the operational point, change the shape
   (behavioral over adversarial, observational over theoretical,
   narrow the scope, delete what the point doesn't need).
3. **Verify** — re-read through the blocked tool path; bisect on
   failure; confirm the operational instruction survived.

Hard boundary: false-positive repair on OUR OWN docs only. Never
evasion of a correctly-fired guardrail. If the flagged content's
purpose IS circumvention, the classifier was right — rewrite the
purpose, not the phrasing.

## Build target

Turn this seed into a first-class public repo with:

1. **README.md** — problem, quick start, the 3-step method with the
   mapping table, worked example, boundary statement, install/usage
   of the CLI tools.
2. **Bun CLI tools** (TypeScript, `bin/`):
   - `bin/csd-scan.ts` — scan a file/dir for the 5 trigger classes;
     output matches as `path:line:class: excerpt`.
   - `bin/csd-repair.ts` — apply the safe-shape mapping to flagged
     phrases; flags `--dry-run`, `--diff`; never rewrites silently
     (writes `.repaired` or stdout unless `--in-place`).
   - `bin/csd-verify.ts` — assert a rewritten doc is clean per the
     same patterns; exit non-zero with the remaining hits listed.
   - Shared pattern table in `src/patterns.ts` (single source of
     truth for the 5 classes; scan/repair/verify all import it).
   - `package.json` with `bin` entries, `bun` as the runtime.
3. **tests/** — `bun test` suite:
   - One fixture per trigger class asserting scan finds it.
   - Clean-doc fixture asserting scan finds nothing.
   - Round-trip: `verify(repair(scan(Dirty)))` is clean AND the
     operational instruction text is preserved (assert key phrases
     survive).
   - Boundary test: repair refuses content whose purpose is
     circumvention (document the heuristic in the test name).
4. **fixtures/** — `dirty-*.md` (one per class + one mixed),
   `clean.md`.
5. **docs/** — `ARCHITECTURE.md` (how the 5 classes were derived,
   why shape-not-intent, the pattern table rationale),
   `EXAMPLES.md` (before/after pairs).
6. **CI** — `.github/workflows/ci.yml`: install bun, `bun test`,
   run scan+verify self-check on the repo's own docs.
7. **CONTRIBUTING.md, SECURITY.md** — standard; SECURITY.md must
   restate the boundary (this is not a bypass toolkit; reports of
   misuse-as-evasion are treated as security issues).
8. **LICENSE** — MIT.
9. **skill.toml** — bump to 0.2.0; document the new CLI tools.

## Constraints

- New executable code in Bun/TypeScript only. No Python.
- No credential-shaped data anywhere in the repo.
- The boundary is load-bearing: README, SECURITY.md, and the
  repair tool's refusal path must all state it. Do not build
  anything that helps evade a correctly-fired guardrail.
- All `bun test` green before finishing. Self-scan of the repo's
  own docs must be clean.
- Commit as you go with clear messages; leave the tree with a
  single clean working state and a summary of what was built.
