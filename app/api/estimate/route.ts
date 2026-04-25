import { NextResponse } from "next/server";
import {
  buildEstimateUserMessage,
  EstimateParseError,
  ESTIMATE_PROMPT_VERSION,
  getCachedEstimate,
  makeCacheKey,
  parseEstimateJson,
  setCachedEstimate,
  ESTIMATE_SYSTEM_PROMPT,
} from "@/lib/estimate";
import { DEFAULT_ESTIMATE_MODEL, type Language, type ModelId } from "@/lib/models";
import { callProviderJson } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  source: string;
  language?: Language;
  model?: ModelId;
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

  const language = body.language ?? "ko";
  const model = body.model ?? DEFAULT_ESTIMATE_MODEL;
  const cacheKey = makeCacheKey(body.source, model, language);
  const cached = getCachedEstimate(cacheKey);
  if (cached) {
    return NextResponse.json({
      ...cached,
      promptVersion: ESTIMATE_PROMPT_VERSION,
      fromCache: true,
      model,
    });
  }

  const userKeyHeader = request.headers.get("x-user-api-key") ?? undefined;
  const t0 = Date.now();
  try {
    const raw = await callProviderJson({
      modelId: model,
      systemPrompt: ESTIMATE_SYSTEM_PROMPT,
      userMessage: buildEstimateUserMessage(body.source, language),
      apiKey: userKeyHeader,
      signal: request.signal,
    });
    const result = parseEstimateJson(raw);
    setCachedEstimate(cacheKey, result);
    const tookMs = Date.now() - t0;
    console.log(
      `[estimate] model=${model} lang=${language} took=${tookMs}ms axes=${JSON.stringify(result.axes)} speech=${result.speechLevel}`,
    );
    return NextResponse.json({
      ...result,
      promptVersion: ESTIMATE_PROMPT_VERSION,
      fromCache: false,
      model,
      tookMs,
    });
  } catch (err) {
    const tookMs = Date.now() - t0;
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = err instanceof EstimateParseError ? 502 : 500;
    console.error(
      `[estimate] FAILED model=${model} took=${tookMs}ms err=${message}`,
    );
    return NextResponse.json({ error: message, tookMs }, { status });
  }
}
