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
  const response = await withRetry(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.3,
      system: SYSTEM,
      messages: [{ role: "user", content: draft }],
    })
  );

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  let text = block.text.trim();
  text = text.replace(/^```(?:json)?\s*|\s*```$/g, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // retry with stricter prompt
    const retry = await withRetry(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        temperature: 0.3,
        system: SYSTEM,
        messages: [
          { role: "user", content: draft },
          { role: "assistant", content: text },
          { role: "user", content: "Return ONLY a JSON array of strings. No markdown. No explanation." },
        ],
      })
    );
    const retryBlock = retry.content[0];
    if (retryBlock.type !== "text") throw new Error("Unexpected response type");
    let retryText = retryBlock.text.trim();
    retryText = retryText.replace(/^```(?:json)?\s*|\s*```$/g, "");
    try {
      parsed = JSON.parse(retryText);
    } catch {
      return [draft];
    }
  }

  if (!Array.isArray(parsed) || !parsed.every(p => typeof p === "string")) {
    return [draft];
  }
  return parsed as string[];
}
