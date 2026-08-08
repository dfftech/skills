export {
  AGENTS,
  DEFAULT_GLOBAL_DIR,
  DEFAULT_PROJECT_DIR,
  SKILL_FILENAME,
  resolveAgents,
  skillRootsFor,
  type AgentId,
  type AgentTarget,
} from "./agents";
export {
  listPacks,
  resolvePack,
  skillsDir,
  type SkillPack,
} from "./registry";
export {
  installPack,
  type InstallOptions,
  type InstallResult,
  type InstallTarget,
} from "./install";
