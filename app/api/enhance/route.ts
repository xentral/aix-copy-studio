import { NextResponse } from "next/server";
import { z } from "zod";
import { enhance } from "@/lib/pipeline";

const Schema = z
  .object({
    draft: z.string().optional(),
    points: z.array(z.string()).optional(),
    voice: z.string(),
    platform: z.enum(["linkedin", "x", "slide", "generic"]),
    frameworks: z.array(z.string()),
    surpriseMe: z.boolean(),
    variantCount: z.number().int().min(1).max(5),
  })
  .refine(d => d.draft || d.points?.length, { message: "draft or points required" })
  .refine(d => d.surpriseMe || d.frameworks.length > 0, {
    message: "frameworks or surpriseMe required",
  });

export async function POST(req: Request) {
  try {
    const body = Schema.parse(await req.json());
    const result = await enhance(body);
    return NextResponse.json(result);
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
