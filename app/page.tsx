"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Panel, DEFAULT_PANEL_STATE, type PanelState } from "@/components/Panel";
import type { AxesValues, SpeechLevel } from "@/lib/models";

const MAX_PANELS = 3;

interface EstimateState {
  axes: AxesValues;
  speechLevel: SpeechLevel | null;
  fromCache: boolean;
  tookMs?: number;
  model: string;
}

export default function Home() {
  const [source, setSource] = useState("");
  const [panels, setPanels] = useState<PanelState[]>([
    DEFAULT_PANEL_STATE,
    DEFAULT_PANEL_STATE,
  ]);
  const [estimate, setEstimate] = useState<EstimateState | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const updatePanel = (index: number, next: PanelState) =>
    setPanels((prev) => prev.map((p, i) => (i === index ? next : p)));

  const addPanel = () =>
    setPanels((prev) =>
      prev.length < MAX_PANELS ? [...prev, DEFAULT_PANEL_STATE] : prev,
    );

  const removePanel = (index: number) =>
    setPanels((prev) => prev.filter((_, i) => i !== index));

  const runEstimate = async () => {
    if (!source.trim()) {
      setEstimateError("원문을 먼저 입력해 주세요.");
      return;
    }
    setEstimateError(null);
    setEstimating(true);
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, language: "ko" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setEstimate({
        axes: data.axes,
        speechLevel: data.speechLevel,
        fromCache: !!data.fromCache,
        tookMs: data.tookMs,
        model: data.model,
      });
    } catch (err) {
      setEstimateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setEstimating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Style Slides
            </h1>
            <p className="text-sm text-muted-foreground">
              슬라이더로 문체를 좌표화 — 같은 원문을 다른 톤으로 비교
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={addPanel}
            disabled={panels.length >= MAX_PANELS}
          >
            + Add Panel ({panels.length}/{MAX_PANELS})
          </Button>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,1fr)_2fr]">
          {/* 소스 */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="source" className="text-sm font-medium">
                원문
              </Label>
              <Button
                size="sm"
                variant="secondary"
                onClick={runEstimate}
                disabled={estimating || !source.trim()}
                className="h-7 text-xs"
              >
                {estimating ? "분석 중…" : "원문 좌표 추정"}
              </Button>
            </div>
            <Textarea
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="여기에 변환할 원문을 붙여넣으세요…"
              className="min-h-[560px] resize-none font-mono text-sm"
              maxLength={10000}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{source.length.toLocaleString()} / 10,000자</span>
              {estimate && (
                <span className="font-mono">
                  ◆ 원문: {estimate.axes.register}/{estimate.axes.authorPresence}/
                  {estimate.axes.rhetorical}/{estimate.axes.anthropomorphism}/
                  {estimate.axes.closure}
                  {estimate.speechLevel && ` · ${estimate.speechLevel}`}
                  {estimate.fromCache && " · cached"}
                </span>
              )}
            </div>
            {estimateError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                {estimateError}
              </div>
            )}
          </section>

          {/* 패널들 */}
          <section
            className={`grid gap-4 ${
              panels.length === 1
                ? "grid-cols-1"
                : panels.length === 2
                  ? "grid-cols-1 xl:grid-cols-2"
                  : "grid-cols-1 xl:grid-cols-3"
            }`}
          >
            {panels.map((p, i) => (
              <Panel
                key={i}
                index={i}
                source={source}
                state={p}
                onChange={(next) => updatePanel(i, next)}
                onRemove={panels.length > 1 ? () => removePanel(i) : undefined}
                estimatedAxes={estimate?.axes}
                estimatedSpeechLevel={estimate?.speechLevel ?? null}
              />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
