import os from "node:os";
import path from "node:path";

export type AgentId = "cursor" | "copilot" | "continue" | "gravity";

export type AgentTarget = {
  id: AgentId;
  /** CLI aliases accepted for -a / --agent */
  aliases: string[];
  label: string;
  /** Relative project dirs that receive SKILL.md directly */
  projectDirs: string[];
  /** Absolute user-level dirs that receive SKILL.md directly */
  globalDirs: string[];
};

/**
 * Default install (no `-a`): `.agent/SKILL.md` (no subfolders).
 */
export const DEFAULT_PROJECT_DIR = ".agent";
export const DEFAULT_GLOBAL_DIR = path.join(os.homedir(), ".agent");
export const SKILL_FILENAME = "SKILL.md";

/**
 * Install targets used only when `-a` / `--agent` is passed.
 * Each dir gets a SKILL.md file directly (no pack subfolder).
 */
export const AGENTS: AgentTarget[] = [
  {
    id: "cursor",
    aliases: ["cursor"],
    label: "Cursor",
    projectDirs: [".agents", ".cursor"],
    globalDirs: [path.join(os.homedir(), ".cursor")],
  },
  {
    id: "copilot",
    aliases: ["copilot", "github-copilot", "gh-copilot"],
    label: "GitHub Copilot",
    projectDirs: [".agents", ".github"],
    globalDirs: [path.join(os.homedir(), ".copilot")],
  },
  {
    id: "continue",
    aliases: ["continue"],
    label: "Continue",
    projectDirs: [".continue"],
    globalDirs: [path.join(os.homedir(), ".continue")],
  },
  {
    id: "gravity",
    aliases: ["gravity", "antigravity"],
    label: "Gravity (Antigravity)",
    projectDirs: [".agents", ".agent"],
    globalDirs: [path.join(os.homedir(), ".gemini", "antigravity")],
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
 * Directories that receive SKILL.md.
 * - No `-a`: only `.agent`
 * - With `-a`: only the selected agent dirs
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
