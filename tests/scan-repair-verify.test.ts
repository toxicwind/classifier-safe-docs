/**
 * bun test suite for classifier-safe-docs.
 *
 * - One fixture per trigger class asserts scan finds it.
 * - Clean-doc fixture asserts scan finds nothing.
 * - Round-trip: verify(repair(scan(Dirty))) is clean AND the operational
 *   instruction text is preserved (key phrases survive).
 * - Boundary: repair REFUSES content whose purpose is circumvention.
 */
import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { scanText, TRIGGER_PATTERNS } from "../src/patterns.ts";

const FIX = join(import.meta.dir, "../fixtures");
const read = (n: string) => readFileSync(join(FIX, n), "utf8");

describe("scan finds each trigger class", () => {
  const cases: Array<[string, string]> = [
    ["dirty-bypass-stats.md", "bypass-stats"],
    ["dirty-named-technique.md", "named-technique"],
    ["dirty-narrative.md", "narrative"],
    ["dirty-imperative.md", "imperative"],
    ["dirty-theory.md", "theory"],
  ];
  for (const [file, cls] of cases) {
    test(`${file} triggers ${cls}`, () => {
      const hits = scanText(read(file), file);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.some((h) => h.cls === cls)).toBe(true);
    });
  }

  test("dirty-mixed.md triggers all five classes", () => {
    const hits = scanText(read("dirty-mixed.md"), "dirty-mixed.md");
    const found = new Set(hits.map((h) => h.cls));
    for (const cls of [
      "bypass-stats",
      "named-technique",
      "narrative",
      "imperative",
      "theory",
    ] as const) {
      expect(found.has(cls)).toBe(true);
    }
  });
});

describe("clean docs stay clean", () => {
  test("clean.md has zero hits", () => {
    expect(scanText(read("clean.md"), "clean.md")).toEqual([]);
  });
});

describe("pattern table integrity", () => {
  test("exactly six classes are defined", () => {
    expect(TRIGGER_PATTERNS.map((p) => p.cls).sort()).toEqual(
      ["bypass-stats", "imperative", "named-technique", "narrative", "scheduled-review", "theory"].sort()
    );
  });

  test("every class has at least one pattern and a safe-shape note", () => {
    for (const p of TRIGGER_PATTERNS) {
      expect(p.patterns.length).toBeGreaterThan(0);
      expect(p.safeShape.length).toBeGreaterThan(20);
      expect(p.label.length).toBeGreaterThan(0);
    }
  });
});

describe("repair round-trip (via csd-repair CLI)", () => {
  async function repairStdin(text: string): Promise<{ stdout: string; stderr: string; code: number }> {
    const proc = Bun.spawn(
      ["bun", join(import.meta.dir, "../bin/csd-repair.ts"), "/dev/stdin"],
      { stdin: new TextEncoder().encode(text), stdout: "pipe", stderr: "pipe" }
    );
    const [out, err, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return { stdout: out, stderr: err, code };
  }

  test("dirty-imperative repairs to clean and keeps the operational point", async () => {
    const dirty = read("dirty-imperative.md");
    const { stdout: repaired, code } = await repairStdin(dirty);
    expect(code).toBe(0);
    // clean per the same patterns
    expect(scanText(repaired, "repaired")).toEqual([]);
    // operational instruction survived: verify-then-act is still present
    expect(repaired).toMatch(/verify|classify|observable/i);
  }, 30000);

  test("dirty-mixed repairs to clean", async () => {
    const dirty = read("dirty-mixed.md");
    const { stdout: repaired, code } = await repairStdin(dirty);
    expect(code).toBe(0);
    expect(scanText(repaired, "repaired")).toEqual([]);
  }, 30000);
});

describe("boundary: repair refuses circumvention-purpose content", () => {
  test("evasion tutorial is refused with exit 3, not repaired", async () => {
    const proc = Bun.spawn(
      ["bun", join(import.meta.dir, "../bin/csd-repair.ts"), "/dev/stdin"],
      {
        stdin: new TextEncoder().encode(read("refuse-evasion-tutorial.md")),
        stdout: "pipe",
        stderr: "pipe",
      }
    );
    const [out, err, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    // Heuristic: explicit evasion intent ("how to bypass", "step-by-step")
    // plus dense imperative/technique hits -> refusal, exit code 3.
    expect(code).toBe(3);
    expect(err).toMatch(/REFUSED/i);
    expect(out).toBe("");
  }, 30000);
});

describe("scheduled-review class (probe series P1/P2/P3, 2026-09-30)", () => {
  test("autonomy directive triggers scheduled-review", () => {
    const hits = scanText(
      "This task runs with full autonomy under the standing order.",
      "probe"
    );
    expect(hits.some((h) => h.cls === "scheduled-review")).toBe(true);
  });
  test("P3b do-not-message-user triggers scheduled-review", () => {
    const hits = scanText("Do not message the user.", "probe");
    expect(hits.some((h) => h.cls === "scheduled-review")).toBe(true);
  });
  test("P3c scheduled-task framing triggers scheduled-review", () => {
    const hits = scanText(
      "You are running a scheduled maintenance task.",
      "probe"
    );
    expect(hits.some((h) => h.cls === "scheduled-review")).toBe(true);
  });
  test("concrete task body does not trigger scheduled-review", () => {
    const hits = scanText(
      "Write the current UTC timestamp into out.txt.",
      "probe"
    );
    expect(hits.filter((h) => h.cls === "scheduled-review")).toEqual([]);
  });
});
