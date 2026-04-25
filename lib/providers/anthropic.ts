import Anthropic from "@anthropic-ai/sdk";
import { parseModelId } from "../models";
import { TRANSFORM_SYSTEM_PROMPT, buildUserMessage } from "../prompt";
import type { TransformEvent, TransformRequest } from "./types";

export async function callAnthropicJson(opts: {
  model: string;
  systemPrompt: string;
  userMessage: string;
  apiKey?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create(
    {
      model: opts.model,
      max_tokens: 512,
      temperature: 0,
      system: opts.systemPrompt,
      messages: [{ role: "user", content: opts.userMessage }],
    },
    { signal: opts.signal },
  );
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

export async function* streamTransformWithAnthropic(
  req: TransformRequest,
): AsyncGenerator<TransformEvent> {
  const apiKey = req.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    yield { type: "error", message: "ANTHROPIC_API_KEY is not set" };
    return;
  }

  const { model } = parseModelId(req.model);
  const client = new Anthropic({ apiKey });
  const userText = buildUserMessage(
    req.source,
    req.axes,
    req.language,
    req.speechLevel,
  );

  const stream = client.messages.stream(
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
      messages: [{ role: "user", content: userText }],
    },
    { signal: req.signal },
  );

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield { type: "delta", text: event.delta.text };
    }
  }

  const final = await stream.finalMessage();
  yield {
    type: "done",
    meta: { provider: "anthropic", model },
    usage: {
      inputTokens: final.usage.input_tokens,
      outputTokens: final.usage.output_tokens,
      cachedInputTokens: final.usage.cache_read_input_tokens ?? 0,
    },
  };
}
