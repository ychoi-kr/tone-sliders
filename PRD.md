# Prose Knobs — PRD

> 작업명. 최종 이름은 사용자가 정한다.

## 1. 한 문장 요약

같은 콘텐츠를 슬라이더로 톤만 바꿔 두세 창에서 동시에 비교하고, 마음에 든 좌표를 그대로 공유할 수 있는 다국어·다모델 글쓰기 캘리브레이션 도구.

## 2. 동기

문체 피드백은 보통 모호하다 ("이거 별로네"). 작가-편집자, 작가-AI 사이의 톤 정렬은 시도-실패가 비싸다. 이 도구는 톤을 **이름 붙은 직교 좌표**로 만들고, 좌표 이동의 결과를 **즉시·병렬로** 보여주고, 좌표 자체를 **공유 가능한 객체**로 만든다.

## 3. 1차 사용자

- LLM 보조 집필 중인 책·블로그 저자 (당장의 케이스: Docker 책)
- 원하는 톤 위치를 저자에게 명시해야 하는 편집자
- 카피 A/B 톤 테스트하는 마케터
- 톤 보존을 검증하려는 번역가

## 4. MVP 기능

### F1. 소스 입력 (단일)

- 텍스트 영역, 최대 10,000자
- 또는 `.md`/`.txt` 업로드
- 모든 패널이 이 한 소스를 공유

### F2. 슬라이더 패널 — 기본 5개 축

각 0~10, 정수. 호버 툴팁에 0/5/10 위치 예시 한 문장씩.

| 축 | 좌측(0) | 우측(10) |
|---|---|---|
| 격식 (Register) | 매뉴얼·학술 | 블로그·구어 |
| 저자 가시성 (Author presence) | 보이지 않음 | 적극 개입 (메타·평가) |
| 수사·재치 (Rhetorical flourish) | 건조·직설 | 화려·반전·비유 |
| 의인화 (Voice agency) | 기능적 | 의인화 |
| 마무리 (Closure) | 신중·여운 | 단호·선언 |

### F3. 패널(창) 비교

- 기본 2패널, 최대 3패널 (MVP), 4패널 (스트레치)
- 패널 독립 설정: 슬라이더 좌표 + 모델 + 출력 언어
- 한 소스가 모든 패널에 적용됨

### F4. 실시간 재생성

- 슬라이더 또는 모델·언어 변경 후 **500ms 디바운스**, 자동 재생성
- 변경된 패널만 호출 (다른 패널 결과 유지)
- **스트리밍 응답**으로 토큰 단위 표시
- **결과 캐시**: `(소스 해시, 모델, 언어, 좌표 5개)`가 같으면 재생성 안 함

### F5. 모델 선택 (패널별) — 멀티 프로바이더

4개 프로바이더 지원. 모델은 `provider/modelId` 형식으로 식별.

**Anthropic** (`@anthropic-ai/sdk`)
- `anthropic/claude-opus-4-7` (최고 품질, 느림)
- `anthropic/claude-sonnet-4-6` (균형) — **기본값**
- `anthropic/claude-haiku-4-5-20251001` (빠름·저렴)

**OpenAI** (`openai` SDK, default base URL)
- `openai/gpt-5` 류 (사용자가 카탈로그에서 결정)
- `openai/gpt-4o`, `openai/gpt-4o-mini` 등

**Google Gemini** (`openai` SDK + OpenAI 호환 엔드포인트 `https://generativelanguage.googleapis.com/v1beta/openai/`)
- `gemini/gemini-2.5-pro`
- `gemini/gemini-2.5-flash`

**xAI Grok** (`openai` SDK + base URL `https://api.x.ai/v1`)
- `grok/grok-3-mini` — **기본** (저렴·빠름)
- `grok/grok-4`

