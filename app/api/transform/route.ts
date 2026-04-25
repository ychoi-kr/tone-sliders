import { NextResponse } from "next/server";
import { transform } from "@/lib/providers";
import type {
  AxesValues,
  Language,
  ModelId,
  SpeechLevel,
} from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  source: string;
  model: ModelId;
  language: Language;
  speechLevel: SpeechLevel;
  axes: AxesValues;
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.source || typeof body.source !== "string") {
    return NextResponse.json({ error: "source is required" }, { status: 400 });
  }
  if (!body.model || !body.model.includes("/")) {
    return NextResponse.json(
      { error: "model must be in 'provider/modelId' form" },
      { status: 400 },
    );
  }

  const userKeyHeader = request.headers.get("x-user-api-key") ?? undefined;

  const t0 = Date.now();
  try {
    const result = await transform({
      source: body.source,
      model: body.model,
      language: body.language ?? "ko",
      speechLevel: body.speechLevel ?? "haeyo",
      axes: body.axes,
      apiKey: userKeyHeader,
    });
    const tookMs = Date.now() - t0;
    console.log(
      `[transform] requested=${body.model} routed=${result.meta?.provider}/${result.meta?.model} baseUrl=${result.meta?.baseUrl ?? "-"} took=${tookMs}ms in=${result.inputTokens ?? "-"} out=${result.outputTokens ?? "-"}`,
    );
    return NextResponse.json({ ...result, tookMs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const tookMs = Date.now() - t0;
    console.error(
      `[transform] FAILED requested=${body.model} took=${tookMs}ms err=${message}`,
    );
    return NextResponse.json({ error: message, tookMs }, { status: 500 });
  }
}
