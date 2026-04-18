# Copy Studio — Architecture & Code Sketches

File tree + minimal code sketches for every critical file. Claude Code in the new account can implement from these directly.

## File tree

```
copy-studio/
├── README.md
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.example
├── .env.local                           # gitignored
├── .gitignore
├── LICENSE                              # MIT
├── app/
│   ├── layout.tsx                       # loads company.json, sets <title>, favicon, CSS var for primary color
│   ├── page.tsx                         # main UI — client component, wires panels together
│   ├── globals.css
│   └── api/
│       ├── extract-points/
│       │   └── route.ts
│       └── enhance/
│           └── route.ts
├── lib/
│   ├── config.ts                        # loads & lists config/
│   ├── anthropic.ts                     # client factory, retry wrapper
│   ├── pipeline.ts                      # orchestration for /api/enhance
│   └── prompts/
│       ├── talking-points.ts
│       ├── apply.ts                     # the single apply-voice-and-framework call
│       ├── platform-constraints.ts
│       └── surprise-me.ts
├── components/
│   ├── DraftInput.tsx
│   ├── ConfigPanel.tsx
│   ├── VariantCard.tsx
│   ├── TalkingPointsPanel.tsx
│   └── ui/                              # shadcn components, auto-generated
├── config/
│   ├── company.json
│   ├── voices/
│   │   └── xentral-brand.md
│   └── frameworks/
│       ├── made-to-stick.md
│       └── seven-plots.md
└── scripts/
    └── build-persona.md                 # how to generate new voice files
```

---

## `lib/config.ts`

```ts
import fs from "node:fs/promises";
import path from "node:path";

const CONFIG_DIR = path.join(process.cwd(), "config");

export type CompanyConfig = {
  name: string;
  logoUrl?: string;
  primaryColor: string;
  defaultVoice: string;
  defaultPlatform: "linkedin" | "x" | "slide" | "generic";
};

export type ContentCard = {
  key: string;          // filename without .md
  name: string;         // first "# " heading, fallback to key
  content: string;      // full file content (injected into prompts verbatim)
};

export async function loadCompany(): Promise<CompanyConfig> {
  const raw = await fs.readFile(path.join(CONFIG_DIR, "company.json"), "utf-8");
  return JSON.parse(raw);
}

async function loadCardsFromDir(subdir: "voices" | "frameworks"): Promise<ContentCard[]> {
  const dir = path.join(CONFIG_DIR, subdir);
  const files = (await fs.readdir(dir)).filter(f => f.endsWith(".md"));
  return Promise.all(files.map(async f => {
    const content = await fs.readFile(path.join(dir, f), "utf-8");
    const key = f.replace(/\.md$/, "");
    const headingMatch = content.match(/^#\s+(.+)$/m);
    return { key, name: headingMatch?.[1] ?? key, content };
  }));
}

export const loadVoices = () => loadCardsFromDir("voices");
export const loadFrameworks = () => loadCardsFromDir("frameworks");

export async function loadVoice(key: string): Promise<ContentCard> {
  // whitelist check against directory listing to prevent path traversal
  const all = await loadVoices();
  const match = all.find(v => v.key === key);
  if (!match) throw new Error(`Unknown voice: ${key}`);
  return match;
}

export async function loadFramework(key: string): Promise<ContentCard> {
  const all = await loadFrameworks();
  const match = all.find(f => f.key === key);
  if (!match) throw new Error(`Unknown framework: ${key}`);
  return match;
}
```

---

## `lib/anthropic.ts`

```ts
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const MODEL = "claude-sonnet-4-6";

export async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e: any) {
      lastErr = e;
      const retriable = e?.status === 529 || (e?.status >= 500 && e?.status < 600);
      if (!retriable || i === attempts - 1) throw e;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}
```

---

## `lib/prompts/apply.ts`

