"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FundCard } from "@/components/FundCard";
import { ModelPicker } from "@/components/ModelPicker";
import { SettingsModal } from "@/components/SettingsModal";
import {
  loadApiKey,
  loadEffort,
  loadFast,
  loadModelCatalog,
  loadModelId,
  loadSearchSources,
  saveApiKey,
  saveEffort,
  saveFast,
  saveModelCatalog,
  saveModelId,
  saveSearchSources,
} from "@/lib/client-settings";
import { localTodayYmd } from "@/lib/dates";
import type { EffortLevel, ModelOption } from "@/lib/models";
import {
  sortFundCards,
  type FundCard as FundCardType,
  type FundGroup,
  type SseEvent,
} from "@/lib/schema";

type CardWithId = FundCardType & { id: string };

const PLACEHOLDER = `Ejemplo: Somos una startup de Valparaíso que desarrolla un sistema IoT para monitorear el consumo de agua en pymes agrícolas. Estamos en etapa piloto con 12 clientes y buscamos financiamiento para escalar el hardware y certificar el producto.`;

function parseSseChunk(
  buffer: string,
  onEvent: (event: SseEvent) => void,
): string {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";

  for (const part of parts) {
    const lines = part.split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      try {
        onEvent(JSON.parse(raw) as SseEvent);
      } catch {
        /* ignore malformed */
      }
    }
  }
  return rest;
}

