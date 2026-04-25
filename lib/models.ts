export type ProviderId =
  | "anthropic"
  | "openai"
  | "gemini"
  | "grok"
  | "ollama"
  | "custom";

export type ModelId = `${ProviderId}/${string}`;

export type Language = "ko" | "en" | "ja" | "zh-CN";

export type SpeechLevel = "haera" | "haeyo" | "hapsho" | "hae" | "default";

export interface AxesValues {
  register: number;
  authorPresence: number;
  rhetorical: number;
  anthropomorphism: number;
  assertion: number;
}

export interface ModelMeta {
  id: ModelId;
  label: string;
  contextWindow?: number;
  inputPricePer1M?: number;
  outputPricePer1M?: number;
  recommendedFor?: ("transform" | "estimate")[];
}

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  envKey?: string;
  baseUrlEnv?: string;
  defaultBaseUrl?: string;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
  },
  {
    id: "openai",
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    defaultBaseUrl: "https://api.openai.com/v1",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
  },
  {
    id: "grok",
    label: "xAI Grok",
    envKey: "XAI_API_KEY",
    defaultBaseUrl: "https://api.x.ai/v1",
  },
  {
    id: "ollama",
    label: "Ollama",
    baseUrlEnv: "OLLAMA_BASE_URL",
    defaultBaseUrl: "http://localhost:11434/v1",
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    envKey: "CUSTOM_OPENAI_API_KEY",
    baseUrlEnv: "CUSTOM_OPENAI_BASE_URL",
  },
];

export const STATIC_MODELS: ModelMeta[] = [
  // Anthropic
  {
    id: "anthropic/claude-opus-4-7",
    label: "Claude Opus 4.7",
    inputPricePer1M: 15,
    outputPricePer1M: 75,
    recommendedFor: ["estimate"],
  },
  {
    id: "anthropic/claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    inputPricePer1M: 3,
    outputPricePer1M: 15,
    recommendedFor: ["transform", "estimate"],
  },
  {
    id: "anthropic/claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    inputPricePer1M: 1,
    outputPricePer1M: 5,
    recommendedFor: ["transform"],
  },

  // OpenAI
  {
    id: "openai/gpt-5-mini",
    label: "GPT-5 mini",
    recommendedFor: ["transform"],
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o mini",
    recommendedFor: ["transform"],
  },

  // Gemini
  {
    id: "gemini/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    recommendedFor: ["transform"],
  },
  {
    id: "gemini/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    recommendedFor: ["estimate"],
  },

  // Grok
  {
    id: "grok/grok-3-mini",
    label: "Grok 3 mini",
    recommendedFor: ["transform"],
  },
  {
    id: "grok/grok-4",
    label: "Grok 4",
    recommendedFor: ["estimate"],
  },

  // Ollama (사용자 환경 시드)
  {
    id: "ollama/iaprofesseur/SuperGemma4-26b-uncensored-Q4:latest",
    label: "SuperGemma4 26B (uncensored, local)",
    recommendedFor: ["transform"],
  },
];

export const DEFAULT_TRANSFORM_MODEL: ModelId =
  "anthropic/claude-haiku-4-5-20251001";
export const DEFAULT_ESTIMATE_MODEL: ModelId = "anthropic/claude-sonnet-4-6";

export const DEFAULT_AXES: AxesValues = {
  register: 5,
  authorPresence: 5,
  rhetorical: 5,
  anthropomorphism: 5,
  assertion: 5,
};

export const DEFAULT_LANGUAGE: Language = "ko";
export const DEFAULT_SPEECH_LEVEL_KO: SpeechLevel = "haeyo";

const SUPPORTED_LANGUAGES: ReadonlySet<Language> = new Set([
  "ko",
  "en",
  "ja",
  "zh-CN",
]);

/** 브라우저 언어 태그(navigator.language)를 지원 언어 중 하나로 매핑.
 *  매칭 실패 시 DEFAULT_LANGUAGE 반환. */
export function matchBrowserLanguage(tag: string | undefined): Language {
  if (!tag) return DEFAULT_LANGUAGE;
  const lower = tag.toLowerCase();
  if (lower.startsWith("ko")) return "ko";
  if (lower.startsWith("en")) return "en";
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("zh")) return "zh-CN";
  // exact
  if (SUPPORTED_LANGUAGES.has(tag as Language)) return tag as Language;
  return DEFAULT_LANGUAGE;
}

export const AXIS_LABELS: Record<keyof AxesValues, { ko: string; en: string }> =
  {
    register: { ko: "격식", en: "Register" },
    authorPresence: { ko: "저자 가시성", en: "Author presence" },
    rhetorical: { ko: "수사·재치", en: "Rhetorical flourish" },
    anthropomorphism: { ko: "의인화", en: "Voice agency" },
    assertion: { ko: "확신", en: "Assertion" },
  };

export const SPEECH_LEVELS_KO: { id: SpeechLevel; label: string; example: string }[] = [
  { id: "haera", label: "해라체", example: "~한다, ~이다" },
  { id: "haeyo", label: "해요체", example: "~해요, ~예요" },
  { id: "hapsho", label: "합쇼체", example: "~합니다, ~입니다" },
  { id: "hae", label: "해체", example: "~해, ~야" },
];

export function parseModelId(modelId: ModelId): {
  provider: ProviderId;
  model: string;
} {
  const idx = modelId.indexOf("/");
  if (idx === -1) {
    throw new Error(`Invalid model id (no provider prefix): ${modelId}`);
  }
  const provider = modelId.slice(0, idx) as ProviderId;
  const model = modelId.slice(idx + 1);
  return { provider, model };
}
