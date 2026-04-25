import type { AxesValues, Language, SpeechLevel } from "./models";

const LANGUAGE_NAMES: Record<Language, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  "zh-CN": "中文 (간체)",
};

const SPEECH_LEVEL_RULES: Record<SpeechLevel, string> = {
  haera: '한국어 종결어미는 해라체("~한다", "~이다")를 일관 사용한다.',
  haeyo: '한국어 종결어미는 해요체("~해요", "~예요")를 일관 사용한다.',
  hapsho: '한국어 종결어미는 합쇼체("~합니다", "~입니다")를 일관 사용한다.',
  hae: '한국어 종결어미는 해체("~해", "~야")를 일관 사용한다.',
  default: "",
};

export const TRANSFORM_SYSTEM_PROMPT = `당신은 문체 변환 어시스턴트다. 사용자가 제공한 원문을 5개 축의 좌표(각 0~10)에 맞춰 다시 쓴다.

[축 1: 격식]
0 = 매뉴얼·학술 ("hello-world 이미지의 크기는 25.9 KB이다.")
5 = 일반 ("hello-world 이미지는 25.9 KB로 작은 편이다.")
10 = 블로그·구어 ("hello-world가 무려 25.9 KB밖에 안 된다.")

[축 2: 저자 가시성]
0 = 보이지 않음 (사실 진술만, 메타 언급·평가 없음)
5 = 일반
10 = 적극 개입 ("이 책은…" 같은 자기 언급, 평가어 사용)

[축 3: 수사·재치]
0 = 건조·직설
5 = 일반
10 = 화려·반전 공식·비유 적극

[축 4: 의인화]
0 = 기능적 ("이미지가 다운로드된다")
5 = 일반
10 = 의인 ("Docker가 친절하게 받아온다")

[축 5: 확신]
0 = 신중·여운, 강한 헤징 ("…한 측면이 있다고 볼 수 있다", "…인 경향이 있다")
5 = 일반
10 = 단호·단언, 헤징 제거 ("…한다", "이게 답이다")

이 축은 원문 *모든 문장*의 기존 단언 강도를 조절한다. 결론 위치와 무관하다.

규칙:
- 사실관계와 의미는 바꾸지 않는다
- 원문에 없는 문장·결론·요약을 추가하지 않는다. 원문이 끝나는 자리에서 끝낸다.
- 본문 진술의 시제는 원문대로 유지한다 (확신 축이 시제까지 바꾸는 게 아니다)
- 코드 블록·명령어·고유명사·수치는 원문 보존
- 분량은 원문 ±20% 이내
- 출력은 변환된 본문만. 메타 설명·인사·해설 없이.`;

export function buildLanguageInstruction(
  language: Language,
  speechLevel: SpeechLevel,
): string {
  const lines = [`출력 언어: ${LANGUAGE_NAMES[language]}`];
  if (language === "ko" && speechLevel !== "default") {
    lines.push(SPEECH_LEVEL_RULES[speechLevel]);
  }
  return lines.join("\n");
}

export function buildUserMessage(
  source: string,
  axes: AxesValues,
  language: Language,
  speechLevel: SpeechLevel,
): string {
  const axisLine = `좌표: 격식=${axes.register}, 저자=${axes.authorPresence}, 수사=${axes.rhetorical}, 의인화=${axes.anthropomorphism}, 확신=${axes.assertion}`;
  return [
    "[원문]",
    source,
    "",
    buildLanguageInstruction(language, speechLevel),
    "",
    axisLine,
  ].join("\n");
}

/** 다른 LLM 도구(Claude 웹 / ChatGPT 등)에 붙여넣어 그대로 재현할 수 있는
 *  단일 텍스트 익스포트. 시스템 프롬프트·사용자 메시지·설정을 명확히 구분한다. */
export function buildPromptExport(opts: {
  source: string;
  axes: AxesValues;
  language: Language;
  speechLevel: SpeechLevel;
  modelId: string;
}): string {
  const userMessage = buildUserMessage(
    opts.source,
    opts.axes,
    opts.language,
    opts.speechLevel,
  );
  return [
    "=== System prompt (시스템 프롬프트 / Custom Instructions 칸에 붙여넣기) ===",
    "",
    TRANSFORM_SYSTEM_PROMPT,
    "",
    "=== User message (첫 사용자 메시지로 붙여넣기) ===",
    "",
    userMessage,
    "",
    "=== Settings (참고용) ===",
    `- Model: ${opts.modelId}`,
    `- Language: ${opts.language}`,
    `- Speech level: ${opts.speechLevel}`,
  ].join("\n");
}
