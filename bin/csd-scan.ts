#!/usr/bin/env bun
/**
 * csd-scan — scan a file or directory for the 5 classifier trigger classes.
 * Usage: csd-scan <path> [--json]
 * Output: path:line:class: excerpt  (one per match)
 * Exit: 0 always (scan reports; verify decides). Use csd-verify for gating.
 */
import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";
import { scanText, formatMatch } from "../src/patterns.ts";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const targets = args.filter((a) => !a.startsWith("-"));

if (targets.length === 0) {
  console.error("Usage: csd-scan <file-or-dir> [more paths...] [--json]");
  process.exit(2);
}

function collectFiles(p: string): string[] {
  const st = statSync(p);
  if (st.isFile()) return [p];
  if (st.isDirectory()) {
    const out: string[] = [];
    for (const e of readdirSync(p)) {
      // skip hidden dirs, node_modules, .git
      if (e.startsWith(".") || e === "node_modules") continue;
      out.push(...collectFiles(join(p, e)));
    }
    return out;
  }
  return [];
}

const TEXT_EXT = /\.(md|mdx|txt|toml|yaml|yml|json|ts|js|tsx|jsx|sh|py)$/i;

const files = targets.flatMap(collectFiles).filter((f) => TEXT_EXT.test(f));
let total = 0;

if (asJson) {
  const results: Record<string, ReturnType<typeof scanText>> = {};
  for (const f of files) {
    let text: string;
    try {
      text = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    const matches = scanText(text, f);
    if (matches.length > 0) {
      results[f] = matches;
      total += matches.length;
    }
  }
  console.log(JSON.stringify(results, null, 2));
} else {
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
      total++;
    }
  }
}

if (!asJson) {
  console.error(`\n${total} trigger phrase${total === 1 ? "" : "s"} found in ${files.length} files.`);
}
