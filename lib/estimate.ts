import { createHash } from "node:crypto";
import type { AxesValues, Language, ModelId, SpeechLevel } from "./models";

// Language re-export (호출 측 편의)
export type { Language };

export const ESTIMATE_PROMPT_VERSION = "estimate-v2";

export const ESTIMATE_SYSTEM_PROMPT = `당신은 문체 분석기다. 입력된 한국어 또는 외국어 텍스트를 5개 축의 정수 좌표(각 0~10)로 분류하고, 텍스트의 언어와 한국어인 경우 종결어미체도 함께 분류한다.

각 축의 rubric:

[1. register — 격식]
0: 매뉴얼·학술 보고서 ("hello-world 이미지의 크기는 25.9 KB이다.")
3: 약간 격식적 ("이 hello-world 이미지는 25.9 KB로 비교적 작다.")
5: 일반 ("hello-world 이미지는 25.9 KB로 작은 편이다.")
7: 약간 구어 ("hello-world, 25.9 KB짜리 작은 이미지다.")
10: 블로그·구어 ("hello-world가 무려 25.9 KB밖에 안 된다.")

[2. authorPresence — 저자 가시성]
0: 저자 보이지 않음 (사실 진술만)
3: 약한 메타 표현 ("이 절에서는…")
5: 일반
7: 자기 평가어 다소 ("개인적으로 흥미롭다")
10: 적극 개입 ("이 책은…", "내가 생각하기에…")

[3. rhetorical — 수사·재치]
0: 건조·직설
3: 약한 수사
5: 일반
7: 비유·반어 등장
10: 화려·반전 공식·은유 적극

[4. anthropomorphism — 의인화]
0: 기능적 ("이미지가 다운로드된다")
3: 살짝 능동 ("이미지가 내려온다")
5: 일반
7: 약한 의인 ("Docker가 받아 온다")
10: 의인화 적극 ("Docker가 친절하게 받아 온다")

[5. closure — 마무리]
0: 신중·여운 ("…한 측면이 있다고 볼 수 있다")
3: 부드러운 결론 ("…인 듯하다")
5: 일반
7: 명료 ("…이다")
10: 단호·선언 ("이게 답이다.")

언어 감지 (language):
- "ko" — 한국어
- "en" — English
- "ja" — 日本語
- "zh-CN" — 中文 (간체·번체 모두 포함)
- "other" — 위 4개 외 모든 언어

한국어 텍스트인 경우 종결어미 체를 분류 (speechLevel):
- "haera": "~한다", "~이다" (해라체, 평서·서술)
- "haeyo": "~해요", "~예요" (해요체, 비격식 존댓말)
- "hapsho": "~합니다", "~입니다" (합쇼체, 격식 존댓말)
- "hae": "~해", "~야" (해체, 반말)
- 한국어가 아니면 null

출력은 반드시 다음 JSON 형식만 (코드블록·해설 없음):
{
  "language": "ko" | "en" | "ja" | "zh-CN" | "other",
  "register": 0~10 정수,
  "authorPresence": 0~10 정수,
  "rhetorical": 0~10 정수,
  "anthropomorphism": 0~10 정수,
  "closure": 0~10 정수,
  "speechLevel": "haera" | "haeyo" | "hapsho" | "hae" | null
}`;

export function buildEstimateUserMessage(source: string): string {
  return [
    "[입력 텍스트]",
    source,
    "",
    "위 텍스트의 언어와 좌표를 위 형식의 JSON으로만 출력하라.",
  ].join("\n");
}

export type DetectedLanguage = Language | "other";

export interface EstimateResult {
  language: DetectedLanguage;
  axes: AxesValues;
  speechLevel: SpeechLevel | null;
}

export class EstimateParseError extends Error {}

function clampAxis(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new EstimateParseError(`axis is not a number: ${String(n)}`);
  }
  return Math.max(0, Math.min(10, Math.round(n)));
}

const VALID_SPEECH: ReadonlySet<string> = new Set([
  "haera",
  "haeyo",
  "hapsho",
  "hae",
]);

const VALID_LANGUAGE: ReadonlySet<DetectedLanguage> = new Set([
  "ko",
  "en",
  "ja",
  "zh-CN",
  "other",
]);

export function parseEstimateJson(raw: string): EstimateResult {
  // 모델이 코드 블록을 둘러쌌을 가능성 정리
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  // 첫 { ~ 마지막 }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new EstimateParseError("no JSON object found");
  }
  const jsonStr = text.slice(firstBrace, lastBrace + 1);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch (err) {
    throw new EstimateParseError(
      `JSON.parse failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const axes: AxesValues = {
    register: clampAxis(parsed.register),
    authorPresence: clampAxis(parsed.authorPresence),
    rhetorical: clampAxis(parsed.rhetorical),
    anthropomorphism: clampAxis(parsed.anthropomorphism),
    closure: clampAxis(parsed.closure),
  };

  let speechLevel: SpeechLevel | null = null;
  const sl = parsed.speechLevel;
  if (typeof sl === "string" && VALID_SPEECH.has(sl)) {
    speechLevel = sl as SpeechLevel;
  }

  let language: DetectedLanguage = "other";
  const lang = parsed.language;
  if (typeof lang === "string" && VALID_LANGUAGE.has(lang as DetectedLanguage)) {
    language = lang as DetectedLanguage;
  }

  return { language, axes, speechLevel };
}

// ---------- 캐시 ----------

interface CacheEntry {
  result: EstimateResult;
  promptVersion: string;
}

const estimateCache = new Map<string, CacheEntry>();

export function makeCacheKey(source: string, model: ModelId): string {
  const hash = createHash("sha256")
    .update(source)
    .digest("hex")
    .slice(0, 16);
  return `${hash}:${model}:${ESTIMATE_PROMPT_VERSION}`;
}

export function getCachedEstimate(key: string): EstimateResult | null {
  const entry = estimateCache.get(key);
  return entry?.result ?? null;
}

export function setCachedEstimate(key: string, result: EstimateResult): void {
  estimateCache.set(key, { result, promptVersion: ESTIMATE_PROMPT_VERSION });
}
