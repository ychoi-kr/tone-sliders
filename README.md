# Tone Sliders

> **English** · [한국어](./README.ko.md)

A multilingual, multi-model writing calibration tool. Take one source text, dial its tone with sliders across two or three side-by-side panels, compare in real time, and share the coordinates you like.

Style feedback is usually vague ("I don't like this one"). Tone Sliders turns tone into **named, orthogonal coordinates**, shows the result of moving those coordinates **immediately and in parallel**, and treats the coordinates themselves as a **shareable object**.

## The five tone axes

Each axis is an integer from 0 to 10.

| Axis | 0 | 10 |
|---|---|---|
| Register | manual / academic | blog / spoken |
| Author presence | invisible | actively intervening |
| Rhetorical flourish | dry, direct | ornate, twisty, figurative |
| Voice agency | functional | anthropomorphic |
| Assertion | careful, heavy hedging | decisive, hedging-free |

Korean output also exposes a sentence-ending style (해라 / 해요 / 합쇼 / 해) as a separate categorical option, orthogonal to the five sliders.

## Getting started

```bash
cp .env.local.example .env.local   # fill in only the providers you'll use
npm install
npm run dev                        # http://localhost:3000
```

API keys entered through the UI take precedence over environment variables.

## Supported providers

- **Anthropic** — Claude (Opus / Sonnet / Haiku)
- **OpenAI** — GPT family
- **Google Gemini** — via OpenAI-compatible endpoint
- **xAI Grok** — via OpenAI-compatible endpoint
- **Ollama** — local or remote (`OLLAMA_BASE_URL`)
- **Custom OpenAI-compatible** — LM Studio / OpenRouter / Together / Groq / DeepSeek, etc.

Model catalog single source of truth: `lib/models.ts`.

## MVP features

- **Multi-panel comparison** — 2–3 panels, each with independent coordinates, model, and output language
- **Live regeneration** — 500ms debounce on slider changes, streaming responses, result cache
- **Source coordinate estimation (Estimate)** — infers the current 5-axis coordinates of the input text and overlays them as ◆ markers
- **Share links** — source (or hash) + panel state encoded into the URL
- **Four output languages** — Korean / English / Japanese / Chinese (Simplified)

Full spec: [`PRD.md`](./PRD.md) (Korean). For repo layout, stack, and contributor notes, see [`DEVELOPMENT.md`](./DEVELOPMENT.md) (Korean).

## API

Once you find a coordinate setting you like in the UI, the panel's **API URL** button copies an endpoint URL with those settings baked in. Useful for letting agents (e.g., Claude Code) transform new text with the same tone and self-compare against the original.

```bash
curl -X POST \
  'http://localhost:3000/api/v1/transform?register=5&assertion=7&lang=ko&speech=haera&model=anthropic/claude-haiku-4-5-20251001' \
  -H 'Content-Type: application/json' \
  -d '{"text":"source text here..."}'
```

- All settings live in the query string; the source goes in the JSON body's `text` field.
- Missing axes default to 5 (neutral) — partial specifications are fine.
- Default response is JSON; pass `?stream=true` for SSE.
- Override the server's API key with `X-Provider-Key` header (otherwise the server falls back to `.env.local`).
- Self-describing schema: `GET /api/v1/transform`
- Model catalog: `GET /api/v1/models`
