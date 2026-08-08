import os from "node:os";
import path from "node:path";

export type AgentId =
  | "cursor"
  | "copilot"
  | "continue"
  | "gravity"
  | "jcode";

export type AgentTarget = {
  id: AgentId;
  /** CLI aliases accepted for -a / --agent */
  aliases: string[];
  label: string;
  /** Relative project skill roots (under cwd) */
  projectDirs: string[];
  /** Absolute user-level skill roots */
  globalDirs: string[];
};

/**
 * Default install (no `-a`): `.agent/skills/<name>/SKILL.md`
 */
export const DEFAULT_PROJECT_DIR = ".agent/skills";
export const DEFAULT_GLOBAL_DIR = path.join(os.homedir(), ".agent", "skills");
export const SKILL_FILENAME = "SKILL.md";

/**
 * Install targets used only when `-a` / `--agent` is passed.
 * Each root gets `<name>/SKILL.md`.
 */
export const AGENTS: AgentTarget[] = [
  {
    id: "cursor",
    aliases: ["cursor"],
    label: "Cursor",
    projectDirs: [".agents/skills", ".cursor/skills"],
    globalDirs: [path.join(os.homedir(), ".cursor", "skills")],
  },
  {
    id: "copilot",
    aliases: ["copilot", "github-copilot", "gh-copilot"],
    label: "GitHub Copilot",
    projectDirs: [".agents/skills", ".github/skills"],
    globalDirs: [path.join(os.homedir(), ".copilot", "skills")],
  },
  {
    id: "continue",
    aliases: ["continue"],
    label: "Continue",
    projectDirs: [".continue/skills"],
    globalDirs: [path.join(os.homedir(), ".continue", "skills")],
  },
  {
    id: "gravity",
    aliases: ["gravity", "antigravity"],
    label: "Gravity (Antigravity)",
    projectDirs: [".agents/skills", ".agent/skills"],
    globalDirs: [
      path.join(os.homedir(), ".gemini", "antigravity", "skills"),
    ],
  },
  {
    id: "jcode",
    aliases: ["jcode"],
    label: "Jcode",
    projectDirs: [".jcode/skills"],
    globalDirs: [path.join(os.homedir(), ".jcode", "skills")],
  },
];

export function resolveAgents(names: string[]): AgentTarget[] {
  if (names.length === 0) {
    return [];
  }

  const selected: AgentTarget[] = [];
  const seen = new Set<AgentId>();

  for (const raw of names) {
    const key = raw.trim().toLowerCase();
    if (key === "all" || key === "*") {
      return [...AGENTS];
    }

    const match = AGENTS.find(
      (agent) => agent.id === key || agent.aliases.includes(key)
    );

    if (!match) {
      const known = AGENTS.flatMap((a) => [a.id, ...a.aliases]).join(", ");
      throw new Error(`Unknown agent "${raw}". Supported: ${known}`);
    }

    if (!seen.has(match.id)) {
      seen.add(match.id);
      selected.push(match);
    }
  }

  return selected;
}

/**
 * Skill root directories for install.
 * - No `-a`: only `.agent/skills`
 * - With `-a`: only the selected agent skill roots
 */
export function skillRootsFor(
  agents: AgentTarget[],
  options: { global?: boolean; cwd?: string }
): string[] {
  const cwd = options.cwd ?? process.cwd();

  if (agents.length === 0) {
    return [
      options.global ? DEFAULT_GLOBAL_DIR : path.join(cwd, DEFAULT_PROJECT_DIR),
    ];
  }

  const roots = new Set<string>();

  for (const agent of agents) {
    if (options.global) {
      for (const dir of agent.globalDirs) {
        roots.add(dir);
      }
    } else {
      for (const dir of agent.projectDirs) {
        roots.add(path.join(cwd, dir));
      }
    }
  }

  return [...roots];
}
