# 개발 문서

이 저장소를 손대는 사람을 위한 문서. 사용자 대상 정보는 [`README.md`](./README.md) / [`README.ko.md`](./README.ko.md) 참조.

## 스택

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Base UI

> ⚠️ Next.js 16은 학습 데이터 시점의 Next.js와 API·규칙·파일 구조가 다를 수 있다. 코드 작성 전 `node_modules/next/dist/docs/`를 먼저 확인할 것. 자세한 에이전트용 지침은 [`AGENTS.md`](./AGENTS.md).

## 프로젝트 구조

```
app/
  api/         # /transform, /estimate
  page.tsx     # 메인 캔버스
components/    # Panel + shadcn/ui
lib/
  models.ts    # 모델 카탈로그 — 모델 추가/삭제는 이 파일만 건드린다
  prompt.ts    # 시스템 프롬프트
  estimate.ts  # 좌표 추정
  providers/   # SDK 어댑터
```

## 환경변수

`.env.local.example`을 `.env.local`로 복사한 뒤 사용할 프로바이더의 키만 채운다. UI에서 입력한 키는 환경변수보다 우선한다.

| 변수 | 용도 |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Claude |
| `OPENAI_API_KEY` | OpenAI |
| `GEMINI_API_KEY` | Google Gemini (OpenAI 호환 엔드포인트로 호출) |
| `XAI_API_KEY` | xAI Grok |
| `OLLAMA_BASE_URL` | Ollama 로컬·원격 (기본 `http://localhost:11434/v1`) |
| `CUSTOM_OPENAI_BASE_URL` / `CUSTOM_OPENAI_API_KEY` / `CUSTOM_OPENAI_LABEL` | 임의의 OpenAI 호환 엔드포인트 1개 (선택) |

## 명세

상세 사양은 [`PRD.md`](./PRD.md).

## 프로젝트명 이력

- 최초 가칭: *Prose Knobs* (PRD에 잔존)
- 디렉터리 작업명: *style-slides*
- 최종: **Tone Sliders**
