# Copy Studio — Bootstrap Commands

Exact sequence to scaffold the new repo. Run in an empty directory.

## 1. Scaffold Next.js

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --eslint \
  --src-dir=false \
  --import-alias="@/*" \
  --no-turbopack
```

Answer prompts:
- TypeScript: Yes
- ESLint: Yes
- Tailwind: Yes
- `src/` directory: No
- App Router: Yes
- Turbopack: No (more stable for MVP)
- Import alias: `@/*`

## 2. Install runtime deps

```bash
npm install @anthropic-ai/sdk zod
npm install -D @types/node
```

## 3. Initialize shadcn/ui

```bash
npx shadcn@latest init
```

Answer prompts:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Then add the components we need:

```bash
npx shadcn@latest add button card textarea select slider checkbox switch label badge skeleton dropdown-menu
```

## 4. Create the directory skeleton

```bash
mkdir -p app/api/enhance app/api/extract-points
mkdir -p lib/prompts
mkdir -p components
mkdir -p config/voices config/frameworks
mkdir -p scripts
```

## 5. Copy config/ from handoff

```bash
# assuming handoff/ is the handoff folder
cp -r handoff/config/* config/
```

Verify:
- `config/company.json` exists
- `config/voices/xentral-brand.md` exists
- `config/frameworks/made-to-stick.md` and `seven-plots.md` exist

## 6. Create `.env.local`

```bash
cat > .env.local <<'EOF'
ANTHROPIC_API_KEY=sk-ant-...your-key...
EOF
```

Also create `.env.example` for the repo:

```bash
cat > .env.example <<'EOF'
ANTHROPIC_API_KEY=
EOF
```

Add `.env.local` to `.gitignore` (create-next-app already does this — verify).

## 7. Add `.nvmrc` (optional but recommended)

```bash
node -v > .nvmrc  # pins to current Node version
```

## 8. Install project

```bash
npm install
```

## 9. Smoke test — does the blank Next.js app run?

```bash
npm run dev
```

Open `http://localhost:3000`. Should see the default Next.js page. Kill with Ctrl-C.

## 10. Implement

Follow `04-architecture.md`. Order:

1. `lib/config.ts` — config loader
2. `lib/anthropic.ts` — SDK client
3. `lib/prompts/*.ts` — paste from `03-prompts.md`
4. `lib/pipeline.ts` — orchestration
5. `app/api/extract-points/route.ts`
6. `app/api/enhance/route.ts`
7. `components/DraftInput.tsx`, `ConfigPanel.tsx`, `VariantCard.tsx`
8. `app/page.tsx` — wire it all together
9. `app/layout.tsx` — apply branding from `config/company.json`

## 11. First local test

Paste a short Xentral-relevant draft (e.g. "Wir haben ein neues AI-Feature gelauncht, das dir hilft, Bestellungen schneller zu bearbeiten."), pick Xentral Brand + Made-to-Stick + 3 variants + LinkedIn → should return 3 on-brand LinkedIn-style posts.

## 12. Git

```bash
git init
git add .
git commit -m "Initial copy-studio scaffold"
```

Create a new empty GitHub repo (via `gh repo create` or web UI), then:

```bash
git remote add origin <url>
git branch -M main
git push -u origin main
```

## 13. Deploy to Vercel

```bash
npm install -g vercel  # if not installed
vercel  # interactive, choose new project
```

Then set env var:

```bash
vercel env add ANTHROPIC_API_KEY  # paste key when prompted, select Production + Preview
vercel --prod
```

## 14. README (write last, after it works)

Covers: what it is, local dev, how to customize `config/` for a new tenant, how to add a new voice, how to add a new framework, how to deploy.
