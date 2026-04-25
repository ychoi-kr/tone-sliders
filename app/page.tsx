"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Panel, DEFAULT_PANEL_STATE, type PanelState } from "@/components/Panel";

const MAX_PANELS = 3;

export default function Home() {
  const [source, setSource] = useState("");
  const [panels, setPanels] = useState<PanelState[]>([
    DEFAULT_PANEL_STATE,
    DEFAULT_PANEL_STATE,
  ]);

  const updatePanel = (index: number, next: PanelState) =>
    setPanels((prev) => prev.map((p, i) => (i === index ? next : p)));

  const addPanel = () =>
    setPanels((prev) =>
      prev.length < MAX_PANELS ? [...prev, DEFAULT_PANEL_STATE] : prev,
    );

  const removePanel = (index: number) =>
    setPanels((prev) => prev.filter((_, i) => i !== index));

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
            <Label htmlFor="source" className="text-sm font-medium">
              원문
            </Label>
            <Textarea
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="여기에 변환할 원문을 붙여넣으세요…"
              className="min-h-[600px] resize-none font-mono text-sm"
              maxLength={10000}
            />
            <div className="text-xs text-muted-foreground">
              {source.length.toLocaleString()} / 10,000자
            </div>
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
              />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
