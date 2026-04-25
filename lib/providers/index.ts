import { parseModelId } from "../models";
import { transformWithAnthropic } from "./anthropic";
import { transformWithOpenAICompat } from "./openai-compat";
import type { TransformRequest, TransformResult } from "./types";

export async function transform(req: TransformRequest): Promise<TransformResult> {
  const { provider } = parseModelId(req.model);
  if (provider === "anthropic") {
    return transformWithAnthropic(req);
  }
  return transformWithOpenAICompat(req);
}

export type { TransformRequest, TransformResult };
