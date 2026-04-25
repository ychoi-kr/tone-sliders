"use client";

import { useState } from "react";
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
}

interface OutputMeta {
  provider: string;
  model: string;
  baseUrl?: string;
  tookMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

export function Panel({ index, source, state, onChange, onRemove }: PanelProps) {
  const [output, setOutput] = useState("");
  const [meta, setMeta] = useState<OutputMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAxis = (key: keyof AxesValues, value: number) =>
    onChange({ ...state, axes: { ...state.axes, [key]: value } });

  const handleTransform = async () => {
    if (!source.trim()) {
      setError("원문을 먼저 입력해 주세요.");
      return;
    }
    setError(null);
    setLoading(true);
    setOutput("");
    setMeta(null);
    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          model: state.model,
          language: state.language,
          speechLevel: state.language === "ko" ? state.speechLevel : "default",
          axes: state.axes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setOutput(data.text);
      if (data.meta) {
        setMeta({
          provider: data.meta.provider,
          model: data.meta.model,
          baseUrl: data.meta.baseUrl,
          tookMs: data.tookMs ?? 0,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">
          Panel {index + 1}
        </h2>
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

      {/* 슬라이더 */}
      <div className="space-y-3">
        {AXIS_KEYS.map((key) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <Label className="font-medium">{AXIS_LABELS[key].ko}</Label>
              <span className="font-mono text-muted-foreground">
                {state.axes[key]}
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
        ))}
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

      <Button
        onClick={handleTransform}
        disabled={loading || !source.trim()}
        size="sm"
        className="w-full"
      >
        {loading ? "변환 중…" : "변환"}
      </Button>

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
            변환 결과가 여기에 표시됩니다.
          </span>
        )}
      </div>
    </div>
  );
}
