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
| Closure | careful, lingering | decisive, declarative |

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
