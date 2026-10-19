"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_MODELS,
  labelFromSlug,
  normalizeModelOption,
  parseModelLines,
  type ModelOption,
} from "@/lib/models";
import { DEFAULT_SOURCES, normalizeSourceUrl } from "@/lib/sources";

type Props = {
  open: boolean;
  initialKey: string;
  initialModels: ModelOption[];
  initialSources: string[];
  onClose: () => void;
  onSave: (data: {
    apiKey: string;
    models: ModelOption[];
    sources: string[];
  }) => void;
};

type DraftRow = {
  key: string;
  label: string;
  id: string;
  fastId: string;
};

function toDraft(models: ModelOption[]): DraftRow[] {
  return models.map((m, i) => ({
    key: `${m.id}-${i}`,
    label: m.label,
    id: m.id,
    fastId: m.fastId === m.id ? "" : m.fastId,
  }));
}

function draftsToModels(rows: DraftRow[]): ModelOption[] {
  const seen = new Set<string>();
  const out: ModelOption[] = [];
  for (const row of rows) {
    const option = normalizeModelOption({
      id: row.id,
      label: row.label || undefined,
      fastId: row.fastId || undefined,
    });
    if (!option || seen.has(option.id)) continue;
    seen.add(option.id);
    out.push(option);
  }
  return out;
}

export function SettingsModal({
  open,
  initialKey,
  initialModels,
  initialSources,
  onClose,
  onSave,
}: Props) {
  const [apiKey, setApiKey] = useState(initialKey);
  const [rows, setRows] = useState<DraftRow[]>(() => toDraft(initialModels));
  const [sourceRows, setSourceRows] = useState<string[]>(
    () => initialSources,
  );
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setApiKey(initialKey);
      setRows(toDraft(initialModels.length ? initialModels : DEFAULT_MODELS));
      setSourceRows(
        initialSources.length ? initialSources : [...DEFAULT_SOURCES],
      );
      setPasteText("");
      setShowPaste(false);
      setError(null);
      setSaved(false);
    }
  }, [open, initialKey, initialModels, initialSources]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const previewCount = useMemo(() => draftsToModels(rows).length, [rows]);

  if (!open) return null;

  const updateRow = (key: string, patch: Partial<DraftRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
    setSaved(false);
    setError(null);
  };

  const handleSave = () => {
    const models = draftsToModels(rows);
    if (models.length === 0) {
      setError("Agrega al menos un modelo con slug válido (ej. anthropic/claude-sonnet-4.6).");
      return;
    }
    const sources = sourceRows
      .map((s) => normalizeSourceUrl(s))
      .filter((s): s is string => Boolean(s));
    const unique = [...new Set(sources)];
    onSave({ apiKey: apiKey.trim(), models, sources: unique });
    setSaved(true);
  };

  const applyPaste = () => {
    const parsed = parseModelLines(pasteText);
    if (parsed.length === 0) {
      setError("No se encontraron slugs válidos. Usa líneas como provider/modelo.");
      return;
    }
    setRows(toDraft(parsed));
    setShowPaste(false);
    setPasteText("");
    setError(null);
    setSaved(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10">
      <button
        type="button"
        aria-label="Cerrar"
        className="fixed inset-0 bg-zinc-900/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="settings-title" className="text-lg font-semibold text-zinc-900">
              Configuración
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Se guarda solo en este navegador.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar configuración"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <label htmlFor="api-key" className="mt-5 block text-sm font-medium text-zinc-700">
          API key de OpenRouter
        </label>
        <input
          id="api-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setSaved(false);
          }}
          placeholder="sk-or-v1-…"
          className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 font-mono text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100"
        />
        <p className="mt-2 text-xs text-zinc-400">
          Opcional. Si está vacía, el servidor usa{" "}
          <code className="font-mono">OPENROUTER_API_KEY</code>. Para una clave
          propia, consíguela en{" "}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-zinc-600"
          >
            openrouter.ai/keys
          </a>
          .
        </p>

        <div className="mt-6 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-zinc-700">Modelos</h3>
            <p className="text-xs text-zinc-400">
              Opciones del selector junto a Buscar ({previewCount})
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPaste((v) => !v)}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
            >
              {showPaste ? "Ocultar pegado" : "Pegar lista"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRows((prev) => [
                  ...prev,
                  {
                    key: `new-${Date.now()}`,
                    label: "",
                    id: "",
                    fastId: "",
                  },
                ]);
                setSaved(false);
              }}
              className="text-xs font-medium text-zinc-900 hover:underline"
            >
              + Agregar
            </button>
          </div>
        </div>

        {showPaste ? (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={5}
              placeholder={`Una línea por modelo, por ejemplo:\nanthropic/claude-sonnet-4.6\nGPT 5.2 | openai/gpt-5.2\nClaude | anthropic/claude-sonnet-4.6 | anthropic/claude-haiku-4.5`}
              className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-800 outline-none focus:border-zinc-400"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={applyPaste}
                className="h-8 rounded-full bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800"
              >
                Usar esta lista
              </button>
            </div>
          </div>
        ) : null}

        <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
          {rows.map((row) => (
            <li
              key={row.key}
              className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    type="text"
                    value={row.label}
                    onChange={(e) => updateRow(row.key, { label: e.target.value })}
                    placeholder={
                      row.id ? labelFromSlug(row.id) : "Nombre (opcional)"
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-zinc-400"
                  />
                  <input
                    type="text"
                    value={row.id}
                    onChange={(e) => updateRow(row.key, { id: e.target.value })}
                    placeholder="provider/modelo  (slug OpenRouter)"
                    spellCheck={false}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-mono text-xs outline-none focus:border-zinc-400"
                  />
                  <input
                    type="text"
                    value={row.fastId}
                    onChange={(e) =>
                      updateRow(row.key, { fastId: e.target.value })
                    }
                    placeholder="Modelo rápido opcional (Fast / perfilado)"
                    spellCheck={false}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-mono text-xs outline-none focus:border-zinc-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRows((prev) => prev.filter((r) => r.key !== row.key));
                    setSaved(false);
                  }}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-rose-600"
                  aria-label="Quitar modelo"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-zinc-700">Páginas web</h3>
            <p className="text-xs text-zinc-400">
              El agente las consulta al buscar (p. ej. convoca.io)
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSourceRows((prev) => [...prev, ""]);
              setSaved(false);
            }}
            className="text-xs font-medium text-zinc-900 hover:underline"
          >
            + Agregar
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {sourceRows.map((url, index) => (
            <li key={`src-${index}`} className="flex items-center gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  const value = e.target.value;
                  setSourceRows((prev) =>
                    prev.map((item, i) => (i === index ? value : item)),
                  );
                  setSaved(false);
                }}
                placeholder="https://www.convoca.io/"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono text-xs outline-none focus:border-zinc-400 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => {
                  setSourceRows((prev) => prev.filter((_, i) => i !== index));
                  setSaved(false);
                }}
                className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600"
                aria-label="Quitar página"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
        {sourceRows.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-400">
            Sin páginas extra. Se usará la web abierta y sitios oficiales.
          </p>
        ) : null}

        <p className="mt-2 text-xs text-zinc-400">
          Slugs en{" "}
          <a
            href="https://openrouter.ai/models"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-zinc-600"
          >
            openrouter.ai/models
          </a>
          . El modelo rápido se usa con Fast y al perfilar el proyecto.
        </p>

        {error ? (
          <p className="mt-3 text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          {saved ? (
            <span className="mr-auto text-xs text-emerald-600">Guardada</span>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-full px-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-10 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
