# dff-skills

DesignForFeature CLI that copies packaged skill markdown into the **current project** as `SKILL.md`.

```bash
npx dff-skills encore-mongo
```

Creates:

```text
.agent/skills/encore-mongo/SKILL.md
```

## Install behavior

| Command | Where it installs |
| ------- | ----------------- |
| `npx dff-skills <pack>` | **Only** `.agent/skills/<name>/SKILL.md` |
| `npx dff-skills arch` | Enterprise architecture skill |
| `npx dff-skills figma` | Figma / prototype analysis skill |
| `npx dff-skills <pack> -a cursor` | Cursor skill dirs only |
| `npx dff-skills <pack> -a all` | all supported agents |

Existing `SKILL.md` files are **always replaced**.

### With `-a` / `--agent`

| Agent | Project paths |
| ----- | ------------- |
| `cursor` | `.agents/skills/<name>/`, `.cursor/skills/<name>/` |
| `copilot` | `.agents/skills/<name>/`, `.github/skills/<name>/` |
| `continue` | `.continue/skills/<name>/` |
| `gravity` | `.agents/skills/<name>/`, `.agent/skills/<name>/` |
| `jcode` | `.jcode/skills/<name>/` |

## How it works

Skill sources live in this package under `skills/`:

- `skills/encore-mongo.md`
- `skills/encore-pg.md`
- `skills/next-daisy.md`
- `skills/gluestack.md`
- `skills/arch.md`
- `skills/figma.md`

Running `npx dff-skills <name>` copies that file to `.agent/skills/<name>/SKILL.md`.

## Usage

```bash
# Default → .agent/skills/<name>/SKILL.md
npx dff-skills encore-mongo

# Specific agents
npx dff-skills encore-mongo -a cursor
npx dff-skills gluestack -a cursor -a continue
npx dff-skills encore-mongo -a jcode

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
