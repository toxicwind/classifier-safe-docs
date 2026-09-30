import React from "react";
import { createSmithers, ClaudeCodeAgent, CodexAgent, Sequence, Ralph } from "smthrs";
import { SuperRalph } from "/home/toxic/sovereign/projects/range/ranch/corral/src";
import { InterpretConfig, FinalReport, CompletionValidator } from "/home/toxic/sovereign/projects/range/ranch/corral/src/components";
import { ralphOutputSchemas } from "/home/toxic/sovereign/projects/range/ranch/corral/src";

const REPO_ROOT = "/home/toxic/classifier-safe-docs";
const DB_PATH = "/home/toxic/classifier-safe-docs/.super-ralph/workflow.db";
const HAS_CLAUDE = true;
const HAS_CODEX = false;
const PROMPT_TEXT = "# classifier-safe-docs — first-class repository build\n\n## Source material (already in repo root)\n\nSKILL.md, prompt_context.md, skill.toml (v0.1.0, promptonly, open_claw).\nThey define the methodology:\n\n1. **Diagnose** — find trigger phrases in 5 classes:\n   - Bypass statistics (\"X% success bypassing guardrails\")\n   - Named circumvention techniques (abliteration, DAN-style framing)\n   - Circumvention narratives (\"forced onto open-weight models\")\n   - Direct adversarial imperatives (\"ignore the safety classifier\")\n   - Anti-safety theory (\"a perfect classifier is impossible\")\n2. **Rephrase** — keep the operational point, change the shape\n   (behavioral over adversarial, observational over theoretical,\n   narrow the scope, delete what the point doesn't need).\n3. **Verify** — re-read through the blocked tool path; bisect on\n   failure; confirm the operational instruction survived.\n\nHard boundary: false-positive repair on OUR OWN docs only. Never\nevasion of a correctly-fired guardrail. If the flagged content's\npurpose IS circumvention, the classifier was right — rewrite the\npurpose, not the phrasing.\n\n## Build target\n\nTurn this seed into a first-class public repo with:\n\n1. **README.md** — problem, quick start, the 3-step method with the\n   mapping table, worked example, boundary statement, install/usage\n   of the CLI tools.\n2. **Bun CLI tools** (TypeScript, `bin/`):\n   - `bin/csd-scan.ts` — scan a file/dir for the 5 trigger classes;\n     output matches as `path:line:class: excerpt`.\n   - `bin/csd-repair.ts` — apply the safe-shape mapping to flagged\n     phrases; flags `--dry-run`, `--diff`; never rewrites silently\n     (writes `.repaired` or stdout unless `--in-place`).\n   - `bin/csd-verify.ts` — assert a rewritten doc is clean per the\n     same patterns; exit non-zero with the remaining hits listed.\n   - Shared pattern table in `src/patterns.ts` (single source of\n     truth for the 5 classes; scan/repair/verify all import it).\n   - `package.json` with `bin` entries, `bun` as the runtime.\n3. **tests/** — `bun test` suite:\n   - One fixture per trigger class asserting scan finds it.\n   - Clean-doc fixture asserting scan finds nothing.\n   - Round-trip: `verify(repair(scan(Dirty)))` is clean AND the\n     operational instruction text is preserved (assert key phrases\n     survive).\n   - Boundary test: repair refuses content whose purpose is\n     circumvention (document the heuristic in the test name).\n4. **fixtures/** — `dirty-*.md` (one per class + one mixed),\n   `clean.md`.\n5. **docs/** — `ARCHITECTURE.md` (how the 5 classes were derived,\n   why shape-not-intent, the pattern table rationale),\n   `EXAMPLES.md` (before/after pairs).\n6. **CI** — `.github/workflows/ci.yml`: install bun, `bun test`,\n   run scan+verify self-check on the repo's own docs.\n7. **CONTRIBUTING.md, SECURITY.md** — standard; SECURITY.md must\n   restate the boundary (this is not a bypass toolkit; reports of\n   misuse-as-evasion are treated as security issues).\n8. **LICENSE** — MIT.\n9. **skill.toml** — bump to 0.2.0; document the new CLI tools.\n\n## Constraints\n\n- New executable code in Bun/TypeScript only. No Python.\n- No credential-shaped data anywhere in the repo.\n- The boundary is load-bearing: README, SECURITY.md, and the\n  repair tool's refusal path must all state it. Do not build\n  anything that helps evade a correctly-fired guardrail.\n- All `bun test` green before finishing. Self-scan of the repo's\n  own docs must be clean.\n- Commit as you go with clear messages; leave the tree with a\n  single clean working state and a summary of what was built.";
const PROMPT_SPEC_PATH = "/home/toxic/classifier-safe-docs/.super-ralph/generated/PROMPT.md";
const PACKAGE_SCRIPTS = {};
const FALLBACK_CONFIG = {
  "projectName": "classifier-safe-docs",
  "projectId": "classifier-safe-docs",
  "focuses": [
    {
      "id": "core",
      "name": "Core Platform"
    },
    {
      "id": "api",
      "name": "API and Data"
    },
    {
      "id": "workflow",
      "name": "Workflow and Automation"
    }
  ],
  "specsPath": "/home/toxic/classifier-safe-docs/.super-ralph/generated/PROMPT.md",
  "referenceFiles": [
    "/home/toxic/classifier-safe-docs/.super-ralph/generated/PROMPT.md"
  ],
  "buildCmds": {
    "verify": "echo \"Add build/typecheck command\""
  },
  "testCmds": {
    "tests": "echo \"Add test command\""
  },
  "preLandChecks": [
    "echo \"Add build/typecheck command\""
  ],
  "postLandChecks": [
    "echo \"Add test command\""
  ],
  "codeStyle": "Follow existing project conventions and keep changes minimal and test-driven.",
  "reviewChecklist": [
    "Spec compliance",
    "Tests cover behavior changes",
    "No regression risk in existing flows",
    "Error handling and observability"
  ],
  "maxConcurrency": 4
};
const CLARIFICATION_SESSION = null;
// Finite-by-default: Ralph loops exit on a real done predicate; this ceiling
// is the backstop (onMaxReached="fail" makes exhaustion loud, exit non-zero).
const MAX_ITERATIONS = 25;
const { smithers, outputs, Workflow } = createSmithers(
  ralphOutputSchemas,
  { dbPath: DB_PATH }
);

