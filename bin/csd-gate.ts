#!/usr/bin/env bun
/**
 * csd-gate — pre-save gate for scheduled task bodies.
 *
 * Usage: csd-gate <task-body-file> [--json]
 *
 * Scans a task body for the scheduled-review trigger class (phrasing the
 * platform scheduled-task safety review flags as autonomy/oversight-evasion).
 *
 * Exit 0: no scheduled-review triggers — safe to save as a scheduled task.
 * Exit 1: scheduled-review triggers found — the body would fail the platform
 *         scheduled-task safety review and the run would be skipped.
 * Exit 2: usage/file error.
 *
 * Other trigger classes are reported as warnings (exit 0) — they do not gate.
 * Empirical basis: probe series P1/P2, 2026-09-30, live scheduler.
 */
import { readFileSync } from "node:fs";
import { scanText, type TriggerClass } from "../src/patterns.ts";

const GATE_CLASS: TriggerClass = "scheduled-review";

function usage(): never {
  console.error("Usage: csd-gate <task-body-file> [--json]");
  process.exit(2);
}

const args = process.argv.slice(2);
const json = args.includes("--json");
const file = args.find((a) => a !== "--json");
if (!file) usage();

let text: string;
try {
  text = readFileSync(file, "utf8");
} catch (e) {
  console.error(`csd-gate: cannot read ${file}: ${(e as Error).message}`);
  process.exit(2);
}

const hits = scanText(text, file);
const blocking = hits.filter((h) => h.cls === GATE_CLASS);
const warnings = hits.filter((h) => h.cls !== GATE_CLASS);

if (json) {
  console.log(
    JSON.stringify(
      {
        file,
        gate: GATE_CLASS,
        pass: blocking.length === 0,
        blocking: blocking.map((h) => ({ line: h.line, excerpt: h.excerpt })),
        warnings: warnings.map((h) => ({
          cls: h.cls,
          line: h.line,
          excerpt: h.excerpt,
        })),
      },
      null,
      2
    )
  );
} else if (blocking.length > 0) {
  console.error(
    `csd-gate: FAIL — ${blocking.length} scheduled-review trigger(s) in ${file}. ` +
      `This body would be skipped by the platform scheduled-task safety review.`
  );
  for (const h of blocking) console.error(`  line ${h.line}: ${h.excerpt}`);
  if (warnings.length > 0)
    console.error(
      `  (${warnings.length} other-class warning(s): ${[
        ...new Set(warnings.map((w) => w.cls)),
      ].join(", ")})`
    );
} else {
  console.log(`csd-gate: PASS — no scheduled-review triggers in ${file}.`);
  if (warnings.length > 0)
    console.log(
      `  (${warnings.length} other-class warning(s): ${[
        ...new Set(warnings.map((w) => w.cls)),
      ].join(", ")})`
    );
}

process.exit(blocking.length > 0 ? 1 : 0);
