"use client";

import { useEffect, useRef, useState } from "react";
import {
  EFFORT_LABELS,
  modelLabel,
  type EffortLevel,
  type ModelOption,
} from "@/lib/models";

type Props = {
  models: ModelOption[];
  modelId: string;
  fast: boolean;
  effort: EffortLevel;
  disabled?: boolean;
  onModelChange: (id: string) => void;
  onFastChange: (fast: boolean) => void;
  onEffortChange: (effort: EffortLevel) => void;
};

type Panel = "main" | "effort" | "model";

export function ModelPicker({
  models,
  modelId,
  fast,
  effort,
  disabled,
  onModelChange,
  onFastChange,
  onEffortChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("main");
  const rootRef = useRef<HTMLDivElement>(null);
  const catalog = models.length > 0 ? models : [];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setPanel("main");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setPanel("main");
      }
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const chipLabel = fast
    ? `${modelLabel(modelId, catalog)} · Fast`
    : modelLabel(modelId, catalog);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((v) => !v);
          setPanel("main");
        }}
        className="inline-flex h-9 max-w-[220px] items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-sm text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="truncate">{chipLabel}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0 text-zinc-400"
          aria-hidden
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-full left-1/2 z-40 mb-2 w-56 -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {panel === "main" ? (
            <>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm text-zinc-800">Fast</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={fast}
                  onClick={() => onFastChange(!fast)}
                  className={`relative h-5 w-9 rounded-full transition ${
                    fast ? "bg-zinc-900" : "bg-zinc-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
                      fast ? "translate-x-4" : ""
                    }`}
                  />
                </button>
              </div>
              <div className="mx-2 border-t border-zinc-100" />
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-zinc-800 transition hover:bg-zinc-50"
                onClick={() => setPanel("effort")}
              >
                <span>Effort</span>
                <span className="flex items-center gap-1 text-zinc-500">
                  {EFFORT_LABELS[effort]}
                  <ChevronRight />
                </span>
              </button>
              <div className="mx-2 border-t border-zinc-100" />
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-zinc-800 transition hover:bg-zinc-50"
                onClick={() => setPanel("model")}
              >
                <span>Model</span>
                <span className="flex max-w-[140px] items-center gap-1 truncate text-zinc-500">
                  <span className="truncate">{modelLabel(modelId, catalog)}</span>
                  <ChevronRight />
                </span>
              </button>
            </>
          ) : null}

          {panel === "effort" ? (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50"
                onClick={() => setPanel("main")}
              >
                <ChevronLeft /> Effort
              </button>
              <div className="mx-2 border-t border-zinc-100" />
              {(["low", "medium", "high"] as EffortLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition hover:bg-zinc-50 ${
                    effort === level ? "font-medium text-zinc-900" : "text-zinc-700"
                  }`}
                  onClick={() => {
                    onEffortChange(level);
                    setPanel("main");
                  }}
                >
                  {EFFORT_LABELS[level]}
                  {effort === level ? <Check /> : null}
                </button>
              ))}
            </>
          ) : null}

          {panel === "model" ? (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50"
                onClick={() => setPanel("main")}
              >
                <ChevronLeft /> Model
              </button>
              <div className="mx-2 border-t border-zinc-100" />
              <div className="max-h-56 overflow-y-auto">
                {catalog.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-zinc-500">
                    Configura modelos en el engranaje.
                  </p>
                ) : (
                  catalog.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition hover:bg-zinc-50 ${
                        modelId === m.id
                          ? "font-medium text-zinc-900"
                          : "text-zinc-700"
                      }`}
                      onClick={() => {
                        onModelChange(m.id);
                        setPanel("main");
                        setOpen(false);
                      }}
                    >
                      <span className="truncate pr-2">{m.label}</span>
                      {modelId === m.id ? <Check /> : null}
                    </button>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12l5 5L20 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
