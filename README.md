# dff-skills

DesignForFeature CLI that copies packaged skill markdown into the **current project** as a direct `SKILL.md` file (no pack subfolders).

```bash
npx dff-skills encore-mongo
```

Creates:

```text
.agent/SKILL.md
```

## Install behavior

| Command | Where it installs |
| ------- | ----------------- |
| `npx dff-skills <pack>` | **Only** `.agent/SKILL.md` |
| `npx dff-skills <pack> -a cursor` | `.agents/SKILL.md` + `.cursor/SKILL.md` |
| `npx dff-skills <pack> -a all` | all supported agent dirs |

Existing `SKILL.md` files are **always replaced**.

### With `-a` / `--agent`

| Agent | Project files |
| ----- | ------------- |
| `cursor` | `.agents/SKILL.md`, `.cursor/SKILL.md` |
| `copilot` | `.agents/SKILL.md`, `.github/SKILL.md` |
| `continue` | `.continue/SKILL.md` |
| `gravity` | `.agents/SKILL.md`, `.agent/SKILL.md` |

## How it works

Skill sources live in this package under `skills/`:

- `skills/encore-mongo.md`
- `skills/encore-pg.md`
- `skills/next-daisy.md`
- `skills/gluestack.md`

The chosen pack content is written as `SKILL.md` in the target folder (not `skills/<pack>/SKILL.md`).

## Usage

```bash
# Default → .agent/SKILL.md
npx dff-skills encore-mongo

# Specific agents
npx dff-skills encore-mongo -a cursor
npx dff-skills gluestack -a cursor -a continue

# All agents
npx dff-skills encore-mongo -a all

# List packs
npx dff-skills list
```

## Publish (maintainers)

```bash
npm run build
npm publish
```

Ensure `NPM_TOKEN` is set (see `.npmrc`).

## License

MIT © DesignForFeature
