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
  key: string;
  name: string;
  content: string;
};

export async function loadCompany(): Promise<CompanyConfig> {
  const raw = await fs.readFile(path.join(CONFIG_DIR, "company.json"), "utf-8");
  return JSON.parse(raw);
}

async function loadCardsFromDir(subdir: "voices" | "frameworks"): Promise<ContentCard[]> {
  const dir = path.join(CONFIG_DIR, subdir);
  const files = (await fs.readdir(dir)).filter(f => f.endsWith(".md"));
  return Promise.all(
    files.map(async f => {
      const content = await fs.readFile(path.join(dir, f), "utf-8");
      const key = f.replace(/\.md$/, "");
      const headingMatch = content.match(/^#\s+(.+)$/m);
      return { key, name: headingMatch?.[1]?.trim() ?? key, content };
    })
  );
}

export const loadVoices = () => loadCardsFromDir("voices");
export const loadFrameworks = () => loadCardsFromDir("frameworks");

export async function loadVoice(key: string): Promise<ContentCard> {
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
