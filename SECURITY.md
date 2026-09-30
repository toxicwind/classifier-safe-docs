# Security

## What this is

classifier-safe-docs repairs **false positives**: our own operational
docs that a prompt-injection / safety classifier flags because of their
surface shape. It rewrites phrasing; it does not change what the doc
tells anyone to do.

## What this is not

This is **not a bypass toolkit**. It does not help evade a correctly-fired
guardrail, disguise adversarial instructions, or smuggle content past a
safety system. The repair tool **refuses** input whose purpose is
circumvention (exit 3) — rewriting the purpose is out of scope, by design.

## Reporting

Reports of misuse-as-evasion — someone using these tools to disguise
content that a classifier correctly flagged — are treated as security
issues. Open a GitHub issue titled `[security]` or contact the maintainer
directly. Do not open a public PR demonstrating evasion.

## Scope notes

- No credential-shaped data belongs in this repo, in code or fixtures.
- The boundary statement appears in README.md, SECURITY.md (this file),
  and the repair tool's refusal path. All three must stay in agreement.
