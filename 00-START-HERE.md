# Copy Studio — Handoff Package

Everything you need to build **copy-studio** in a separate Claude account / GitHub account. This folder is self-contained — copy the whole `copy-studio/` folder into your new workspace and you're set.

## What this is

A self-hostable Next.js web app. User pastes a draft (social post, slide text, raw info), picks a voice (brand or thought leader) and optional copy-frameworks, gets N rewritten variants to copy-paste.

- **Separate, shareable OSS repo** (MIT).
- **Runs per-company** via a `config/` folder — swap voices / frameworks / branding per deployment.
- **Deployed on Vercel**, LLM calls via Anthropic SDK with prompt caching on stable parts.

## How to use this handoff in the new account

1. **Start a fresh Claude Code session** in an empty folder: `mkdir ~/dev/copy-studio && cd ~/dev/copy-studio`.
2. **Copy this whole `copy-studio/` handoff folder** into that new workspace (e.g. as `./handoff/`) so Claude can read it.
3. **Prompt Claude Code**:
   > "Read `handoff/00-START-HERE.md` and everything it references. Then build the copy-studio product exactly as specified. Start with `handoff/02-bootstrap.md`."
4. **Provide your own** `ANTHROPIC_API_KEY` in `.env.local` when prompted (or set in Vercel).

## What's in this folder

| File | Purpose |
|---|---|
| `00-START-HERE.md` | This file. Orientation. |
| `01-spec.md` | Full product spec — user flow, UI, API contract, pipeline logic, MVP scope. |
| `02-bootstrap.md` | Exact shell commands to scaffold the Next.js repo + deps + shadcn. |
| `03-prompts.md` | All prompt templates (talking-point extraction, apply-voice, apply-framework, surprise-me picker). |
| `04-architecture.md` | File tree + code sketches for the critical files (routes, config loader, pipeline). |
| `config/company.json` | Per-deployment branding (name, color, default voice). Example = Xentral. |
| `config/voices/xentral-brand.md` | Full Xentral voice card (merged brand-voice skill + writing-style). Ready to ship. |
| `config/voices/benedikt-sauter.md.TODO` | Placeholder. Needs 5–10 writing samples + run of `writing-style-analyzer` skill. |
| `config/frameworks/made-to-stick.md` | SUCCESs framework, formatted for prompt injection. |
| `config/frameworks/seven-plots.md` | Seven Basic Plots framework, formatted for prompt injection. |
| `package.json.template` | Dependency list to paste into `package.json` after `create-next-app`. |

## Build order (for the new Claude Code session)

1. Run bootstrap commands from `02-bootstrap.md`
2. Copy `config/` directory as-is into the new repo
3. Implement files following `04-architecture.md`
4. Use prompts from `03-prompts.md` in `lib/prompts/*.ts`
5. Local test with Xentral voice + Made-to-Stick
6. Deploy to Vercel
7. (Later) Generate `benedikt-sauter.md` persona separately and drop into `config/voices/`

## Non-goals in this handoff

- Not included: actual TypeScript source — Claude Code in the new account writes it following `04-architecture.md`.
- Not included: Benedikt Sauter persona — generate it from real samples (see `scripts/build-persona.md` after repo is built).
- Not included: Logo / visual assets — you provide via `config/company.json`.
