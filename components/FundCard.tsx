"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FundCard as FundCardType } from "@/lib/schema";

const ESTADO_LABEL: Record<FundCardType["estado"], string> = {
  abierta: "Abierta",
  por_abrir: "Por abrir",
  cerrada: "Cerrada",
  no_confirmado: "Estado no confirmado",
};

const ESTADO_STYLE: Record<FundCardType["estado"], string> = {
  abierta: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30",
  por_abrir: "bg-amber-500 text-white shadow-sm shadow-amber-500/30",
  cerrada: "bg-rose-600 text-white shadow-sm shadow-rose-600/30",
  no_confirmado: "bg-zinc-500 text-white shadow-sm shadow-zinc-500/25",
};

const ELEG_LABEL: Record<FundCardType["elegibilidad"], string> = {
  directa: "Chile puede postular",
  punto_nacional: "Vía punto nacional",
  socio_extranjero: "Requiere socio extranjero",
  no_confirmada: "Elegibilidad no confirmada",
};

type Props = {
  card: FundCardType;
};

export function FundCard({ card }: Props) {
  const [matchOpen, setMatchOpen] = useState(false);

  return (
    <article className="fund-card rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-base font-semibold tracking-tight text-zinc-900">
            {card.nombre}
          </h3>
          <p className="text-sm text-zinc-500">{card.organismo}</p>
        </div>
        <div className="flex shrink-0 items-start justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setMatchOpen(true)}
            className="inline-flex whitespace-nowrap items-center rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold tracking-wide text-white shadow-sm transition hover:bg-zinc-700"
            title="Ver por qué coincide"
          >
            Coincidencia {Math.round(card.ajuste)}%
          </button>
          <span
            className={`inline-flex whitespace-nowrap items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${ESTADO_STYLE[card.estado]}`}
          >
            {ESTADO_LABEL[card.estado]}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-zinc-700">{card.descripcion}</p>

      <dl className="mt-4 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2">
        {card.cierre ? (
          <div>
            <dt className="font-medium text-zinc-400">Cierre</dt>
            <dd className="text-zinc-700">{card.cierre}</dd>
          </div>
        ) : null}
        {card.monto ? (
          <div>
            <dt className="font-medium text-zinc-400">Monto</dt>
            <dd className="text-zinc-700">{card.monto}</dd>
          </div>
        ) : null}
        <div className={card.cierre || card.monto ? "sm:col-span-2" : ""}>
          <dt className="font-medium text-zinc-400">Elegibilidad</dt>
          <dd className="text-zinc-700">{ELEG_LABEL[card.elegibilidad]}</dd>
        </div>
      </dl>

      <p className="mt-3 border-l-2 border-zinc-200 pl-3 text-xs italic leading-relaxed text-zinc-500">
        {card.evidencia}
      </p>

      <div className="mt-4 flex justify-end">
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
        >
          Ver convocatoria
          <span aria-hidden>↗</span>
        </a>
      </div>

      <MatchModal
        open={matchOpen}
        card={card}
        onClose={() => setMatchOpen(false)}
      />
    </article>
  );
}

function MatchModal({
  open,
  card,
  onClose,
}: {
  open: boolean;
  card: FundCardType;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-zinc-900/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`match-${card.nombre}`}
        className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Coincidencia {Math.round(card.ajuste)}%
            </p>
            <h4
              id={`match-${card.nombre}`}
              className="mt-1 text-base font-semibold text-zinc-900"
            >
              {card.nombre}
            </h4>
            <p className="text-sm text-zinc-500">{card.organismo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar"
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
        <p className="mt-4 text-sm leading-relaxed text-zinc-700">{card.motivo}</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
