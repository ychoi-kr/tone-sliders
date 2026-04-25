import { streamTransform } from "@/lib/providers";
import {
  STATIC_MODELS,
  DEFAULT_AXES,
  DEFAULT_LANGUAGE,
  DEFAULT_SPEECH_LEVEL_KO,
  type AxesValues,
  type Language,
  type ModelId,
  type SpeechLevel,
} from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AXIS_KEYS = [
  "register",
  "authorPresence",
  "rhetorical",
  "anthropomorphism",
  "assertion",
] as const satisfies readonly (keyof AxesValues)[];

const VALID_LANGS: readonly Language[] = ["ko", "en", "ja", "zh-CN"];
const VALID_SPEECH: readonly SpeechLevel[] = [
  "haera",
  "haeyo",
  "hapsho",
  "hae",
  "default",
];
const MAX_SOURCE_CHARS = 10000;
const PROMPT_VERSION = "transform-v2";

const ALLOWED_QUERY_KEYS = new Set<string>([
  ...AXIS_KEYS,
  "speech",
  "lang",
  "model",
  "stream",
]);

interface ApiError {
  code: string;
  message: string;
  hint?: string;
}

function errorResponse(status: number, err: ApiError): Response {
  return new Response(JSON.stringify({ error: err }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET() {
  const schema = {
    method: "POST",
    description:
      "Transform text by tone-sliders coordinates. All settings are query params; the source text goes in the JSON body.",
    queryParams: {
      register: { type: "integer", range: [0, 10], default: 5 },
      authorPresence: { type: "integer", range: [0, 10], default: 5 },
      rhetorical: { type: "integer", range: [0, 10], default: 5 },
      anthropomorphism: { type: "integer", range: [0, 10], default: 5 },
      assertion: { type: "integer", range: [0, 10], default: 5 },
      lang: {
        type: "enum",
        values: VALID_LANGS,
        default: DEFAULT_LANGUAGE,
      },
      speech: {
        type: "enum",
        values: VALID_SPEECH,
        default: `${DEFAULT_SPEECH_LEVEL_KO} (ko only; ignored otherwise)`,
      },
      model: {
        type: "string",
        required: true,
        hint: "See GET /api/v1/models for the current catalog.",
      },
      stream: {
        type: "boolean",
        default: false,
        description: "When true, response is SSE (text/event-stream).",
      },
    },
    headers: {
      "X-Provider-Key": {
        optional: true,
        description:
          "Provider API key. Overrides server-side env. Required if server env has no key for the chosen provider.",
      },
    },
    body: {
      text: {
        type: "string",
        required: true,
        maxLength: MAX_SOURCE_CHARS,
      },
    },
    responses: {
      "200 (default)": {
        contentType: "application/json",
        shape: {
          result: "string",
          settings: "echo of resolved query params",
          promptVersion: PROMPT_VERSION,
          usage: { inputTokens: "number?", outputTokens: "number?", tookMs: "number" },
        },
      },
      "200 (?stream=true)": {
        contentType: "text/event-stream",
        events: [
          '{ "type": "delta", "text": "..." }',
          '{ "type": "done", "meta": {...}, "usage": {...}, "tookMs": N, "settings": {...}, "promptVersion": "..." }',
          '{ "type": "error", "message": "..." }',
        ],
      },
      "4xx / 5xx": {
        contentType: "application/json",
        shape: { error: { code: "string", message: "string", hint: "string?" } },
        codes: [
          "invalid_json",
          "missing_text",
          "text_too_long",
          "missing_model",
          "model_not_found",
          "invalid_axis_value",
          "unknown_axis",
          "invalid_lang",
          "invalid_speech_for_lang",
          "provider_error",
        ],
      },
    },
    example: {
      curl: `curl -X POST 'http://localhost:3000/api/v1/transform?register=5&assertion=7&lang=ko&speech=haera&model=anthropic/claude-haiku-4-5-20251001' -H 'Content-Type: application/json' -d '{"text":"여기에 원문..."}'`,
    },
  };
  return new Response(JSON.stringify(schema, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  for (const key of params.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      return errorResponse(400, {
        code: "unknown_axis",
        message: `Unknown query parameter: ${key}`,
        hint: `Allowed: ${[...ALLOWED_QUERY_KEYS].join(", ")}`,
      });
    }
  }

  const axes: AxesValues = { ...DEFAULT_AXES };
  for (const key of AXIS_KEYS) {
    const raw = params.get(key);
    if (raw === null) continue;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 10) {
      return errorResponse(400, {
        code: "invalid_axis_value",
        message: `Axis "${key}" must be an integer in [0, 10]; got "${raw}"`,
      });
    }
    axes[key] = n;
  }

  const langParam = params.get("lang") ?? DEFAULT_LANGUAGE;
  if (!VALID_LANGS.includes(langParam as Language)) {
    return errorResponse(400, {
      code: "invalid_lang",
      message: `lang must be one of: ${VALID_LANGS.join(", ")}; got "${langParam}"`,
    });
  }
  const language = langParam as Language;

  const speechRaw =
    params.get("speech") ??
    (language === "ko" ? DEFAULT_SPEECH_LEVEL_KO : "default");
  if (!VALID_SPEECH.includes(speechRaw as SpeechLevel)) {
    return errorResponse(400, {
      code: "invalid_speech_for_lang",
      message: `speech must be one of: ${VALID_SPEECH.join(", ")}; got "${speechRaw}"`,
    });
  }
  const speechLevel = (
    language === "ko" ? speechRaw : "default"
  ) as SpeechLevel;

  const modelParam = params.get("model");
  if (!modelParam) {
    return errorResponse(400, {
      code: "missing_model",
      message: "Query parameter 'model' is required.",
      hint: "See GET /api/v1/models for the current catalog.",
    });
  }
  const knownModelIds = new Set<string>(STATIC_MODELS.map((m) => m.id));
  if (!knownModelIds.has(modelParam)) {
    return errorResponse(404, {
      code: "model_not_found",
      message: `Unknown model id: ${modelParam}`,
      hint: "See GET /api/v1/models for the current catalog.",
    });
  }
  const model = modelParam as ModelId;

  const wantStream = params.get("stream") === "true";

  let body: { text?: unknown };
  try {
    body = (await request.json()) as { text?: unknown };
  } catch {
    return errorResponse(400, {
      code: "invalid_json",
      message: "Request body must be valid JSON.",
      hint: 'Expected body: { "text": "<source string>" }. GET /api/v1/transform returns full schema.',
    });
  }
  if (typeof body.text !== "string" || body.text.length === 0) {
    return errorResponse(400, {
      code: "missing_text",
      message: "Body must include non-empty 'text' string.",
      hint: 'Expected body: { "text": "<source string>" }. GET /api/v1/transform returns full schema.',
    });
  }
  if (body.text.length > MAX_SOURCE_CHARS) {
    return errorResponse(400, {
      code: "text_too_long",
      message: `text exceeds max length (${MAX_SOURCE_CHARS} chars); got ${body.text.length}.`,
    });
  }
  const text = body.text;

  const userKey = request.headers.get("x-provider-key") ?? undefined;
  const t0 = Date.now();
  const settings = { axes, speech: speechLevel, lang: language, model };

  if (wantStream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamTransform({
            source: text,
            model,
            language,
            speechLevel,
            axes,
            apiKey: userKey,
            signal: request.signal,
          })) {
            const payload =
              event.type === "done"
                ? {
                    ...event,
                    tookMs: Date.now() - t0,
                    settings,
                    promptVersion: PROMPT_VERSION,
                  }
                : event;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
            );
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
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

  let result = "";
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let providerError: string | null = null;

  try {
    for await (const event of streamTransform({
      source: text,
      model,
      language,
      speechLevel,
      axes,
      apiKey: userKey,
      signal: request.signal,
    })) {
      if (event.type === "delta") {
        result += event.text;
      } else if (event.type === "done") {
        inputTokens = event.usage.inputTokens;
        outputTokens = event.usage.outputTokens;
      } else if (event.type === "error") {
        providerError = event.message;
      }
    }
  } catch (err) {
    providerError = err instanceof Error ? err.message : "Unknown error";
  }

  const tookMs = Date.now() - t0;

  if (providerError) {
    console.error(
      `[v1/transform] FAILED model=${model} took=${tookMs}ms err=${providerError}`,
    );
    return errorResponse(502, {
      code: "provider_error",
      message: providerError,
    });
  }

  console.log(
    `[v1/transform] model=${model} took=${tookMs}ms in=${inputTokens ?? "-"} out=${outputTokens ?? "-"}`,
  );

  return new Response(
    JSON.stringify({
      result,
      settings,
      promptVersion: PROMPT_VERSION,
      usage: { inputTokens, outputTokens, tookMs },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