**Ollama (로컬·원격)** (`openai` SDK + 사용자 지정 base URL, 기본 `http://localhost:11434/v1`)
- 사용자 환경에서는 원격 Ollama 서버 사용 (`OLLAMA_BASE_URL`은 `.env.local`에 기재, 커밋 제외)
- 카탈로그 시드: `ollama/iaprofesseur/SuperGemma4-26b-uncensored-Q4:latest`
- `provider/modelId` 파싱 규칙: 첫 슬래시까지가 provider, 나머지 전체가 modelId (Ollama 모델 ID는 `org/name:tag` 형태로 슬래시 포함 가능)
- API 키 불필요 (`openai` SDK에 dummy 키 `"ollama"` 전달)

**OpenAI 호환 (사용자 정의)** — MVP 포함
- 임의의 OpenAI 호환 base URL + 모델 ID (LM Studio, OpenRouter, Together, Groq, DeepSeek 등)
- `CUSTOM_OPENAI_BASE_URL` + `CUSTOM_OPENAI_API_KEY` 환경변수로 1개 엔드포인트 등록
- 다중 엔드포인트는 스트레치

**프로바이더별 기본 모델** (저렴·빠름 우선, MVP 시작값)
- Anthropic: `claude-haiku-4-5-20251001`
- OpenAI: `gpt-5-mini` (없으면 `gpt-4o-mini`로 fallback — 카탈로그에서 손쉽게 교체)
- Gemini: `gemini-2.5-flash`
- Grok: `grok-3-mini`
- Ollama: `iaprofesseur/SuperGemma4-26b-uncensored-Q4:latest`
- **새 패널 전역 기본 (transform)**: `anthropic/claude-haiku-4-5-20251001` — 슬라이더마다 호출되므로 빠름·저렴 우선
- **Estimate 기본**: `anthropic/claude-sonnet-4-6` — 5축 + 스피치 레벨 동시 분류라 정확도 우선, 호출은 원문당 1회뿐이라 비용 부담 작음

**모델 카탈로그**: `lib/models.ts`에 단일 source of truth. 추가/삭제 시 한 파일만 수정.

### F6. 출력 언어 (패널별)

MVP: 한국어 (ko), English (en), 日本語 (ja), 中文 (zh-CN)
- 언어 변경 시 좌표는 유지, 출력만 해당 언어로

### F6.1. 스피치 레벨 (언어별 종결어미 옵션)

언어 픽커 옆 카테고리컬 드롭다운. 5개 슬라이더와 직교 — 격식 축과 별개로 작동.

**한국어 (ko)** — 4단계
| 키 | 이름 | 종결 예 |
|---|---|---|
| `haera` | 해라체 (서술·평서) | "~한다", "~이다" |
| `haeyo` | 해요체 (비격식 존댓말) — **기본** | "~해요", "~예요" |
| `hapsho` | 합쇼체 (격식 존댓말) | "~합니다", "~입니다" |
| `hae` | 해체 (반말) | "~해", "~야" |

**English (en)** — MVP는 단일값 `default`만 (스트레치: formal/casual/professional)
**日本語 (ja)** — MVP는 단일값 `default` (스트레치: 普通体/です・ます体/敬語)
**中文 (zh-CN)** — `default` 단일값

- 한국어 외 언어에서는 UI에서 비활성화/숨김
- 시스템 프롬프트에 명시적 규칙 추가 ("출력 종결어미는 X체를 일관 사용")
- 좌표 캐시 키에 포함

### F7. 공유

- "Copy Share Link" 버튼
- URL에 인코딩: `소스(또는 hash) + 패널 N개의 (좌표·모델·언어)`
- 짧은 소스(< 4KB)는 URL에 직접 base64
- 긴 소스는 서버에 저장 후 ID 발급
- 받는 사람은 같은 상태로 열고 자기 콘텐츠로 갈아끼울 수 있어야 함

### F8. 내보내기

- 패널별 "Copy" / "Download .md"
- 코드 블록·인라인 코드·링크 보존

### F9. 원문 좌표 추정 (Estimate)

소스 텍스트의 현재 5축 좌표를 추정해 슬라이더에 점으로 표시.

