import OpenAI from "openai";
import { parseModelId, type ProviderId } from "../models";
import { TRANSFORM_SYSTEM_PROMPT, buildUserMessage } from "../prompt";
import type { TransformEvent, TransformRequest } from "./types";

interface ProviderConfig {
  baseURL: string;
  apiKey: string;
}

function resolveProviderConfig(
  provider: ProviderId,
  override?: string,
): ProviderConfig {
  switch (provider) {
    case "openai": {
      const apiKey = override ?? process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
      return { baseURL: "https://api.openai.com/v1", apiKey };
    }
    case "gemini": {
      const apiKey = override ?? process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
      return {
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        apiKey,
      };
    }
    case "grok": {
      const apiKey = override ?? process.env.XAI_API_KEY;
      if (!apiKey) throw new Error("XAI_API_KEY is not set");
      return { baseURL: "https://api.x.ai/v1", apiKey };
    }
    case "ollama": {
      const baseURL =
        process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
      return { baseURL, apiKey: "ollama" };
    }
    case "custom": {
      const baseURL = process.env.CUSTOM_OPENAI_BASE_URL;
      const apiKey = override ?? process.env.CUSTOM_OPENAI_API_KEY;
      if (!baseURL) throw new Error("CUSTOM_OPENAI_BASE_URL is not set");
      if (!apiKey) throw new Error("CUSTOM_OPENAI_API_KEY is not set");
      return { baseURL, apiKey };
    }
    default:
      throw new Error(`Unsupported provider for openai-compat: ${provider}`);
  }
}

export async function callOpenAICompatJson(opts: {
  provider: ProviderId;
  model: string;
  systemPrompt: string;
  userMessage: string;
  apiKey?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const config = resolveProviderConfig(opts.provider, opts.apiKey);
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
  const completion = await client.chat.completions.create(
    {
      model: opts.model,
      temperature: 0,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userMessage },
      ],
    },
    { signal: opts.signal },
  );
  return completion.choices[0]?.message?.content ?? "";
}

export async function* streamTransformWithOpenAICompat(
  req: TransformRequest,
): AsyncGenerator<TransformEvent> {
  const { provider, model } = parseModelId(req.model);
  let config: ProviderConfig;
  try {
    config = resolveProviderConfig(provider as ProviderId, req.apiKey);
  } catch (err) {
    yield {
      type: "error",
      message: err instanceof Error ? err.message : "config error",
    };
    return;
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
  const userText = buildUserMessage(
    req.source,
    req.axes,
    req.language,
    req.speechLevel,
  );

  const stream = await client.chat.completions.create(
    {
      model,
      temperature: 0.7,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: TRANSFORM_SYSTEM_PROMPT },
        { role: "user", content: userText },
      ],
    },
    { signal: req.signal },
  );

  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let cachedInputTokens: number | undefined;

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta.length > 0) {
      yield { type: "delta", text: delta };
    }
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens;
      outputTokens = chunk.usage.completion_tokens;
      cachedInputTokens =
        chunk.usage.prompt_tokens_details?.cached_tokens ?? 0;
    }
  }

  yield {
    type: "done",
    meta: { provider, model, baseUrl: config.baseURL },
    usage: { inputTokens, outputTokens, cachedInputTokens },
  };
}