export function SearchScreen() {
  const [hydrated, setHydrated] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [modelCatalog, setModelCatalog] = useState<ModelOption[]>([]);
  const [searchSources, setSearchSources] = useState<string[]>([]);
  const [modelId, setModelId] = useState("");
  const [fast, setFast] = useState(false);
  const [effort, setEffort] = useState<EffortLevel>("medium");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [descripcion, setDescripcion] = useState("");
  const [organizacion, setOrganizacion] = useState("");
  const [region, setRegion] = useState("");
  const [monto, setMonto] = useState("");
  const [afinOpen, setAfinOpen] = useState(false);

  const [running, setRunning] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [chile, setChile] = useState<CardWithId[]>([]);
  const [internacional, setInternacional] = useState<CardWithId[]>([]);
  const [groupDone, setGroupDone] = useState<Record<FundGroup, boolean>>({
    chile: false,
    internacional: false,
  });

  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    const catalog = loadModelCatalog();
    setApiKey(loadApiKey());
    setModelCatalog(catalog);
    setSearchSources(loadSearchSources());
    setModelId(loadModelId(catalog));
    setFast(loadFast());
    setEffort(loadEffort());
    setHydrated(true);
  }, []);

  const canSearch = descripcion.trim().length >= 20 && !running && hydrated;

  const resetResults = useCallback(() => {
    setChile([]);
    setInternacional([]);
    setGroupDone({ chile: false, internacional: false });
    setError(null);
    setStatus("");
  }, []);

  const handleEvent = useCallback((event: SseEvent) => {
    if (event.type === "status") {
      setStatus(event.message);
      return;
    }
    if (event.type === "card") {
      const withId: CardWithId = {
        ...event.card,
        id: `${event.group}-${++idRef.current}`,
      };
      if (event.group === "chile") {
        setChile((prev) => sortFundCards([...prev, withId]) as CardWithId[]);
      } else {
        setInternacional((prev) =>
          sortFundCards([...prev, withId]) as CardWithId[],
        );
      }
      return;
    }
    if (event.type === "group_done") {
      setGroupDone((prev) => ({ ...prev, [event.group]: true }));
      return;
    }
    if (event.type === "error") {
      setError((prev) =>
        prev ? `${prev} · ${event.message}` : event.message,
      );
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
    setStatus("Búsqueda detenida.");
  }, []);

  const search = useCallback(async () => {
    if (descripcion.trim().length < 20) {
      setError("Escribe al menos 20 caracteres describiendo el proyecto.");
      setHasSearched(true);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    resetResults();
    setHasSearched(true);
    setRunning(true);
    setStatus("Conectando…");

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descripcion: descripcion.trim(),
          organizacion: organizacion.trim() || undefined,
          region: region.trim() || undefined,
          monto: monto.trim() || undefined,
          apiKey: apiKey.trim() || undefined,
          model: modelId,
          fast,
          effort,
          models: modelCatalog,
          sources: searchSources,
          hoy: localTodayYmd(),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || `Error ${response.status}`);
      }

      if (!response.body) {
        throw new Error("El servidor no envió un flujo de resultados.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = parseSseChunk(buffer, handleEvent);
      }
      if (buffer.trim()) {
        parseSseChunk(`${buffer}\n\n`, handleEvent);
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setStatus("Búsqueda detenida.");
      } else {
        const message =
          err instanceof Error ? err.message : "No se pudo completar la búsqueda.";
        setError(message);
        setStatus("");
        setGroupDone({ chile: true, internacional: true });
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [
    descripcion,
    organizacion,
    region,
    monto,
    apiKey,
    modelId,
    modelCatalog,
    searchSources,
    fast,
    effort,
    resetResults,
    handleEvent,
  ]);

  const emptyChile = hasSearched && groupDone.chile && chile.length === 0 && !running;
  const emptyIntl =
    hasSearched &&
    groupDone.internacional &&
    internacional.length === 0 &&
    !running;

  return (
    <div className="relative flex h-dvh min-h-0 flex-col overflow-hidden bg-[#fafafa]">
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.05fr)_minmax(0,1.05fr)]">
        {/* Panel izquierdo: proyecto + controles */}
        <aside className="relative flex max-h-[55dvh] min-h-0 flex-col overflow-hidden border-b border-zinc-200 bg-white lg:max-h-none lg:h-full lg:border-r lg:border-b-0">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
            aria-label="Configuración"
            title="Configuración"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M19.4 13a7.8 7.8 0 0 0 .05-2l2.02-1.57-1.9-3.3-2.4.9a7.7 7.7 0 0 0-1.73-1L15.1 3H8.9l-.34 2.03a7.7 7.7 0 0 0-1.73 1l-2.4-.9-1.9 3.3L4.55 11a7.8 7.8 0 0 0 0 2l-2.02 1.57 1.9 3.3 2.4-.9c.53.42 1.11.76 1.73 1L8.9 21h6.2l.34-2.03a7.7 7.7 0 0 0 1.73-1l2.4.9 1.9-3.3L19.4 13Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="shrink-0 border-b border-zinc-100 px-5 pt-5 pb-4 pr-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
              Financiamiento
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
              Búsqueda de fondos
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              Pega el proyecto y busca convocatorias en Chile e internacionales.
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
            <label htmlFor="descripcion" className="sr-only">
              Descripción del proyecto
            </label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={PLACEHOLDER}
              disabled={running}
              className="project-textarea min-h-[12rem] w-full flex-1 resize-none rounded-2xl border border-zinc-200 bg-zinc-50/80 px-3.5 py-3 text-[14px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-100 disabled:opacity-70"
            />

            <div>
              <button
                type="button"
                onClick={() => setAfinOpen((v) => !v)}
                className="text-sm text-zinc-500 transition hover:text-zinc-800"
              >
                {afinOpen ? "Ocultar afinado" : "Afinar búsqueda (opcional)"}
              </button>
              {afinOpen ? (
                <div className="mt-2 grid gap-2">
                  <input
                    type="text"
                    value={organizacion}
                    onChange={(e) => setOrganizacion(e.target.value)}
                    placeholder="Tipo de organización"
                    disabled={running}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  />
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Región"
                    disabled={running}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  />
                  <input
                    type="text"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="Monto aproximado"
                    disabled={running}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  />
                </div>
              ) : null}
            </div>

            {(running || status || error) && (
              <div className="space-y-1.5">
                {running || status ? (
                  <p className="flex items-center gap-2 text-sm text-zinc-500">
                    {running ? (
                      <span
                        className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400"
                        aria-hidden
                      />
                    ) : null}
                    {status}
                  </p>
                ) : null}
                {error ? (
                  <p className="text-sm text-rose-600" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-zinc-100 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2.5">
              {running ? (
                <button
                  type="button"
                  onClick={stop}
                  className="inline-flex h-10 min-w-[120px] flex-1 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 sm:flex-none"
                >
                  Detener
                </button>
              ) : (
                <button
                  type="button"
                  onClick={search}
                  disabled={!canSearch}
                  className="inline-flex h-10 min-w-[120px] flex-1 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 sm:flex-none"
                >
                  Buscar
                </button>
              )}

              {hydrated ? (
                <ModelPicker
                  models={modelCatalog}
                  modelId={modelId}
                  fast={fast}
                  effort={effort}
                  disabled={running}
                  onModelChange={(id) => {
                    setModelId(id);
                    saveModelId(id);
                  }}
                  onFastChange={(v) => {
                    setFast(v);
                    saveFast(v);
                  }}
                  onEffortChange={(v) => {
                    setEffort(v);
                    saveEffort(v);
                  }}
                />
              ) : null}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
              Confirma plazos y bases en el sitio oficial de cada fondo.
            </p>
          </div>
        </aside>

        {/* Panel central: Chile */}
        <ResultsPanel
          title="Fondos en Chile"
          cards={chile}
          empty={emptyChile}
          loading={running && !groupDone.chile}
          idle={!hasSearched}
        />

        {/* Panel derecho: Internacional */}
        <ResultsPanel
          title="Fondos internacionales"
          cards={internacional}
          empty={emptyIntl}
          loading={running && !groupDone.internacional}
          idle={!hasSearched}
          className="border-t border-zinc-200 lg:border-t-0 lg:border-l"
        />
      </div>

      <SettingsModal
        open={settingsOpen}
        initialKey={apiKey}
        initialModels={modelCatalog}
        initialSources={searchSources}
        onClose={() => setSettingsOpen(false)}
        onSave={({ apiKey: key, models, sources }) => {
          saveApiKey(key);
          saveModelCatalog(models);
          saveSearchSources(sources);
          setApiKey(key);
          setModelCatalog(models);
          setSearchSources(sources);
          const nextId = models.some((m) => m.id === modelId)
            ? modelId
            : models[0].id;
          setModelId(nextId);
          saveModelId(nextId);
          setSettingsOpen(false);
          setError(null);
        }}
      />
    </div>
  );
}

function ResultsPanel({
  title,
  cards,
  empty,
  loading,
  className = "",
}: {
  title: string;
  cards: CardWithId[];
  empty: boolean;
  loading: boolean;
  idle?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`flex h-[42dvh] min-h-0 flex-col overflow-hidden bg-[#fafafa] lg:h-full ${className}`}
    >
      <header className="flex shrink-0 items-baseline justify-between gap-2 border-b border-zinc-200 bg-white/80 px-5 py-3.5 backdrop-blur-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-800">
          {title}
        </h2>
        <span className="text-xs tabular-nums text-zinc-400">
          {cards.length > 0 ? cards.length : loading ? "…" : "0"}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {cards.length === 0 ? (
          <div className="flex h-full min-h-[10rem] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white/60 px-4 py-10 text-center text-sm text-zinc-400">
            {loading
              ? "Buscando…"
              : empty
                ? "Sin resultados en este grupo."
                : "Los resultados aparecerán aquí."}
          </div>
        ) : (
          <ul className="space-y-3 pb-2">
            {cards.map((card) => (
              <li key={card.id}>
                <FundCard card={card} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
