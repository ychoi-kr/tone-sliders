import { streamTransform } from "@/lib/providers";
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

function sseLine(obj: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!body.source || typeof body.source !== "string") {
    return new Response(
      JSON.stringify({ error: "source is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  if (!body.model || !body.model.includes("/")) {
    return new Response(
      JSON.stringify({ error: "model must be in 'provider/modelId' form" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const userKeyHeader = request.headers.get("x-user-api-key") ?? undefined;
  const t0 = Date.now();
  const requestedModel = body.model;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const generator = streamTransform({
          source: body.source,
          model: body.model,
          language: body.language ?? "ko",
          speechLevel: body.speechLevel ?? "haeyo",
          axes: body.axes,
          apiKey: userKeyHeader,
          signal: request.signal,
        });

        for await (const event of generator) {
          if (event.type === "done") {
            const tookMs = Date.now() - t0;
            controller.enqueue(sseLine({ ...event, tookMs }));
            console.log(
              `[transform] requested=${requestedModel} routed=${event.meta.provider}/${event.meta.model} baseUrl=${event.meta.baseUrl ?? "-"} took=${tookMs}ms in=${event.usage.inputTokens ?? "-"} out=${event.usage.outputTokens ?? "-"}`,
            );
          } else {
            controller.enqueue(sseLine(event));
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const tookMs = Date.now() - t0;
        controller.enqueue(sseLine({ type: "error", message, tookMs }));
        console.error(
          `[transform] FAILED requested=${requestedModel} took=${tookMs}ms err=${message}`,
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      console.log(`[transform] client cancelled requested=${requestedModel}`);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
