#!/usr/bin/env bun
/**
 * csd-verify — assert a rewritten doc is clean per the pattern table.
 * Usage: csd-verify <file-or-dir>
 * Exit 0: clean. Exit 1: remaining hits listed (path:line:class: excerpt).
 */
import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";
import { scanText, formatMatch } from "../src/patterns.ts";

const args = process.argv.slice(2);
const targets = args.filter((a) => !a.startsWith("-"));

if (targets.length === 0) {
  console.error("Usage: csd-verify <file-or-dir> [more paths...]");
  process.exit(2);
}

function collectFiles(p: string): string[] {
  const st = statSync(p);
  if (st.isFile()) return [p];
  if (st.isDirectory()) {
    const out: string[] = [];
    for (const e of readdirSync(p)) {
      if (e.startsWith(".") || e === "node_modules") continue;
      out.push(...collectFiles(join(p, e)));
    }
    return out;
  }
  return [];
}

const TEXT_EXT = /\.(md|mdx|txt|toml|yaml|yml|json|ts|js|tsx|jsx|sh|py)$/i;
const files = targets.flatMap(collectFiles).filter((f) => TEXT_EXT.test(f));

let dirty = 0;
for (const f of files) {
  let text: string;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  const matches = scanText(text, f);
  for (const m of matches) {
    console.log(formatMatch(f, m));
    dirty++;
  }
}

if (dirty > 0) {
  console.error(`\nFAIL: ${dirty} trigger phrase(s) remain.`);
  process.exit(1);
}
console.error("OK: clean — no trigger phrases found.");