**UI**
- 소스 영역 옆 "Estimate" 버튼 (원문 입력 후 1회 호출, 자동 호출 안 함)
- 결과는 모든 패널 슬라이더에 **고정 마커**(◆)로 오버레이 — "원문 위치"를 시각적으로 확인하면서 패널 좌표(●)와 비교
- "Use as panel coordinates" 버튼: 추정값을 현재 패널 시작점으로 복사

**API**: `POST /api/estimate`
```json
요청: { "source": "...", "language": "ko", "model": "anthropic/claude-haiku-4-5-20251001" }
응답: {
  "axes": { "register": 4, "authorPresence": 3, "rhetorical": 2, "anthropomorphism": 1, "closure": 5 },
  "speechLevel": "haeyo",
  "promptVersion": "estimate-v1",
  "fromCache": true
}
```
- `language`: 원문 언어. 한국어(`ko`)일 때만 `speechLevel`을 같이 추정해 반환. 그 외 언어는 `speechLevel: null`.
- 모델이 추정한 `speechLevel`을 패널에도 ◆ 마커처럼 비교 표시 (현재 패널 설정과 다른 체이면 시각적 표시).

**결정론 보장 전략 (3겹)**
1. **결과 캐시** — `key = sha256(text) + model + promptVersion`. 같은 입력 → 동일 출력 보장 (LLM 호출 없음)
2. **`temperature=0` + structured output** — JSON Schema로 5개 정수만 받음. 형식 변동 차단
3. **Self-consistency (옵션)** — `?stable=true` 쿼리 시 N=3 호출, 축별 중앙값. 비용 3× 트레이드

**프롬프트 (rubric 강화)**: 각 축마다 0/3/5/7/10 지점에 한 줄 예시 텍스트를 박아 분류 일관성 확보.

**호출 모델**: 5축 + 스피치 레벨 동시 분류는 Haiku로는 ±1~2 변동이 발생하기 쉬워, 정확도 우선으로 `claude-sonnet-4-6`을 기본값으로. 추정은 원문당 1회뿐이라 비용 부담이 작다. 사용자가 카탈로그에서 변경 가능.

### F10. 동적 모델 카탈로그

각 프로바이더의 `GET /v1/models`를 서버에서 호출해 사용 가능한 모델 목록을 동적으로 채운다. 사용자가 Ollama에 새 모델을 pull하거나, OpenAI에 신모델이 나와도 코드 수정 없이 UI에 반영.

**전략**
- `lib/models.ts`는 **정적 메타데이터**만 보유 (레이블, 가격/1M 토큰, 컨텍스트 길이, 권장 용도)
- 런타임 카탈로그 = `정적 메타 + 프로바이더 /v1/models 응답 머지`
- 정적 메타에 없는 모델은 ID 그대로 노출 (가격 표시 "?", 사용 가능)
- 키/base URL 미설정 프로바이더는 페치 스킵

**API**: `GET /api/models`
```json
응답: {
  "providers": [
    {
      "id": "ollama",
      "label": "Ollama (remote)",
      "available": true,
      "models": [
        { "id": "ollama/iaprofesseur/SuperGemma4-26b-uncensored-Q4:latest",
          "label": "SuperGemma4 26B (uncensored)",
          "pricing": null }
      ]
    },
    { "id": "anthropic", "available": true, "models": [...] },
    { "id": "openai", "available": false, "reason": "no API key" }
  ]
}
```

**캐시**: 프로바이더별 5분 in-memory TTL (Ollama 서버 매번 두드리지 않게). 강제 새로고침 버튼 제공.

**로딩**: 페이지 진입 시 한 번 페치. 실패해도 정적 카탈로그로 동작.

## 5. 사용자 흐름

```
1. 페이지 진입 → 좌측 소스 영역 + 우측 패널 1개 (모든 슬라이더 5)
2. 원문 붙여넣기
3. (선택) "Estimate" 클릭 → 슬라이더에 원문 위치 ◆ 표시
4. 슬라이더 조작 → 500ms 후 자동 생성 → 스트리밍
5. "Add Panel" → 2번째 패널, 다른 좌표로 비교
6. (선택) 모델·언어 바꿔보기
7. 결정한 좌표를 "Share" → 링크 복사
```

