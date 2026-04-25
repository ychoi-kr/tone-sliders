"use client";

import { useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AXIS_LABELS,
  DEFAULT_AXES,
  DEFAULT_LANGUAGE,
  DEFAULT_SPEECH_LEVEL_KO,
  DEFAULT_TRANSFORM_MODEL,
  STATIC_MODELS,
  SPEECH_LEVELS_KO,
  type AxesValues,
  type Language,
  type ModelId,
  type SpeechLevel,
} from "@/lib/models";

const AXIS_KEYS: (keyof AxesValues)[] = [
  "register",
  "authorPresence",
  "rhetorical",
  "anthropomorphism",
  "closure",
];

const LANGUAGE_OPTIONS: { id: Language; label: string }[] = [
  { id: "ko", label: "한국어" },
  { id: "en", label: "English" },
  { id: "ja", label: "日本語" },
  { id: "zh-CN", label: "中文" },
];

export interface PanelState {
  axes: AxesValues;
  model: ModelId;
  language: Language;
  speechLevel: SpeechLevel;
}

export const DEFAULT_PANEL_STATE: PanelState = {
  axes: DEFAULT_AXES,
  model: DEFAULT_TRANSFORM_MODEL,
  language: DEFAULT_LANGUAGE,
  speechLevel: DEFAULT_SPEECH_LEVEL_KO,
};

interface PanelProps {
  index: number;
  source: string;
  state: PanelState;
  onChange: (state: PanelState) => void;
  onRemove?: () => void;
  estimatedAxes?: AxesValues;
  estimatedSpeechLevel?: SpeechLevel | null;
}

interface OutputMeta {
  provider: string;
  model: string;
  baseUrl?: string;
  tookMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

type SseEvent =
  | { type: "delta"; text: string }
  | {
      type: "done";
      meta: { provider: string; model: string; baseUrl?: string };
      usage: {
        inputTokens?: number;
        outputTokens?: number;
        cachedInputTokens?: number;
      };
      tookMs?: number;
    }
  | { type: "error"; message: string; tookMs?: number };

async function* readSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIndex: number;
    while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);
      const dataLine = raw
        .split("\n")
        .find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      try {
        yield JSON.parse(dataLine.slice(6)) as SseEvent;
      } catch {
        // 파싱 실패는 무시 (불완전 청크)
      }
    }
  }
}

