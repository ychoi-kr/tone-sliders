import OpenAI from "openai";
import { parseModelId, type ProviderId } from "../models";
import { TRANSFORM_SYSTEM_PROMPT, buildUserMessage } from "../prompt";
import type { TransformRequest, TransformResult } from "./types";

interface ProviderConfig {
  baseURL: string;
  apiKey: string;
}

function resolveProviderConfig(provider: ProviderId, override?: string): ProviderConfig {
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

export async function transformWithOpenAICompat(
  req: TransformRequest,
): Promise<TransformResult> {
  const { provider, model } = parseModelId(req.model);
  const config = resolveProviderConfig(provider as ProviderId, req.apiKey);

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

  const completion = await client.chat.completions.create(
    {
      model,
      temperature: 0.7,
      messages: [
        { role: "system", content: TRANSFORM_SYSTEM_PROMPT },
        { role: "user", content: userText },
      ],
    },
    { signal: req.signal },
  );

  const text = completion.choices[0]?.message?.content ?? "";

  return {
    text,
    inputTokens: completion.usage?.prompt_tokens,
    outputTokens: completion.usage?.completion_tokens,
    cachedInputTokens: completion.usage?.prompt_tokens_details?.cached_tokens ?? 0,
    meta: { provider, model, baseUrl: config.baseURL },
  };
}
