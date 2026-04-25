# Tone Sliders

> [English](./README.md) · **한국어**

같은 원문을 슬라이더로 톤만 바꿔 두세 창에서 동시에 비교하고, 마음에 든 좌표를 그대로 공유하는 다국어·다모델 글쓰기 캘리브레이션 도구.

문체 피드백은 보통 모호하다("이거 별로네"). Tone Sliders는 톤을 **이름 붙은 직교 좌표**로 만들고, 좌표 이동의 결과를 **즉시·병렬로** 보여주고, 좌표 자체를 **공유 가능한 객체**로 다룬다.

## 톤 축 (5개)

각 0~10 정수.

| 축 | 좌측(0) | 우측(10) |
|---|---|---|
| 격식 (Register) | 매뉴얼·학술 | 블로그·구어 |
| 저자 가시성 (Author presence) | 보이지 않음 | 적극 개입 |
| 수사·재치 (Rhetorical flourish) | 건조·직설 | 화려·반전·비유 |
| 의인화 (Voice agency) | 기능적 | 의인화 |
| 확신 (Assertion) | 신중·여운, 강한 헤징 | 단호·단언, 헤징 제거 |

한국어 출력에는 종결어미(해라/해요/합쇼/해)를 5축과 직교한 별도 옵션으로 둔다.

## 시작하기

```bash
cp .env.local.example .env.local   # 사용할 프로바이더 키만 채움
npm install
npm run dev                        # http://localhost:3000
```

UI에서 직접 입력한 키는 환경변수보다 우선한다.

## 지원 프로바이더

- **Anthropic** — Claude (Opus / Sonnet / Haiku)
- **OpenAI** — GPT 계열
- **Google Gemini** — OpenAI 호환 엔드포인트
- **xAI Grok** — OpenAI 호환 엔드포인트
- **Ollama** — 로컬·원격 (`OLLAMA_BASE_URL`)
- **OpenAI 호환 사용자 정의** — LM Studio / OpenRouter / Together / Groq / DeepSeek 등

모델 카탈로그 단일 source of truth: `lib/models.ts`.

## 주요 기능 (MVP)

- **다중 패널 비교** — 패널 2~3개, 각자 독립된 좌표·모델·언어
- **실시간 재생성** — 슬라이더 변경 후 500ms 디바운스, 스트리밍 응답, 결과 캐시
- **원문 좌표 추정 (Estimate)** — 입력 텍스트의 현재 5축 좌표를 추정해 ◆ 마커로 오버레이
- **공유 링크** — 소스(또는 hash) + 패널 상태를 URL에 인코딩
- **언어 4종** — 한국어 / English / 日本語 / 中文

상세 사양은 [`PRD.md`](./PRD.md), 저장소를 손볼 때의 구조·스택은 [`DEVELOPMENT.md`](./DEVELOPMENT.md) 참조.

## API

화면에서 마음에 든 좌표를 찾았다면 패널의 **API URL** 버튼으로 그 세팅이 박힌 엔드포인트를 복사해 외부에서 호출할 수 있다. Claude Code 같은 에이전트가 같은 톤으로 새 텍스트를 변환·비교하는 용도.

```bash
curl -X POST \
  'http://localhost:3000/api/v1/transform?register=5&assertion=7&lang=ko&speech=haera&model=anthropic/claude-haiku-4-5-20251001' \
  -H 'Content-Type: application/json' \
  -d '{"text":"여기에 원문..."}'
```

- 모든 세팅은 query string, 원문은 JSON 본문의 `text` 필드
- 5개 축은 누락 시 5(중립)로 채움 — 일부만 지정해도 됨
- 응답은 JSON 기본, `?stream=true` 추가 시 SSE
- 자기 키를 쓰려면 `X-Provider-Key` 헤더 (없으면 서버 `.env.local` 폴백)
- 스키마 자기소개: `GET /api/v1/transform`
- 모델 카탈로그: `GET /api/v1/models`