export function Panel({
  index,
  source,
  state,
  onChange,
  onRemove,
  estimatedAxes,
  estimatedSpeechLevel,
}: PanelProps) {
  const [output, setOutput] = useState("");
  const [meta, setMeta] = useState<OutputMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const setAxis = (key: keyof AxesValues, value: number) =>
    onChange({ ...state, axes: { ...state.axes, [key]: value } });

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleTransform = async () => {
    if (!source.trim()) {
      setError("원문을 먼저 입력해 주세요.");
      return;
    }
    setError(null);
    setLoading(true);
    setOutput("");
    setMeta(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          source,
          model: state.model,
          language: state.language,
          speechLevel: state.language === "ko" ? state.speechLevel : "default",
          axes: state.axes,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let message = `HTTP ${res.status}`;
        try {
          message = (JSON.parse(text) as { error?: string }).error ?? message;
        } catch {
          // text 그대로 사용
          if (text) message = text;
        }
        throw new Error(message);
      }
      if (!res.body) throw new Error("No response body");

      let accumulated = "";
      for await (const evt of readSseStream(res.body)) {
        if (evt.type === "delta") {
          accumulated += evt.text;
          setOutput(accumulated);
        } else if (evt.type === "done") {
          setMeta({
            provider: evt.meta.provider,
            model: evt.meta.model,
            baseUrl: evt.meta.baseUrl,
            tookMs: evt.tookMs ?? 0,
            inputTokens: evt.usage.inputTokens,
            outputTokens: evt.usage.outputTokens,
          });
        } else if (evt.type === "error") {
          throw new Error(evt.message);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // 사용자 취소 — 누적된 출력 유지, 오류 표시 없음
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">
          Panel {index + 1}
        </h2>
        <div className="flex items-center gap-1">
          {estimatedAxes && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({
                  ...state,
                  axes: estimatedAxes,
                  speechLevel:
                    state.language === "ko" && estimatedSpeechLevel
                      ? estimatedSpeechLevel
                      : state.speechLevel,
                });
              }}
              className="h-7 px-2 text-xs"
              title="원문의 추정 좌표를 이 패널에 적용"
            >
              ◆ 원문 좌표로
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-7 px-2 text-xs text-muted-foreground"
            >
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* 슬라이더 */}
      <div className="space-y-3">
        {AXIS_KEYS.map((key) => {
          const est = estimatedAxes?.[key];
          const drift =
            typeof est === "number" ? state.axes[key] - est : null;
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <Label className="font-medium">{AXIS_LABELS[key].ko}</Label>
                <span className="font-mono text-muted-foreground">
                  {typeof est === "number" && (
                    <span className="mr-2 text-foreground/60">◆ {est}</span>
                  )}
                  <span className="text-foreground">{state.axes[key]}</span>
                  {drift !== null && drift !== 0 && (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      ({drift > 0 ? "+" : ""}
                      {drift})
                    </span>
                  )}
                </span>
              </div>
              <Slider
                value={[state.axes[key]]}
                min={0}
                max={10}
                step={1}
                onValueChange={(v) => {
                  const next = Array.isArray(v) ? v[0] : v;
                  if (typeof next === "number") setAxis(key, next);
                }}
              />
            </div>
          );
        })}
      </div>

      {/* 모델·언어·스피치 레벨 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-muted-foreground">모델</Label>
          <Select
            value={state.model}
            onValueChange={(v) => onChange({ ...state, model: v as ModelId })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATIC_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">언어</Label>
          <Select
            value={state.language}
            onValueChange={(v) =>
              onChange({ ...state, language: v as Language })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((l) => (
                <SelectItem key={l.id} value={l.id} className="text-xs">
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            스피치 레벨
            {state.language !== "ko" && (
              <span className="ml-1 text-[10px]">(ko 전용)</span>
            )}
            {state.language === "ko" && estimatedSpeechLevel && (
              <span className="ml-1 text-[10px] text-foreground/60">
                ◆ {estimatedSpeechLevel}
              </span>
            )}
          </Label>
          <Select
            value={state.language === "ko" ? state.speechLevel : "default"}
            onValueChange={(v) =>
              onChange({ ...state, speechLevel: v as SpeechLevel })
            }
            disabled={state.language !== "ko"}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {state.language === "ko" ? (
                SPEECH_LEVELS_KO.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="default" className="text-xs">
                  default
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <Button
          onClick={handleStop}
          variant="outline"
          size="sm"
          className="w-full"
        >
          중지
        </Button>
      ) : (
        <Button
          onClick={handleTransform}
          disabled={!source.trim()}
          size="sm"
          className="w-full"
        >
          변환
        </Button>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {meta && (
        <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 px-2 py-1 font-mono text-[10px] leading-tight text-muted-foreground">
          <div>
            <span className="text-foreground/70">routed:</span> {meta.provider}/
            {meta.model}
          </div>
          {meta.baseUrl && (
            <div>
              <span className="text-foreground/70">baseUrl:</span>{" "}
              {meta.baseUrl}
            </div>
          )}
          <div>
            <span className="text-foreground/70">took:</span> {meta.tookMs}ms ·{" "}
            <span className="text-foreground/70">tokens:</span> in{" "}
            {meta.inputTokens ?? "-"} / out {meta.outputTokens ?? "-"}
          </div>
        </div>
      )}

      <div className="min-h-[200px] flex-1 whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm leading-relaxed">
        {output || (
          <span className="text-xs text-muted-foreground">
            {loading
              ? "응답 대기 중…"
              : "변환 결과가 여기에 표시됩니다."}
          </span>
        )}
        {loading && output && (
          <span className="ml-0.5 inline-block h-3.5 w-1 animate-pulse bg-foreground/50 align-middle" />
        )}
      </div>
    </div>
  );
}
