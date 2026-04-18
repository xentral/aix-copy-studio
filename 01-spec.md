# Copy Studio — Product Spec

## Product in one sentence

A web tool where you paste a draft, pick a voice and optional copy-framework, and get N rewritten variants ready to copy into LinkedIn / X / slides.

## User flow

1. User lands on single-screen app.
2. Pastes draft text into left panel (textarea, auto-grow).
3. Configures in right panel:
   - **Voice**: dropdown auto-populated from `config/voices/*.md` (e.g. "Xentral Brand", "Benedikt Sauter").
   - **Platform**: LinkedIn / X / Slide / Generic.
   - **Variant count**: slider 1–5.
   - **Frameworks**: multi-select checkboxes (Made-to-Stick, Seven Plots).
   - **Surprise Me**: toggle — if on, ignores framework checkboxes and picks randomly per variant.
4. Clicks "Generate".
5. Right panel shows N variant cards, each with:
   - Rewritten copy.
   - Meta-badge: applied voice + framework ("Xentral Brand · Made-to-Stick" / "Xentral Brand · Seven Plots: Overcoming the Monster").
   - Copy-to-clipboard button.
   - Regenerate button (re-runs that single card).
6. If draft is long (>500 words), an expandable "Extracted talking points" panel appears above the variants showing the structured points the variants were built from.

## UI specifics

- **Layout**: Two-column desktop, single-column mobile. Sticky config panel on scroll.
- **Styling**: Clean, product-grade. Use shadcn/ui primitives. Apply Xentral brand colors (dark blue primary `#1E3A5F` or similar — check Xentral brand guidelines for exact; fallback: neutral slate). Load branding from `config/company.json`.
- **Copy feedback**: Click "Copy" → button morphs to "Copied ✓" for 1.5s.
- **Loading state**: Skeleton cards while variants stream in. Variants appear one-by-one as each completes (Promise.allSettled + streaming if possible, but MVP can wait for all).
- **Errors**: Inline per-card error if a variant fails; rest still render.
- **Empty state**: Placeholder text in draft area: "Paste your draft, slide text, or raw notes here…"

## API Contract

### `POST /api/extract-points`

```ts
// Request
{ draft: string }

// Response
{ points: string[] }  // flat list of talking points, each ~1 sentence
```

Triggered automatically by the frontend when `draft.length > 2000` chars (≈500 words). UI shows extracted points; the variants pipeline uses these instead of raw draft.

### `POST /api/enhance`

```ts
// Request
{
  draft: string,                    // OR points if preprocessed
  points?: string[],                // optional, from extract-points
  voice: string,                    // matches filename in config/voices/ (without .md)
  platform: "linkedin" | "x" | "slide" | "generic",
  frameworks: string[],             // e.g. ["made-to-stick", "seven-plots"]. Ignored if surpriseMe.
  surpriseMe: boolean,
  variantCount: number              // 1..5
}

// Response
{
  variants: Array<{
    id: string,
    text: string,
    appliedVoice: string,            // "Xentral Brand"
    appliedFramework: string,        // "Made-to-Stick" or "Seven Plots: Overcoming the Monster"
    appliedFrameworkKey: string      // "made-to-stick" | "seven-plots"
  }>
}
```

### `POST /api/regenerate` (optional for MVP — or reuse `/api/enhance` with count=1)

## Pipeline logic (server-side)

```
Input: { draft | points, voice, platform, frameworks, surpriseMe, variantCount }

1. If input has only draft and draft is long → call talking-points extractor
   (frontend already does this; server accepts either).

2. Load voice card: read config/voices/{voice}.md (validated path, whitelist by listing config dir).
3. Load all framework cards: read config/frameworks/*.md.

4. Build variant plan — array of { frameworkKey } of length variantCount:
   - If surpriseMe: for each slot, random pick from all available frameworks (weighted equal).
     Optionally 20% chance of combining 2 frameworks ("Made-to-Stick + Overcoming the Monster").
   - Else: round-robin through user-selected frameworks.

5. For each plan entry, build an Anthropic request:
   - model: claude-sonnet-4-6
   - system: "You rewrite draft content into polished social/marketing copy. Follow the VOICE and FRAMEWORK below exactly."
   - messages[0].content = [
       { type: "text", text: VOICE_CARD_CONTENT, cache_control: { type: "ephemeral" } },
       { type: "text", text: FRAMEWORK_CONTENT, cache_control: { type: "ephemeral" } },
       { type: "text", text: PLATFORM_CONSTRAINTS },
       { type: "text", text: "DRAFT OR TALKING POINTS:\n" + inputBody + "\n\nWrite ONE version. Output only the rewritten copy — no preamble, no explanation, no meta." }
     ]
   - max_tokens: 1024
   - Use prompt caching: VOICE_CARD + FRAMEWORK are the stable prefix (reused across variants in same request AND across requests within 5min TTL).

6. Run all requests via Promise.allSettled (parallel).
7. Return variants array; include failures as { error } entries OR filter out (MVP: filter, log server-side).
```

## Platform constraints (PLATFORM_CONSTRAINTS block)

Injected into the prompt per platform:

- **linkedin**: "Platform: LinkedIn. Target 80–200 words. Hook in first line. Short paragraphs (1–2 sentences). Max 1–2 emoji, only if organic. No hashtags unless integral."
- **x**: "Platform: X/Twitter. Target ≤280 characters OR a thread of 3–5 tweets numbered 1/ 2/ etc. Hook hard — no warmup."
- **slide**: "Platform: Slide headline + one supporting sentence. Headline ≤10 words, a claim not a label. Supporting ≤20 words."
- **generic**: "Platform: Generic social post. Target 60–150 words. Clear hook, clear takeaway."

## MVP feature scope (must-have)

- ✅ Paste draft → get variants
- ✅ Voice dropdown from config
- ✅ Platform selector (LinkedIn, X, Slide, Generic)
- ✅ 1–5 variants, generated in parallel
- ✅ Framework multi-select + Surprise Me toggle
- ✅ Auto talking-points extraction for long drafts
- ✅ Copy-to-clipboard per variant
- ✅ Regenerate single variant
- ✅ shadcn/ui + Tailwind styling, Xentral-branded by default
- ✅ Config-driven: drop new voice = new dropdown option, no code change

## Post-MVP (explicit non-goals for V1)

- ❌ Auth / multi-user
- ❌ History / persistence
- ❌ File upload (PDF, DOCX)
- ❌ Image generation
- ❌ Direct posting to LinkedIn / X
- ❌ Analytics / tracking

## Config schema

### `config/company.json`

```json
{
  "name": "Xentral Copy Studio",
  "logoUrl": "/logo.svg",
  "primaryColor": "#1E3A5F",
  "defaultVoice": "xentral-brand",
  "defaultPlatform": "linkedin"
}
```

### `config/voices/*.md`

Freeform markdown. The entire file content is injected verbatim as the VOICE_CARD in the prompt. Filename (without .md) is the key. First `# ` heading is the human-readable name shown in the dropdown (fallback: filename).

### `config/frameworks/*.md`

Freeform markdown. The entire file content is injected verbatim as the FRAMEWORK block. Filename is the key. First `# ` heading is the human-readable name.

## Multi-tenant test

To prove the config-driven design works: clone the repo to a second directory, replace `config/` entirely (new `company.json`, different voices, different frameworks), `npm run dev` — app should show the new tenant with zero code changes.
