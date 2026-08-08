import fs from "node:fs";
import path from "node:path";

export type SkillPack = {
  /** Alias passed to the CLI (matches skills/<name>.md) */
  name: string;
  /** Absolute path to the source markdown file in this package */
  filePath: string;
};

/** Folder of `*.md` skill sources shipped with the package. */
export function skillsDir(): string {
  return path.join(__dirname, "..", "skills");
}

/**
 * Discover packs from `skills/<name>.md`.
 * Add a new file there (e.g. `encore-mongo.md`) and it becomes
 * available as `npx dff-skills encore-mongo`.
 */
export function listPacks(): SkillPack[] {
  const dir = skillsDir();
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md") && !file.startsWith("."))
    .map((file) => {
      const name = file.slice(0, -".md".length);
      return {
        name,
        filePath: path.join(dir, file),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function resolvePack(alias: string): SkillPack | undefined {
  const key = alias.trim().toLowerCase();
  return listPacks().find((pack) => pack.name.toLowerCase() === key);
}
