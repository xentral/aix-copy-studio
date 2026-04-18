# Copy Studio — Prompt Templates

All prompts the product uses at runtime. Paste into `lib/prompts/*.ts` as exported template functions.

---

## 1. Talking Points Extraction (`lib/prompts/talking-points.ts`)

Used when draft is long (>~2000 chars) to distill into structured points before variant generation.

### System prompt

```
You extract high-value talking points from long content. Given an input (article, transcript, memo, raw notes), output a clean list of the strongest, most post-ready points.

Rules:
- Each point is ONE self-contained sentence.
- No fluff, no meta ("This article discusses…"). Just the claim, insight, or fact.
- Deduplicate. Merge overlapping points.
- Preserve specific numbers, names, and examples when present — these are high-value.
- Target 5–12 points. Prefer fewer strong points over many weak ones.
- Output ONLY a JSON array of strings. No prose, no preamble, no markdown fences.
```

### User message template

```
{DRAFT}
```

(Just the raw draft — no wrapper.)

### Response parsing

- Expect a JSON array of strings.
- Strip markdown fences if model wraps output in ```json ... ```.
- `JSON.parse` and validate each element is a string.
- If parse fails, retry once with a stricter reminder, then fall back to treating the whole draft as one giant point.

### Model & params

- `claude-sonnet-4-6`
- `max_tokens: 1024`
- `temperature: 0.3` (deterministic extraction)

---

## 2. Apply Voice + Framework (`lib/prompts/apply-voice.ts` combined with `apply-framework.ts`)

Used once per variant. Single Anthropic call that combines voice card, framework, platform constraints, and input content.

### System prompt

```
You rewrite draft content into polished, ready-to-publish copy.

You MUST apply:
1. The VOICE CARD — governs tone, vocabulary, syntax, structural rules. Non-negotiable.
2. The FRAMEWORK — governs the narrative/persuasive structure.
3. The PLATFORM CONSTRAINTS — governs length and format.

Output ONLY the rewritten copy. No preamble. No "Here's your post:". No explanation of what you did. No markdown code fences. Just the copy itself, ready to paste.
```

### User messages (cached prefix + dynamic input)

Build the message as an array of content blocks with caching on the stable parts:

```ts
messages: [{
  role: "user",
  content: [
    {
      type: "text",
      text: `# VOICE CARD\n\n${voiceCardContent}`,
      cache_control: { type: "ephemeral" }
    },
    {
      type: "text",
      text: `# FRAMEWORK\n\n${frameworkContent}`,
      cache_control: { type: "ephemeral" }
    },
    {
      type: "text",
      text: `# PLATFORM CONSTRAINTS\n\n${platformConstraints}`
    },
    {
      type: "text",
      text: `# INPUT TO REWRITE\n\n${inputBody}\n\n---\n\nWrite ONE version applying the voice card + framework + platform constraints. Output only the rewritten copy.`
    }
  ]
}]
```

### Platform constraint strings

Export from `lib/prompts/platform-constraints.ts`:

```ts
export const PLATFORM_CONSTRAINTS: Record<string, string> = {
  linkedin: "Target 80–200 words. Hook in the very first line — no warmup. Short paragraphs (1–2 sentences) with blank lines between. Max 1–2 emoji total, only if organic. No hashtags unless truly integral.",
  x: "Target ≤280 characters for a single tweet OR a 3–5 tweet thread numbered '1/', '2/', '3/'. Hook must land in the first 10 words. No emoji unless essential.",
  slide: "Output two lines: first = slide headline (≤10 words, a claim not a label). Second = supporting sentence (≤20 words). Nothing else.",
  generic: "Target 60–150 words. Clear hook in first line, clear takeaway in last line. One idea, well expressed."
};
```

### When surprise-me picks a plot sub-type for Seven Plots

If the chosen framework key is `seven-plots`, append a sub-hint to the framework content to nudge the model toward a specific plot (helps make variants distinct):

```ts
const plots = [
  "Overcoming the Monster",
  "Rags to Riches",
  "The Quest",
  "Voyage and Return",
  "Comedy",
  "Tragedy",     // use sparingly — only for cautionary content
  "Rebirth"
];
const chosenPlot = plots[Math.floor(Math.random() * plots.length)];
frameworkContent += `\n\n---\n**For this variant, use specifically the "${chosenPlot}" plot from the framework.**`;
```

Then set `appliedFramework = "Seven Plots: ${chosenPlot}"` in the response metadata.

For Made-to-Stick you can optionally bias toward one dimension, but it's not required — the model handles the framework holistically.

### Model & params

- `claude-sonnet-4-6`
- `max_tokens: 1024`
- `temperature: 0.8` — variation across variants matters more than determinism here

---

## 3. Surprise Me — framework picker (`lib/prompts/surprise-me.ts`)

Pure logic, no LLM call. Picks a framework per variant.

```ts
export function pickSurpriseFramework(
  availableKeys: string[]  // e.g. ["made-to-stick", "seven-plots"]
): { key: string; combine?: string } {
  // 20% chance of combining two frameworks (if more than one available)
  if (availableKeys.length >= 2 && Math.random() < 0.2) {
    const shuffled = [...availableKeys].sort(() => Math.random() - 0.5);
    return { key: shuffled[0], combine: shuffled[1] };
  }
  return { key: availableKeys[Math.floor(Math.random() * availableKeys.length)] };
}
```

If `combine` is set, concatenate both framework files in the prompt with a note: "Apply both frameworks simultaneously — find the synthesis."

---

## 4. Prompt caching strategy

Voice cards and framework files are **stable across many requests**. Anthropic prompt caching (`cache_control: { type: "ephemeral" }`) keeps them hot for 5 minutes (default) with massive cost/latency wins when generating 3–5 variants back-to-back.

Rules:
- Put VOICE first, FRAMEWORK second, both marked ephemeral.
- Keep PLATFORM_CONSTRAINTS small (not worth caching — ~50 tokens).
- The dynamic INPUT comes last, uncached.

Expected hit rate: ~80% (first variant primes cache, 2nd-5th variants hit it).

---

## 5. Error & retry patterns

- On 529 (overloaded) or 5xx: retry once with 500ms backoff.
- On 400 (input too large): truncate VOICE card to first 3000 chars, retry.
- On malformed JSON (from talking-points): retry once with prompt addendum "Return ONLY a JSON array of strings. No markdown. No explanation."
- On final failure: return the variant with `error: "generation failed"` instead of crashing the whole request.