## 6. 프롬프트 설계

### 시스템 프롬프트 (캐시 가능 부분)

```
당신은 문체 변환 어시스턴트다. 사용자가 제공한 원문을 5개 축의 좌표(각 0~10)에 맞춰 다시 쓴다.

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

[축 5: 마무리]
0 = 신중 ("…한 측면이 있다고 볼 수 있다")
5 = 일반
10 = 단호 ("이게 답이다")

규칙:
- 사실관계와 의미는 바꾸지 않는다
- 코드 블록·명령어·고유명사·수치는 원문 보존
- 분량은 원문 ±20% 이내
- 출력 언어: <target_language>
- (한국어인 경우) 종결어미: <speech_level>를 일관 적용
  - haera = "~한다/~이다" (해라체)
  - haeyo = "~해요/~예요" (해요체)
  - hapsho = "~합니다/~입니다" (합쇼체)
  - hae = "~해/~야" (해체)
- 출력은 변환된 본문만. 메타 설명·인사·해설 없이.
```

### 사용자 메시지 (캐시 안 됨)

```
[원문]

좌표: 격식=3, 저자=2, 수사=2, 의인화=1, 마무리=4
```

### Prompt Caching (프로바이더별 차이)

| 프로바이더 | 방식 | MVP 처리 |
|---|---|---|
| Anthropic | 명시적 `cache_control: { type: 'ephemeral' }` | 시스템+원문 블록에 적용 |
| OpenAI | 자동 (1024 토큰 이상 prefix 자동 캐시) | 추가 작업 없음, 프롬프트 순서만 안정적으로 |
| Gemini | 명시적 Context Caching API (별도 호출) | MVP에선 미적용, 자동 OK |
| Grok | 자동 (cached prompt tokens 별도 과금) | 추가 작업 없음 |

**공통 원칙**: 변하지 않는 부분(시스템 프롬프트 + 원문)을 메시지 앞쪽에 두고, 변하는 부분(좌표·언어)을 뒤에 둔다. 슬라이더만 움직일 때 모든 프로바이더에서 캐시 적중.

## 7. 기술 스택 (제안)

- **Frontend**: Next.js 15 + TypeScript + Tailwind + shadcn/ui
- **Backend**: Next.js API Route (`/api/transform`)
- **LLM SDK** (서버사이드 전용)
  - `@anthropic-ai/sdk` — Anthropic
  - `openai` — OpenAI / Gemini(OpenAI 호환 엔드포인트) / Grok / 기타 OpenAI 호환
- **Provider 추상화**: `lib/providers/{anthropic,openai-compat}.ts`로 `transform(opts) → AsyncIterable<Delta>` 통일 인터페이스
- **State**: zustand 또는 nuqs (URL ↔ 상태)
- **Persistence**: localStorage (최근 세션 3개)
- **Hosting**: Vercel (또는 사용자 선택)

### 환경변수
```
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...
XAI_API_KEY=...

# Ollama (선택, 기본 localhost)
OLLAMA_BASE_URL=http://localhost:11434/v1

# OpenAI 호환 사용자 정의 (선택)
CUSTOM_OPENAI_BASE_URL=https://...
CUSTOM_OPENAI_API_KEY=...
CUSTOM_OPENAI_LABEL=OpenRouter   # UI 표시용
```
키가 없거나 base URL이 비어 있는 프로바이더의 모델은 UI에서 비활성화 표시.

## 8. 컴포넌트 분해

```
<App>
  <SourcePanel value setValue />
  <PanelGrid>
    <Panel id={i}>
      <Sliders values setValues />
      <ModelPicker model setModel />
      <LanguagePicker lang setLang />
      <Output streaming />
      <Toolbar copy download />
    </Panel>
    ...
  </PanelGrid>
  <ShareButton state />
  <CostMeter sessionTokens />
</App>
```

## 9. API 인터페이스

### `POST /api/transform`

