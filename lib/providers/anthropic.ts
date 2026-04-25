import Anthropic from "@anthropic-ai/sdk";
import { parseModelId } from "../models";
import { TRANSFORM_SYSTEM_PROMPT, buildUserMessage } from "../prompt";
import type { TransformRequest, TransformResult } from "./types";

export async function transformWithAnthropic(
  req: TransformRequest,
): Promise<TransformResult> {
  const apiKey = req.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const { model } = parseModelId(req.model);
  const client = new Anthropic({ apiKey });

  const userText = buildUserMessage(
    req.source,
    req.axes,
    req.language,
    req.speechLevel,
  );

  const response = await client.messages.create(
    {
      model,
      max_tokens: 4096,
      temperature: 0.7,
      system: [
        {
          type: "text",
          text: TRANSFORM_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: userText,
        },
      ],
    },
    { signal: req.signal },
  );

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cachedInputTokens: response.usage.cache_read_input_tokens ?? 0,
    meta: { provider: "anthropic", model },
  };
}
