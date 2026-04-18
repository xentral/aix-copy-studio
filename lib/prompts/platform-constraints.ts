export const PLATFORM_CONSTRAINTS = {
  linkedin: "Target 80–200 words. Hook in the very first line — no warmup. Short paragraphs (1–2 sentences) with blank lines between. Max 1–2 emoji total, only if organic. No hashtags unless truly integral.",
  x: "Target ≤280 characters for a single tweet OR a 3–5 tweet thread numbered '1/', '2/', '3/'. Hook must land in the first 10 words. No emoji unless essential.",
  slide: "Output two lines: first = slide headline (≤10 words, a claim not a label). Second = supporting sentence (≤20 words). Nothing else.",
  generic: "Target 60–150 words. Clear hook in first line, clear takeaway in last line. One idea, well expressed.",
} as const;

export type Platform = keyof typeof PLATFORM_CONSTRAINTS;