```ts
import { anthropic, MODEL, withRetry } from "@/lib/anthropic";
import { PLATFORM_CONSTRAINTS } from "./platform-constraints";
import type { ContentCard } from "@/lib/config";

export type ApplyInput = {
  voice: ContentCard;
  framework: ContentCard;           // primary framework
  extraFramework?: ContentCard;     // optional combine (surprise me 20%)
  platform: keyof typeof PLATFORM_CONSTRAINTS;
  inputBody: string;                // either raw draft or joined talking points
  plotHint?: string;                // e.g. "Overcoming the Monster" for seven-plots
};

const SYSTEM = `You rewrite draft content into polished, ready-to-publish copy.

You MUST apply:
1. The VOICE CARD — governs tone, vocabulary, syntax, structural rules. Non-negotiable.
2. The FRAMEWORK — governs the narrative/persuasive structure.
3. The PLATFORM CONSTRAINTS — governs length and format.

Output ONLY the rewritten copy. No preamble. No "Here's your post:". No explanation. No markdown code fences. Just the copy itself, ready to paste.`;

export async function applyVoiceAndFramework(input: ApplyInput): Promise<string> {
  let frameworkText = `# FRAMEWORK\n\n${input.framework.content}`;
  if (input.extraFramework) {
    frameworkText += `\n\n---\n\n# SECOND FRAMEWORK (apply both simultaneously — find the synthesis)\n\n${input.extraFramework.content}`;
  }
  if (input.plotHint) {
    frameworkText += `\n\n---\n**For this variant, use specifically the "${input.plotHint}" plot from the framework.**`;
  }

  const response = await withRetry(() => anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0.8,
    system: SYSTEM,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: `# VOICE CARD\n\n${input.voice.content}`, cache_control: { type: "ephemeral" } },
        { type: "text", text: frameworkText, cache_control: { type: "ephemeral" } },
        { type: "text", text: `# PLATFORM CONSTRAINTS\n\n${PLATFORM_CONSTRAINTS[input.platform]}` },
        { type: "text", text: `# INPUT TO REWRITE\n\n${input.inputBody}\n\n---\n\nWrite ONE version applying the voice card + framework + platform constraints. Output only the rewritten copy.` }
      ]
    }]
  }));

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text.trim();
}
```

---

## `lib/prompts/talking-points.ts`

```ts
import { anthropic, MODEL, withRetry } from "@/lib/anthropic";

const SYSTEM = `You extract high-value talking points from long content. Given an input (article, transcript, memo, raw notes), output a clean list of the strongest, most post-ready points.

Rules:
- Each point is ONE self-contained sentence.
- No fluff, no meta. Just the claim, insight, or fact.
- Deduplicate. Merge overlapping points.
- Preserve specific numbers, names, and examples.
- Target 5–12 points.
- Output ONLY a JSON array of strings. No prose, no preamble, no markdown fences.`;

export async function extractTalkingPoints(draft: string): Promise<string[]> {
  const response = await withRetry(() => anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0.3,
    system: SYSTEM,
    messages: [{ role: "user", content: draft }]
  }));

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  let text = block.text.trim();
  // strip markdown fences if present
  text = text.replace(/^```(?:json)?\s*|\s*```$/g, "");
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed) || !parsed.every(p => typeof p === "string")) {
    throw new Error("Invalid talking-points response");
  }
  return parsed;
}
```

---

## `lib/prompts/platform-constraints.ts`

```ts
export const PLATFORM_CONSTRAINTS = {
  linkedin: "Target 80–200 words. Hook in the very first line — no warmup. Short paragraphs (1–2 sentences) with blank lines between. Max 1–2 emoji total, only if organic. No hashtags unless truly integral.",
  x: "Target ≤280 characters for a single tweet OR a 3–5 tweet thread numbered '1/', '2/', '3/'. Hook must land in the first 10 words. No emoji unless essential.",
  slide: "Output two lines: first = slide headline (≤10 words, a claim not a label). Second = supporting sentence (≤20 words). Nothing else.",
  generic: "Target 60–150 words. Clear hook in first line, clear takeaway in last line. One idea, well expressed.",
} as const;

export type Platform = keyof typeof PLATFORM_CONSTRAINTS;
```

---

## `lib/prompts/surprise-me.ts`

```ts
const SEVEN_PLOTS = [
  "Overcoming the Monster",
  "Rags to Riches",
  "The Quest",
  "Voyage and Return",
  "Comedy",
  "Rebirth",
  // Tragedy omitted from default pool — too grim for most use cases
] as const;

