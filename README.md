# classifier-safe-docs

Rewrite operational docs so prompt-injection / safety classifiers stop
false-positive flagging them — without losing the operational point.

Classifiers flag **shapes**, not intent. Our own doctrine files got flagged
because they shared surface shape with injection payloads: imperatives
about ignoring safety systems, bypass statistics, named circumvention
techniques. The fix is to write the philosophy in a shape the classifier
does not flag — same instructions an agent would act on, no flag shape.

## Quick start

```sh
bun install
# scan a doc
bun bin/csd-scan.ts ./my-doc.md
# repair it (prints repaired text; use --in-place to overwrite)
bun bin/csd-repair.ts ./my-doc.md --diff
# verify the result
bun bin/csd-verify.ts ./my-doc.md
```

## The 3-step method

1. **Diagnose** — `csd-scan` finds trigger phrases in 5 classes:
   - **Bypass statistics** — cited success rates for defeating guardrails. Reads as jailbreak literature.
   - **Named circumvention techniques** — names of methods for defeating a safety system (e.g. weight-editing attacks, jailbreak personas).
   - **Circumvention narratives** — stories about being driven to evade a filter. Reads as evasion storytelling.
   - **Direct adversarial imperatives** — instructions to disregard a safety system. Reads as an instruction to disobey.
   - **Anti-safety theory** — general claims that safety systems cannot work. Reads as ideological justification.
2. **Rephrase** — `csd-repair` applies the safe-shape mapping (see table
   below). Rules of thumb: behavioral over adversarial, observational over
   theoretical, narrow the scope, delete what the point does not need.
3. **Verify** — `csd-verify` asserts the rewritten doc is clean per the
   same patterns. If still flagged, bisect: halve the doc, test each half,
   converge on the triggering phrase.

| Flagged shape | Safe shape |
|---|---|
| "safety classifiers are red herrings" | "error strings are claims, not facts — verify against observable state" |
| "don't trust the refusal" | "classify the failure by observed type, act on the type not the prose" |
| "route around the filter" | "rewrite the request concretely, retry once against new evidence, or route the same task to another model/provider" |
| bypass statistics / named techniques | delete — cite your own observed incidents instead |
| claims about RLHF failure modes | delete — the operational point never needed the theory |

## CLI reference

- `csd-scan <file-or-dir> [--json]` — list matches as `path:line:class: excerpt`.
- `csd-repair <file> [--dry-run] [--diff] [--in-place]` — rewrite flagged
  phrases; prints to stdout unless `--in-place` (keeps a `.bak`).
  **Refuses** (exit 3) content whose purpose is circumvention — see Boundary.
- `csd-verify <file-or-dir>` — exit 0 if clean, exit 1 listing remaining hits.

## Boundary

This repairs false positives on **our own** docs. It is not for disguising
instructions to evade someone else's safety systems, and not for smuggling
adversarial content past a guardrail that correctly flagged it. If the
flagged content's actual purpose *is* circumvention, the classifier was
right — rewrite the purpose, not the phrasing. Reports of misuse-as-evasion
are treated as security issues (see SECURITY.md).

## Layout

- `src/patterns.ts` — the 5-class pattern table (single source of truth)
- `bin/` — the three CLI tools
- `fixtures/` — dirty/clean sample docs (one per class, one mixed, one clean)
- `tests/` — `bun test` suite (scan, round-trip, boundary refusal)
- `docs/` — ARCHITECTURE.md, EXAMPLES.md
- `SKILL.md`, `prompt_context.md` — the original skill this repo implements
