import { anthropic, MODEL, withRetry } from "@/lib/anthropic";
import { PLATFORM_CONSTRAINTS } from "./platform-constraints";
import type { ContentCard } from "@/lib/config";
import type { Platform } from "./platform-constraints";

export type ApplyInput = {
  voice: ContentCard;
  framework: ContentCard;
  extraFramework?: ContentCard;
  platform: Platform;
  inputBody: string;
  plotHint?: string;
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

  const response = await withRetry(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.8,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `# VOICE CARD\n\n${input.voice.content}`,
              cache_control: { type: "ephemeral" },
            },
            {
              type: "text",
              text: frameworkText,
              cache_control: { type: "ephemeral" },
            },
            {
              type: "text",
              text: `# PLATFORM CONSTRAINTS\n\n${PLATFORM_CONSTRAINTS[input.platform]}`,
            },
            {
              type: "text",
              text: `# INPUT TO REWRITE\n\n${input.inputBody}\n\n---\n\nWrite ONE version applying the voice card + framework + platform constraints. Output only the rewritten copy.`,
            },
          ],
        },
      ],
    })
  );

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text.trim();
}