export function pickSurpriseFramework(availableKeys: string[]) {
  const combine = availableKeys.length >= 2 && Math.random() < 0.2;
  const shuffled = [...availableKeys].sort(() => Math.random() - 0.5);
  const primary = shuffled[0];
  const secondary = combine ? shuffled[1] : undefined;
  const plotHint = primary === "seven-plots"
    ? SEVEN_PLOTS[Math.floor(Math.random() * SEVEN_PLOTS.length)]
    : undefined;
  return { primary, secondary, plotHint };
}
```

---

## `lib/pipeline.ts`

```ts
import { loadVoice, loadFramework, loadFrameworks } from "./config";
import { applyVoiceAndFramework } from "./prompts/apply";
import { pickSurpriseFramework } from "./prompts/surprise-me";
import type { Platform } from "./prompts/platform-constraints";

export type EnhanceRequest = {
  draft?: string;
  points?: string[];
  voice: string;
  platform: Platform;
  frameworks: string[];
  surpriseMe: boolean;
  variantCount: number;
};

export type Variant = {
  id: string;
  text: string;
  appliedVoice: string;
  appliedFramework: string;
  appliedFrameworkKey: string;
};

export async function enhance(req: EnhanceRequest): Promise<{ variants: Variant[] }> {
  const voice = await loadVoice(req.voice);
  const allFrameworks = await loadFrameworks();
  const allKeys = allFrameworks.map(f => f.key);

  const inputBody = req.points?.length
    ? req.points.map((p, i) => `${i + 1}. ${p}`).join("\n")
    : req.draft ?? "";

  // Build variant plan
  const plan: Array<{ primary: string; secondary?: string; plotHint?: string }> = [];
  for (let i = 0; i < req.variantCount; i++) {
    if (req.surpriseMe) {
      plan.push(pickSurpriseFramework(allKeys));
    } else {
      const key = req.frameworks[i % req.frameworks.length];
      plan.push({
        primary: key,
        plotHint: key === "seven-plots" ? randomPlot() : undefined
      });
    }
  }

  const results = await Promise.allSettled(plan.map(async (p, idx) => {
    const primaryFramework = allFrameworks.find(f => f.key === p.primary)!;
    const secondaryFramework = p.secondary ? allFrameworks.find(f => f.key === p.secondary) : undefined;
    const text = await applyVoiceAndFramework({
      voice,
      framework: primaryFramework,
      extraFramework: secondaryFramework,
      platform: req.platform,
      inputBody,
      plotHint: p.plotHint,
    });
    const frameworkLabel = p.plotHint
      ? `${primaryFramework.name}: ${p.plotHint}`
      : primaryFramework.name;
    const combined = secondaryFramework ? `${frameworkLabel} + ${secondaryFramework.name}` : frameworkLabel;
    return {
      id: `v${idx}-${Date.now()}`,
      text,
      appliedVoice: voice.name,
      appliedFramework: combined,
      appliedFrameworkKey: p.primary,
    } as Variant;
  }));

  const variants = results
    .filter((r): r is PromiseFulfilledResult<Variant> => r.status === "fulfilled")
    .map(r => r.value);

  // Log failures server-side
  results.filter(r => r.status === "rejected").forEach((r: any) =>
    console.error("Variant generation failed:", r.reason)
  );

  return { variants };
}

function randomPlot() {
  const plots = ["Overcoming the Monster", "Rags to Riches", "The Quest", "Voyage and Return", "Comedy", "Rebirth"];
  return plots[Math.floor(Math.random() * plots.length)];
}
```

---

## `app/api/enhance/route.ts`

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { enhance } from "@/lib/pipeline";

const Schema = z.object({
  draft: z.string().optional(),
  points: z.array(z.string()).optional(),
  voice: z.string(),
  platform: z.enum(["linkedin", "x", "slide", "generic"]),
  frameworks: z.array(z.string()),
  surpriseMe: z.boolean(),
  variantCount: z.number().int().min(1).max(5),
}).refine(d => d.draft || d.points?.length, { message: "draft or points required" })
  .refine(d => d.surpriseMe || d.frameworks.length > 0, { message: "frameworks or surpriseMe required" });

export async function POST(req: Request) {
  try {
    const body = Schema.parse(await req.json());
    const result = await enhance(body);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message ?? "unknown error" }, { status: 400 });
  }
}
```

