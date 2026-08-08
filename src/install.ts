import fs from "node:fs";
import path from "node:path";
import {
  SKILL_FILENAME,
  resolveAgents,
  skillRootsFor,
  type AgentId,
  type AgentTarget,
} from "./agents";
import type { SkillPack } from "./registry";

export type InstallOptions = {
  /** Install into user-level agent skill dirs instead of the project */
  global?: boolean;
  cwd?: string;
  /**
   * Agent ids/aliases from `-a`.
   * Empty / omitted → install only to `.agent/skills/<name>/SKILL.md`.
   */
  agents?: string[];
};

export type InstallTarget = {
  targetDir: string;
  targetFile: string;
  /** True when an existing SKILL.md was overwritten */
  replaced: boolean;
};

export type InstallResult = {
  targets: InstallTarget[];
  agents: AgentTarget[];
  /** True when no `-a` was passed (default `.agent/skills` only) */
  usedDefault: boolean;
};

/**
 * Copy `skills/<name>.md` to `<root>/<name>/SKILL.md`.
 * Existing SKILL.md files are always replaced.
 */
export function installPack(
  pack: SkillPack,
  options: InstallOptions = {}
): InstallResult {
  if (!fs.existsSync(pack.filePath)) {
    throw new Error(`Skill file not found: ${pack.filePath}`);
  }

  const agentNames = options.agents ?? [];
  const agents = resolveAgents(agentNames);
  const usedDefault = agentNames.length === 0;
  const roots = skillRootsFor(agents, {
    global: options.global,
    cwd: options.cwd,
  });

  const content = fs.readFileSync(pack.filePath);
  const targets: InstallTarget[] = [];

  for (const root of roots) {
    const targetDir = path.join(root, pack.name);
    const targetFile = path.join(targetDir, SKILL_FILENAME);
    const replaced = fs.existsSync(targetFile);

    fs.mkdirSync(targetDir, { recursive: true });

    if (replaced) {
      fs.rmSync(targetFile, { force: true });
    }

    fs.writeFileSync(targetFile, content);

    targets.push({ targetDir, targetFile, replaced });
  }

  return { targets, agents, usedDefault };
}

export type { AgentId, AgentTarget };
