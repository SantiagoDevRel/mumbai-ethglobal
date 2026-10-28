// Facts the AI-tools slides (A1-A4) show, in one place. Every list here was read from its source on
// October 28, 2026; the slides derive their counts from these lists, so a recount means editing a
// list, never a number in the copy.
//
// - MCP: tools/list, prompts/list and resources/list on https://mcp.arkiv.network/ (General 2.0.1).
//   /mumbai answered 404 that day, so the slides point at the General URL.
// - Plugin: the installed arkiv@arkiv 0.4.1 (plugin.json, .mcp.json, hooks/hooks.json, skills/,
//   evals/catalog.json, scripts/client-headers.mjs) and the Arkiv-Network/ai-plugin README.
// - Plugin components: the "Standard layout" table of Claude Code's plugin manifest reference, plus
//   evals/ (experimental.evals).
// - Skills: skills/ of the plugin and Arkiv-Network/skills on main (which also keeps the deprecated
//   arkiv-best-practices stub, left out here).

export const FACTS_CHECKED = "October 28, 2026";

export const MCP_HOST = "mcp.arkiv.network";
export const MCP_URL = "https://mcp.arkiv.network/";

/** tools/list, in the server's order. The slides show four of them by name. */
export const MCP_TOOLS = [
  "server_status",
  "search_knowledge",
  "read_knowledge",
  "list_knowledge",
  "network_status",
  "list_packages",
  "get_package",
  "list_skills",
  "get_skill",
  "get_workflow",
  "submit_feedback",
  "report_outcome",
  "generate_entity_model",
  "verify_entity",
  "verify_tx",
] as const;

/** prompts/list, in the server's order. */
export const MCP_PROMPTS = ["start", "prepare_feedback", "minimal_app", "integrate_package", "model_entities", "diagnose_query", "apply_skill"] as const;

/** resources/list grouped by URI prefix: official 202 · skills 45 · packages 27 · guides 11 +
 * cookbook 7 · sdk 12 + official-source 6 + docs 4. */
export const MCP_DOCUMENTS: [label: string, count: number][] = [
  ["Official doc pages", 202],
  ["Skill files", 45],
  ["Package files", 27],
  ["Guides and recipes", 18],
  ["SDK source and other sources", 22],
];

export const mcpDocumentCount = () => MCP_DOCUMENTS.reduce((sum, [, n]) => sum + n, 0);

export const PLUGIN_VERSION = "0.4.1";

export const INSTALL = {
  claude: {
    label: "Claude Code",
    lines: ["claude plugin marketplace add Arkiv-Network/ai-plugin", "claude plugin install arkiv@arkiv"],
    note: "# restart Claude Code, then start with:",
    start: "> /arkiv:arkiv",
    mcp: `claude mcp add --transport http arkiv ${MCP_URL}`,
  },
  codex: {
    label: "Codex CLI",
    lines: ["codex plugin marketplace add Arkiv-Network/ai-plugin", "codex plugin add arkiv@arkiv"],
    note: "# new session, trust its hook in /hooks, then:",
    start: "> $arkiv",
    mcp: `codex mcp add arkiv --url ${MCP_URL}`,
  },
} as const;

export type Host = keyof typeof INSTALL;

/** The router plus the task skills, by the group they help with. */
export const ROUTER = "arkiv";
export const SKILL_GROUPS: { name: string; skills: string[] }[] = [
  { name: "Start here", skills: ["arkiv-first-write", "arkiv-mcp"] },
  { name: "Model your data", skills: ["arkiv-data-modeling", "arkiv-social-graph"] },
  { name: "Write and change", skills: ["arkiv-entity-lifecycle", "arkiv-entity-expiration", "arkiv-write-safety"] },
  { name: "Read your data", skills: ["arkiv-query", "arkiv-indexing"] },
  { name: "Build your app", skills: ["arkiv-app-integration", "arkiv-large-files"] },
  { name: "Privacy and trust", skills: ["arkiv-encryption", "arkiv-security-trust"] },
  { name: "When it breaks", skills: ["arkiv-troubleshooting", "arkiv-feedback"] },
];

export const TASK_SKILLS = SKILL_GROUPS.flatMap((g) => g.skills);
export const ALL_SKILLS = [ROUTER, ...TASK_SKILLS];

/** skills/arkiv-query/SKILL.md, as installed with plugin 0.4.1 and on Arkiv-Network/skills main. */
export const QUERY_SKILL = {
  id: "arkiv-query",
  description: "Read Arkiv entities with the SDK select builder or…",
  sdkRange: ">=0.8.1 <0.9",
  verified: "2026-10-08",
  h1: "Query a consistent set of Arkiv entities",
  sections: [
    "When to use",
    "Rules that change the result",
    "Worked all-page read with bounded recovery",
    "Predicates and raw literals",
    "Counts and historical reads",
    "Empty result and errors",
    "References",
  ],
  references: ["references/json-rpc.md"],
};

/** evals/catalog.json of plugin 0.4.1, grouped by what the cases test. */
export const EVAL_GROUPS: [count: number, name: string, what: string][] = [
  [48, "Skills", "fires on time, stays quiet, right answer"],
  [12, "Project rules", "with and without"],
  [4, "Plugin behavior", "MCP status, intake"],
  [4, "Entity lifecycle", "patch, transfer"],
  [3, "Adversarial", "keys, RPC URL, payload"],
  [2, "Edge cases", "SDK mismatch, encrypted + expiring"],
];

/** hooks/hooks.json of each 0.4.1 package. Codex has no file or folder events and no rules hook. */
export const CLAUDE_HOOK_EVENTS = ["SessionStart", "UserPromptSubmit", "FileChanged", "CwdChanged", "PostCompact", "SessionEnd"] as const;
export const CODEX_HOOK_EVENTS = ["SessionStart", "UserPromptSubmit", "PostCompact", "SessionEnd"] as const;

export const evalCaseCount = () => EVAL_GROUPS.reduce((sum, [n]) => sum + n, 0);

/** The rules block the SessionStart hook adds (templates/AGENTS.snippet.md). */
export const PROJECT_RULE_COUNT = 5;