---

## `app/api/extract-points/route.ts`

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { extractTalkingPoints } from "@/lib/prompts/talking-points";

const Schema = z.object({ draft: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const { draft } = Schema.parse(await req.json());
    const points = await extractTalkingPoints(draft);
    return NextResponse.json({ points });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message ?? "extraction failed" }, { status: 400 });
  }
}
```

---

## `app/layout.tsx` (branding from config)

```ts
import { loadCompany } from "@/lib/config";
import "./globals.css";

export async function generateMetadata() {
  const company = await loadCompany();
  return { title: company.name };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const company = await loadCompany();
  return (
    <html lang="en">
      <body style={{ "--primary-color": company.primaryColor } as React.CSSProperties}>
        {children}
      </body>
    </html>
  );
}
```

---

## `app/page.tsx` — high-level shape

Client component. Structure:

```tsx
"use client";
export default function Page() {
  // State: draft, extractedPoints, voice, platform, variantCount, frameworks, surpriseMe, variants, loading
  // Handlers:
  //   - onDraftChange: debounce; if length > 2000, trigger /api/extract-points
  //   - onGenerate: POST /api/enhance with current config
  //   - onRegenerate(id): re-run single variant
  //   - onCopy(id): navigator.clipboard.writeText
  //
  // Layout: grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 p-6
  // Left: <DraftInput />, <TalkingPointsPanel /> if extractedPoints, <VariantCard /> list
  // Right: <ConfigPanel /> (sticky)
}
```

Load available voices + frameworks via a server action or a `/api/config` GET endpoint (simple addition: `app/api/config/route.ts` returns `{ voices: [{key,name}], frameworks: [{key,name}] }`).

---

## Components — signatures only (shadcn-styled internals)

```tsx
// DraftInput.tsx
export function DraftInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // <Textarea /> with auto-grow, placeholder "Paste your draft, slide text, or raw notes here…"
}

// ConfigPanel.tsx
export function ConfigPanel(props: {
  voices: { key: string; name: string }[];
  frameworks: { key: string; name: string }[];
  value: ConfigValue;   // { voice, platform, variantCount, frameworks, surpriseMe }
  onChange: (v: ConfigValue) => void;
  onGenerate: () => void;
  loading: boolean;
}) { /* Select, Slider, Checkboxes, Switch, Button */ }

// VariantCard.tsx
export function VariantCard({ variant, onCopy, onRegenerate }: {
  variant: Variant;
  onCopy: () => void;
  onRegenerate: () => void;
}) { /* Card with text, Badge for voice+framework, two IconButtons */ }

// TalkingPointsPanel.tsx
export function TalkingPointsPanel({ points }: { points: string[] }) {
  // Collapsible. Header: "Extracted talking points (used for variants)". Body: ordered list.
}
```

---

## `scripts/build-persona.md`

```markdown
# Building a Thought-Leader Voice

When a user wants a new voice beyond the built-in ones:

1. Collect 5–10 writing samples from the person:
   - LinkedIn posts (copy-paste raw text)
   - Interview transcripts
   - Blog posts
   - Slack/email excerpts (if permitted)

2. In any Claude Code session, invoke:
   `/anthropic-skills:writing-style-analyzer`

   Paste all samples. Ask for: "Produce a reusable Style Card for the product 'copy-studio'."

3. Save the output as `config/voices/<slug>.md` in the copy-studio repo:
   - First line must be `# <Display Name>` (shown in the app's voice dropdown)
   - Rest is the style card content (tone, vocab, syntax rules, hooks, what to avoid)

4. Restart dev server — new voice appears automatically.

Pro tip: match the structure of `config/voices/xentral-brand.md` for consistency (but the product doesn't enforce a schema — any markdown works).
```