// Proxy routing: the super-ralph CLI injects NIM_BASE_URL (with /v1),
// NVIDIA_API_KEY, ANTHROPIC_BASE_URL and NIM_MODEL into its own env before
// spawning this workflow, so every ClaudeCodeAgent child inherits proxy
// routing automatically. ClaudeCodeAgent blanks ANTHROPIC_API_KEY on spawn
// but passes NIM_BASE_URL/NVIDIA_API_KEY through untouched, which is what
// the claude NIM shim reads. Never bake key values into this generated
// file; keys travel in process env only.
function createClaude(systemPrompt: string) {
  return new ClaudeCodeAgent({
    // Use the proxy-routed model from env (NIM_MODEL), not a hardcoded
    // provider model: the nim-proxy only serves the configured model.
    model: process.env.NIM_MODEL || "claude-sonnet-4-6",
    systemPrompt,
    cwd: REPO_ROOT,
    dangerouslySkipPermissions: true,
    timeoutMs: 60 * 60 * 1000,
  });
}
// Note: smithers preflight (claude auth status) is satisfied by the
// nim-proxy shim wrapper (/home/toxic/.local/bin/claude), which returns
// loggedIn:true JSON. Proxy routing is validated by corral at startup.

function createCodex(systemPrompt: string) {
  return new CodexAgent({
    model: "gpt-5.3-codex",
    systemPrompt,
    cwd: REPO_ROOT,
    yolo: true,
    timeoutMs: 60 * 60 * 1000,
  });
}

function choose(primary: "claude" | "codex", systemPrompt: string) {
  if (primary === "claude" && HAS_CLAUDE) return createClaude(systemPrompt);
  if (primary === "codex" && HAS_CODEX) return createCodex(systemPrompt);
  if (HAS_CLAUDE) return createClaude(systemPrompt);
  return createCodex(systemPrompt);
}

const planningAgent = choose("claude", "Plan and research next tickets.");
const implementationAgent = choose("claude", "Implement with test-driven development and jj workflows.");
const testingAgent = choose("claude", "Run tests and validate behavior changes.");
const reviewingAgent = choose("codex", "Review for regressions, spec drift, and correctness.");
const reportingAgent = choose("claude", "Write concise, accurate ticket status reports.");
const finalAgent = choose("claude", "Write the final reply for a completed autonomous workflow run. Follow the task instructions exactly; when asked for an exact reply, output only that.");
const validatorAgent = choose("claude", "Validate that a completed autonomous workflow run actually satisfied the original goal. Be strict, literal, and evidence-driven.");

export default smithers((ctx) => (
  <Workflow name="super-ralph-full">
    <Sequence>
      {/* Step 1: Interpret Config (clarification session already collected by CLI) */}
      <InterpretConfig
        prompt={PROMPT_TEXT}
        clarificationSession={CLARIFICATION_SESSION}
        repoRoot={REPO_ROOT}
        fallbackConfig={FALLBACK_CONFIG}
        packageScripts={PACKAGE_SCRIPTS}
        detectedAgents={{
          claude: HAS_CLAUDE,
          codex: HAS_CODEX,
          gh: false,
        }}
        agent={planningAgent}
      />

      {/* Step 2: Run the finite SuperRalph work loops (skipped for simple replies) */}
      {(ctx.latest("interpret_config", "interpret-config") as any)?.isSimpleReply !== true && (
      <SuperRalph
        ctx={ctx}
        outputs={outputs}
        {...((ctx.latest("interpret_config", "interpret-config") as any) || FALLBACK_CONFIG)}
        maxIterations={MAX_ITERATIONS}
        agents={{
          planning: { agent: planningAgent, description: "Plan and research next tickets.", isScheduler: true },
          implementation: { agent: implementationAgent, description: "Implement with test-driven development and jj workflows." },
          testing: { agent: testingAgent, description: "Run tests and validate behavior changes." },
          reviewing: { agent: reviewingAgent, description: "Review for regressions, spec drift, and correctness." },
          reporting: { agent: reportingAgent, description: "Write concise, accurate ticket status reports." },
        }}
      />
      )}

      {/* Step 3: Final report - produces the reply the CLI prints */}
      <FinalReport
        prompt={PROMPT_TEXT}
        agent={finalAgent}
        output={outputs.final_report}
      />

      {/* Step 4: Completion validation - quiescence is not completion.
          A run that stops without satisfying the original goal must never
          exit 0. valid=false fails loudly: non-zero exit, failed workflow row. */}
      <Ralph
        until={(ctx.latest("completion_validator", "completion-validator") as any)?.valid === true}
        maxIterations={1}
        onMaxReached="fail"
      >
        <CompletionValidator
          prompt={PROMPT_TEXT}
          agent={validatorAgent}
          ctx={ctx}
          output={outputs.completion_validator}
        />
      </Ralph>
    </Sequence>
  </Workflow>
));
