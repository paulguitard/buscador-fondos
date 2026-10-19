import { z } from "zod";

export const projectProfileSchema = z.object({
  sector: z.string(),
  etapa: z.string(),
  postulante: z.string(),
  region: z.string().nullable(),
  tipo_financiamiento: z.string().nullable(),
  palabras_clave_es: z.array(z.string()).max(12),
  palabras_clave_en: z.array(z.string()).max(12),
  resumen: z.string(),
});

export type ProjectProfile = z.infer<typeof projectProfileSchema>;

export const fundEstadoSchema = z.enum([
  "abierta",
  "por_abrir",
  "cerrada",
  "no_confirmado",
]);

export const fundElegibilidadSchema = z.enum([
  "directa",
  "punto_nacional",
  "socio_extranjero",
  "no_confirmada",
]);

export const fundCardSchema = z.object({
  nombre: z.string().min(1),
  organismo: z.string().min(1),
  url: z.string().url(),
  estado: fundEstadoSchema,
  cierre: z.string().nullable(),
  monto: z.string().nullable(),
  elegibilidad: fundElegibilidadSchema,
  ajuste: z.number().min(0).max(100),
  descripcion: z.string().optional(),
  motivo: z.string().min(1),
  evidencia: z.string().min(1),
}).transform((card) => ({
  ...card,
  descripcion: card.descripcion?.trim() || card.motivo,
}));

export type FundCard = z.infer<typeof fundCardSchema>;

export const fundCardsResponseSchema = z.object({
  fondos: z.array(fundCardSchema),
});

export const effortSchema = z.enum(["low", "medium", "high"]);

export const modelOptionSchema = z.object({
  id: z.string().min(3).max(120),
  label: z.string().max(120).optional(),
  fastId: z.string().min(3).max(120).optional(),
});

export const searchRequestSchema = z.object({
  descripcion: z.string().min(20).max(12000),
  organizacion: z.string().max(200).optional(),
  region: z.string().max(120).optional(),
  monto: z.string().max(120).optional(),
  apiKey: z.string().max(500).optional(),
  model: z.string().min(3).max(120).optional(),
  fast: z.boolean().optional(),
  effort: effortSchema.optional(),
  models: z.array(modelOptionSchema).max(40).optional(),
  sources: z.array(z.string().url().max(500)).max(40).optional(),
  /** Fecha local del navegador (YYYY-MM-DD) para clasificar convocatorias abiertas. */
  hoy: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;

export type FundGroup = "chile" | "internacional";

export type SseStatusEvent = {
  type: "status";
  message: string;
};

export type SseCardEvent = {
  type: "card";
  group: FundGroup;
  card: FundCard;
};

export type SseGroupDoneEvent = {
  type: "group_done";
  group: FundGroup;
  count: number;
};

export type SseErrorEvent = {
  type: "error";
  message: string;
  group?: FundGroup;
};

export type SseDoneEvent = {
  type: "done";
};

export type SseEvent =
  | SseStatusEvent
  | SseCardEvent
  | SseGroupDoneEvent
  | SseErrorEvent
  | SseDoneEvent;

const ESTADO_ORDER: Record<z.infer<typeof fundEstadoSchema>, number> = {
  abierta: 0,
  por_abrir: 1,
  no_confirmado: 2,
  cerrada: 3,
};

export function sortFundCards(cards: FundCard[]): FundCard[] {
  return [...cards].sort((a, b) => {
    const byEstado = ESTADO_ORDER[a.estado] - ESTADO_ORDER[b.estado];
    if (byEstado !== 0) return byEstado;
    return b.ajuste - a.ajuste;
  });
}
