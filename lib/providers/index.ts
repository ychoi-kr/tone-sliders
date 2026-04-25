import { parseModelId, type ProviderId } from "../models";
import { callAnthropicJson, streamTransformWithAnthropic } from "./anthropic";
import {
  callOpenAICompatJson,
  streamTransformWithOpenAICompat,
} from "./openai-compat";
import type { TransformEvent, TransformRequest } from "./types";
import type { ModelId } from "../models";

export function streamTransform(
  req: TransformRequest,
): AsyncGenerator<TransformEvent> {
  const { provider } = parseModelId(req.model);
  if (provider === "anthropic") {
    return streamTransformWithAnthropic(req);
  }
  return streamTransformWithOpenAICompat(req);
}

export async function callProviderJson(opts: {
  modelId: ModelId;
  systemPrompt: string;
  userMessage: string;
  apiKey?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const { provider, model } = parseModelId(opts.modelId);
  if (provider === "anthropic") {
    return callAnthropicJson({
      model,
      systemPrompt: opts.systemPrompt,
      userMessage: opts.userMessage,
      apiKey: opts.apiKey,
      signal: opts.signal,
    });
  }
  return callOpenAICompatJson({
    provider: provider as ProviderId,
    model,
    systemPrompt: opts.systemPrompt,
    userMessage: opts.userMessage,
    apiKey: opts.apiKey,
    signal: opts.signal,
  });
}

export type { TransformRequest, TransformEvent };