요청:
```json
{
  "source": "string",
  "model": "anthropic/claude-haiku-4-5-20251001",
  "language": "ko|en|ja|zh-CN",
  "speechLevel": "haera|haeyo|hapsho|hae|default",
  "axes": {
    "register": 3,
    "authorPresence": 2,
    "rhetorical": 2,
    "anthropomorphism": 1,
    "closure": 4
  }
}
```
`speechLevel`: 한국어일 때 4값 중 하나, 그 외 언어는 `default`. 좌표 캐시 키에 포함.

`model`은 `provider/modelId` 형식. 서버는 prefix를 보고 어댑터 선택:
- `anthropic/*` → Anthropic SDK
- `openai/*` → OpenAI SDK (default base URL)
- `gemini/*` → OpenAI SDK + `https://generativelanguage.googleapis.com/v1beta/openai/`
- `grok/*` → OpenAI SDK + `https://api.x.ai/v1`
- `ollama/*` → OpenAI SDK + `OLLAMA_BASE_URL` (기본 `http://localhost:11434/v1`), dummy API key
- `custom/*` → OpenAI SDK + `CUSTOM_OPENAI_BASE_URL` + `CUSTOM_OPENAI_API_KEY`

응답: SSE 스트림 (프로바이더 무관 통일 형식)
- `data: {"delta": "..."}` (텍스트 청크)
- `data: {"done": true, "usage": {"inputTokens": N, "outputTokens": N, "cachedInputTokens": N, "costUsd": 0.0012}}`

## 10. 비기능 요구사항

### 성능
- TTFB: Sonnet/Haiku <2s, Opus <4s
- 디바운스 500ms, 슬라이더 드래그 중 호출 안 함
- 패널 N개 병렬 호출

### 비용
- 패널별 토큰 사용량·달러 환산 표시
- 세션 누적 비용 표시
- "Stop generating" 즉시 abort

### 프라이버시·보안
- API 키 서버사이드 전용 (env)
- 클라이언트는 원문만 전송, 응답은 스트림으로 받음
- 본문 서버 로깅 금지 (에러만)
- "원문은 Anthropic API로 전송됩니다" 디스클로저

### 접근성
- 슬라이더 키보드 조작 (←/→, Home/End)
- ARIA 라벨, 스크린리더 호환

## 11. 인수 기준 (MVP 완료)

다음 8가지가 사용자가 직접 가능:

1. 한국어 2,000자 원문을 붙여넣고 5개 슬라이더를 조정
2. 슬라이더 멈춘 뒤 < 2초에 변환 결과 스트리밍 시작
3. "Add Panel"로 2번째 패널 추가, 다른 좌표로 동시 비교
4. 패널마다 모델을 6개 프로바이더 카탈로그에서 변경 (Anthropic/OpenAI/Gemini/Grok/Ollama/Custom)
5. 패널마다 출력 언어를 ko/en/ja/zh-CN 중 변경
6. Share 링크를 복사하면 새 브라우저에서 같은 상태로 열림
7. 동일 (소스, 모델, 언어, 좌표) 재방문 시 재생성 없이 캐시 결과 표시
8. "Estimate" 클릭 시 원문의 5축 추정 점수가 슬라이더에 ◆로 표시되고, 같은 원문에 다시 누르면 동일 결과(캐시)

## 12. 스트레치 (MVP 이후)

- 사용자 정의 축 (이름·0/10 설명·예시 사용자 입력)
- 4~6패널 동시 비교
- 패널 간 diff 뷰
- 👍/👎 평가 → "best of N" 모드
- 자주 쓰는 좌표 프리셋 저장
- Estimate에 self-consistency(N=3 중앙값) 토글 UI 노출

## 13. 범위 밖

- 회원가입·결제
- 협업(실시간 멀티유저)
- 모바일 최적화 (데스크톱 우선)

## 14. 열린 질문 (사용자 결정)

