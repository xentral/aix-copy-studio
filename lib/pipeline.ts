import { loadVoice, loadFrameworks } from "./config";
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
    : (req.draft ?? "");

  const plan: Array<{ primary: string; secondary?: string; plotHint?: string }> = [];
  for (let i = 0; i < req.variantCount; i++) {
    if (req.surpriseMe) {
      plan.push(pickSurpriseFramework(allKeys));
    } else {
      const key = req.frameworks[i % req.frameworks.length];
      plan.push({
        primary: key,
        plotHint: key === "seven-plots" ? randomPlot() : undefined,
      });
    }
  }

  const results = await Promise.allSettled(
    plan.map(async (p, idx) => {
      const primaryFramework = allFrameworks.find(f => f.key === p.primary);
      if (!primaryFramework) throw new Error(`Framework not found: ${p.primary}`);
      const secondaryFramework = p.secondary
        ? allFrameworks.find(f => f.key === p.secondary)
        : undefined;

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
      const combined = secondaryFramework
        ? `${frameworkLabel} + ${secondaryFramework.name}`
        : frameworkLabel;

      return {
        id: `v${idx}-${Date.now()}`,
        text,
        appliedVoice: voice.name,
        appliedFramework: combined,
        appliedFrameworkKey: p.primary,
      } as Variant;
    })
  );

  results
    .filter(r => r.status === "rejected")
    .forEach(r => console.error("Variant generation failed:", (r as PromiseRejectedResult).reason));

  const variants = results
    .filter((r): r is PromiseFulfilledResult<Variant> => r.status === "fulfilled")
    .map(r => r.value);

  return { variants };
}

function randomPlot() {
  const plots = [
    "Overcoming the Monster",
    "Rags to Riches",
    "The Quest",
    "Voyage and Return",
    "Comedy",
    "Rebirth",
  ];
  return plots[Math.floor(Math.random() * plots.length)];
}
