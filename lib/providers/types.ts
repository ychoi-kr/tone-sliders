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

export interface TransformResult {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  /** 실제 어떤 provider/baseURL/model로 호출되었는지 (디버깅용) */
  meta?: {
    provider: string;
    model: string;
    baseUrl?: string;
  };
}
