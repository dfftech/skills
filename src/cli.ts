#!/usr/bin/env node
import { AGENTS, DEFAULT_PROJECT_DIR, SKILL_FILENAME } from "./agents";
import { installPack } from "./install";
import { listPacks, resolvePack, skillsDir } from "./registry";

const HELP = `
dff-skills — copy packaged skill markdown into the current project as SKILL.md

Usage:
  npx dff-skills <pack> [pack...] [options]
  npx dff-skills list
  npx dff-skills help

Examples:
  npx dff-skills encore-mongo
  npx dff-skills encore-pg
  npx dff-skills encore-mongo -a cursor
  npx dff-skills gluestack -a cursor -a copilot
  npx dff-skills encore-mongo -a all

Options:
  -a, --agent <name>   Install for specific agent(s) only
                       (repeatable or comma-separated).
                       Without -a: installs only to .agent/SKILL.md
  -g, --global         Install into user-level dirs
  -h, --help           Show help
  -l, --list           List available packs

Default (no -a):
  .agent/SKILL.md

Agents (-a) — each gets SKILL.md directly (no subfolders):
  cursor     .agents/SKILL.md + .cursor/SKILL.md
  copilot    .agents/SKILL.md + .github/SKILL.md
  continue   .continue/SKILL.md
  gravity    .agents/SKILL.md + .agent/SKILL.md  (alias: antigravity)
  all        all agents above

Existing SKILL.md files are always replaced.
`.trim();

async function main(argv: string[]): Promise<void> {
  const { packs, global, agents, showHelp, showList } = parseArgs(argv);

  if (showHelp || (packs.length === 0 && !showList)) {
    console.log(HELP);
    console.log("\nAvailable packs:");
    printPackList();
    if (packs.length === 0 && !showHelp) {
      process.exitCode = 1;
    }
    return;
  }

  if (showList) {
    printPackList();
    return;
  }

  const unknown = packs.filter((name) => !resolvePack(name));
  if (unknown.length > 0) {
    console.error(`Unknown pack(s): ${unknown.join(", ")}`);
    console.error(`Add skills/<name>.md under ${skillsDir()}`);
    console.error("Run `npx dff-skills list` to see available packs.");
    process.exitCode = 1;
    return;
  }

  for (const name of packs) {
    const pack = resolvePack(name)!;
    const { targets, agents: installedAgents, usedDefault } = installPack(
      pack,
      { global, agents }
    );
    const scope = usedDefault
      ? `${DEFAULT_PROJECT_DIR}/${SKILL_FILENAME}`
      : installedAgents.map((a) => a.id).join(", ");
    const replacedCount = targets.filter((t) => t.replaced).length;
    console.log(
      `✓ ${pack.name} → ${targets.length} location(s) [${scope}]` +
        (replacedCount > 0 ? ` (${replacedCount} replaced)` : "")
    );
    for (const target of targets) {
      const tag = target.replaced ? "replaced" : "created";
      console.log(`    [${tag}] ${target.targetFile}`);
    }
  }

  console.log("\nDone.");
}

function parseArgs(argv: string[]): {
  packs: string[];
  global: boolean;
  agents: string[];
  showHelp: boolean;
  showList: boolean;
} {
  const packs: string[] = [];
  const agents: string[] = [];
  let global = false;
  let showHelp = false;
  let showList = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help" || arg === "help") {
      showHelp = true;
      continue;
    }
    if (arg === "-l" || arg === "--list" || arg === "list") {
      showList = true;
      continue;
    }
    if (arg === "-g" || arg === "--global") {
      global = true;
      continue;
    }
    if (arg === "-a" || arg === "--agent") {
      const value = argv[++i];
      if (!value) {
        throw new Error(`${arg} requires a value`);
      }
      agents.push(
        ...value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      );
      continue;
    }
    if (arg.startsWith("--agent=")) {
      agents.push(
        ...arg
          .slice("--agent=".length)
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      );
      continue;
    }
    if (arg.startsWith("-")) {
      console.error(`Unknown option: ${arg}`);
      showHelp = true;
      continue;
    }
    packs.push(arg);
  }

  return { packs, global, agents, showHelp, showList };
}

function printPackList(): void {
  const packs = listPacks();
  if (packs.length === 0) {
    console.log("  (none) — add .md files under skills/");
    return;
  }
  for (const pack of packs) {
    console.log(`  ${pack.name}`);
  }
  console.log(`\nDefault (no -a): ${DEFAULT_PROJECT_DIR}/${SKILL_FILENAME}`);
  console.log("Agents (-a):");
  for (const agent of AGENTS) {
    console.log(`  ${agent.id.padEnd(10)} ${agent.label}`);
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nError: ${message}`);
  process.exitCode = 1;
});
