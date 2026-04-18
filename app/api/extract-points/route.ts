import { NextResponse } from "next/server";
import { z } from "zod";
import { extractTalkingPoints } from "@/lib/prompts/talking-points";

const Schema = z.object({ draft: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const { draft } = Schema.parse(await req.json());
    const points = await extractTalkingPoints(draft);
    return NextResponse.json({ points });
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "extraction failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
