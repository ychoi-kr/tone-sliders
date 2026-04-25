import type { AxesValues, Language, ModelId, SpeechLevel } from "../models";

export interface TransformRequest {
  source: string;
  model: ModelId;
  language: Language;
  speechLevel: SpeechLevel;
  axes: AxesValues;
  apiKey?: string;
  signal?: AbortSignal;
}

export interface StreamMeta {
  provider: string;
  model: string;
  baseUrl?: string;
}

export interface StreamUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
}

/** 스트림에서 yield되는 단위 이벤트 */
export type TransformEvent =
  | { type: "delta"; text: string }
  | { type: "done"; meta: StreamMeta; usage: StreamUsage }
  | { type: "error"; message: string };