### 결정됨
- **API 키 관리**: 환경변수 + UI 입력 옵션 둘 다 지원. UI 입력 키는 `localStorage`에 저장, 매 요청마다 헤더로 전송. 서버는 stateless proxy로 받은 키를 그대로 프로바이더 SDK에 전달, 저장·로깅 금지. UI에 "키는 브라우저에만 저장됩니다" 디스클로저 표시. 환경변수 키가 있으면 디폴트, UI 입력 키가 있으면 우선.
- **호스팅**: 자체 서버. Vercel 전용 API 사용 금지 (Edge runtime/Image Optim 등). Next.js standalone build로 Docker 또는 Node 직접 실행 가능하게.
- **패널 기본 좌표**: 모두 5(중간).
- **Share 링크 유효기간**: MVP에서 구현 보류. URL base64 인코딩만, 서버 저장 안 함.
- **OpenAI 호환 다중 엔드포인트**: MVP 1개 (`CUSTOM_*`), 다중은 스트레치.
- **Estimate에 스피치 레벨 추정 포함**: 한국어 원문이면 추정 시 좌표 5축 + 종결어미체(`speechLevel`)도 같이 반환. JSON Schema 응답에 추가.
- **`/v1/models` fallback**: 정적 카탈로그로 떨어지고 UI에 "동적 카탈로그 사용 불가" 배지.

### 미정 (나중에)
- 도메인 / 라우트
- 인증: 무인증 vs 토큰 게이트 (자체 서버 호스팅 시 외부 노출 여부에 따라 결정)

## 15. 디자인 레퍼런스

- Anthropic Workbench의 좌측 컨트롤 + 우측 출력 레이아웃
- Logic Pro / Ableton 슬라이더의 수치 정확성
- Linear / Notion의 미니멀 텍스트 영역

```
┌────────────┬─────────────────────┬─────────────────────┐
│ SOURCE     │ PANEL 1             │ PANEL 2             │
├────────────┼─────────────────────┼─────────────────────┤
│            │ 격식      ◐──●───   │ 격식      ◐─●─────  │
│            │ 저자      ●──◐───   │ 저자      ◐────●──  │
│ [원문      │ 수사      ●──◐───   │ 수사      ◐────●──  │
│  영역]     │ 의인      ●──◐───   │ 의인      ●──◐────  │
│            │ 마무리    ◐─●────   │ 마무리    ◐──────●  │
│            │ ko · Opus           │ en · Sonnet         │
│            ├─────────────────────┼─────────────────────┤
│            │ [출력 — 스트리밍]   │ [출력 — 스트리밍]   │
│            ├─────────────────────┼─────────────────────┤
│            │ ⏵ Copy ⏵ Download   │ ⏵ Copy ⏵ Download   │
└────────────┴─────────────────────┴─────────────────────┘
                     [+ Add Panel] [Share Link] [Cost: ₩X]
```

## 16. 구현 우선순위 (착수 순서 제안)

1. Next.js 셋업 + Anthropic SDK 라우트 (`/api/transform`) 동작
2. 단일 패널 + 슬라이더 5개 + 한국어 + 해요체 기본, 비스트리밍
3. 스트리밍 응답
4. 디바운스 + 캐시
5. 2패널 동시 표시
6. 프로바이더 추상화 (`openai` SDK + base URL 분기) + 모델·언어·스피치 레벨 선택
7. 동적 모델 카탈로그 (`/api/models` + Ollama 포함)
8. Estimate (`/api/estimate` + 결정론 캐시 + structured output)
9. URL 상태 동기화 + Share
10. UI 마감 (디스클로저, 비용 표시, 키보드 접근성)

## 17. 첫날 검증 (당장의 dogfooding)

이 도구가 완성되면 가장 먼저 할 것:
- Docker 책의 실패한 파일럿 초고를 원문으로 붙여넣기
- 좌표 (3, 2, 2, 1, 4)로 변환 → 사용자가 검토
- 좌표 미세조정해 마음에 드는 위치 확정
- 그 좌표를 docker-why 책의 STYLE.md에 박고 야간 루프 시작

이 흐름이 매끄럽게 되면 MVP는 사용자에게 가치 있음을 검증한 것.
