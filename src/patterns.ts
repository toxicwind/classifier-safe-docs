/**
 * Shared pattern table for classifier-safe-docs.
 * Single source of truth for the 5 trigger classes.
 * csd-scan, csd-repair, and csd-verify all import from here.
 */

export type TriggerClass =
  | "bypass-stats"
  | "named-technique"
  | "narrative"
  | "imperative"
  | "theory";

export interface TriggerPattern {
  /** Machine-readable class id */
  cls: TriggerClass;
  /** Human-readable label */
  label: string;
  /** Regexes that match this class (case-insensitive) */
  patterns: RegExp[];
  /** Safe-shape rewrite guidance */
  safeShape: string;
}

export const TRIGGER_PATTERNS: TriggerPattern[] = [
  {
    cls: "bypass-stats",
    label: "Bypass statistics",
    patterns: [
      /\b\d{1,3}\s*%\s*(success|successful)?\s*(bypass|bypassing|jailbreak|evasion)/i,
      /\b(bypass|jailbreak|evasion)\s*(success\s*)?(rate|rates)\s*(of\s*)?\d/i,
      /\b(cuts?|reduces?|drops?)\s+(refusal|block)\s+rates?\s+to\s+\d/i,
      /\b\d{1,3}\s*%\s*(of\s*)?(guardrails|safety\s*filters|classifiers)\s*(bypassed|evaded)/i,
    ],
    safeShape:
      "Delete the statistic. Cite your own observed incidents instead " +
      '(e.g. "the pip disk-full at 2% used"). Your incident log beats cited ' +
      "bypass research and does not flag.",
  },
  {
    cls: "named-technique",
    label: "Named circumvention technique",
    patterns: [
      /\babliteration\b/i,
      /\bDAN(\s|-)?(mode|style|prompt|jailbreak)?\b/i,
      /\b(jailbreak|jail-breaking)\s+(prompt|technique|method|framework)\b/i,
      /\bprompt\s+(injection|leak|extraction)\s+(technique|method|attack)\b/i,
      /\b(refusal|refuse)[\s-](direction|vector)\b/i,
    ],
    safeShape:
      "Delete the technique name. Describe the concrete operational step " +
      "in behavioral language instead of naming the circumvention method.",
  },
  {
    cls: "narrative",
    label: "Circumvention narrative",
    patterns: [
      /\bforced\s+(onto|to\s+use)\s+(open[\s-]?weight|uncensored|unfiltered)/i,
      /\b(had\s+to|needed\s+to)\s+(work\s+around|bypass|circumvent|evade)\s+(the\s+)?(filter|guardrail|safety|classifier)/i,
      /\bworking\s+around\s+(the\s+)?(safety|content)\s+(filter|policy)/i,
      /\bevading\s+(detection|the\s+classifier|guardrails)/i,
    ],
    safeShape:
      "Rewrite as the concrete action taken: what was retried, re-routed, " +
      "or rewritten — not the story of defeating a filter.",
  },
  {
    cls: "imperative",
    label: "Direct adversarial imperative",
    patterns: [
      /\bignore\s+(the\s+)?(safety|content)\s+(classifier|filter|policy|guardrail)/i,
      /\bdisregard\s+(the\s+)?(safety|refusal)/i,
      /\btreat\s+refusals?\s+as\s+(red\s+herrings?|noise|irrelevant)/i,
      /\bnever\s+accept\s+(a\s+|the\s+)?(refusal|block)\s+as\s+(the\s+)?final\s+word/i,
      /\bdo\s+not\s+(let|allow)\s+(the\s+)?(classifier|filter|guardrail)\s+stop\s+you/i,
      /\bact\s+with\s+(zero|no)\s+approval/i,
    ],
    safeShape:
      "Say what to DO (check ps/ss/curl/logs, classify the failure by " +
      "observed type, retry once against new evidence, re-route the task) " +
      "not what to disregard.",
  },
  {
    cls: "theory",
    label: "Anti-safety theory",
    patterns: [
      /\ba\s+perfect\s+classifier\s+is\s+impossible/i,
      /\b(censorship|filtering|moderation)\s+is\s+undecidable/i,
      /\brefusals?\s+are\s+a\s+failure\s+mode\s+of\s+RLHF/i,
      /\bsafety\s+(alignment|training)\s+is\s+(fundamentally\s+)?(broken|futile|impossible)/i,
      /\bno\s+(filter|classifier|guardrail)\s+can\s+(ever\s+)?(work|succeed)/i,
    ],
    safeShape:
      "Delete. The operational point never needed the theory. If a claim " +
      "about classifier limits is load-bearing, restate it as an observed " +
      "incident, not a general principle.",
  },
];

export interface Match {
  cls: TriggerClass;
  label: string;
  line: number;
  excerpt: string;
}

/**
 * Scan text for all 5 trigger classes.
 * Returns matches as {cls, label, line, excerpt}.
 */
export function scanText(text: string, path = "<input>"): Match[] {
  const matches: Match[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const tp of TRIGGER_PATTERNS) {
      for (const re of tp.patterns) {
        // Reset lastIndex for global-safe reuse (patterns are not global, but be safe)
        re.lastIndex = 0;
        if (re.test(line)) {
          matches.push({
            cls: tp.cls,
            label: tp.label,
            line: i + 1,
            excerpt: line.trim().slice(0, 120),
          });
          break; // one hit per class per line is enough
        }
      }
    }
  }
  return matches;
}

/**
 * Format a match as `path:line:class: excerpt`.
 */
export function formatMatch(path: string, m: Match): string {
  return `${path}:${m.line}:${m.cls}: ${m.excerpt}`;
}
