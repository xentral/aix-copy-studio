import { NextResponse } from "next/server";
import { loadVoices, loadFrameworks, loadCompany } from "@/lib/config";

export async function GET() {
  try {
    const [voices, frameworks, company] = await Promise.all([
      loadVoices(),
      loadFrameworks(),
      loadCompany(),
    ]);
    return NextResponse.json({
      voices: voices.map(v => ({ key: v.key, name: v.name })),
      frameworks: frameworks.map(f => ({ key: f.key, name: f.name })),
      defaultVoice: company.defaultVoice,
      defaultPlatform: company.defaultPlatform,
    });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ error: "config load failed" }, { status: 500 });
  }
}
