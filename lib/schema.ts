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

/** Si Chile puede postular según la fuente. `no` se oculta en el panel internacional. */
export const postulableDesdeChileSchema = z.enum(["si", "no", "no_dicho"]);

export const fundCardSchema = z.object({
  nombre: z.string().min(1),
  organismo: z.string().min(1),
  url: z.string().url(),
  estado: fundEstadoSchema,
  cierre: z.string().nullable(),
  monto: z.string().nullable(),
  elegibilidad: fundElegibilidadSchema,
  postulable_desde_chile: postulableDesdeChileSchema.optional(),
  ajuste: z.number().min(0).max(100),
  descripcion: z.string().optional(),
  motivo: z.string().min(1),
  evidencia: z.string().min(1),
}).transform((card) => ({
  ...card,
  descripcion: card.descripcion?.trim() || card.motivo,
  postulable_desde_chile: card.postulable_desde_chile ?? "no_dicho",
}));

export type FundCard = z.infer<typeof fundCardSchema>;

export const MAX_FUNDS_PER_GROUP = 20;

export const fundCardsResponseSchema = z.object({
  fondos: z.array(fundCardSchema),
});

/** JSON Schema para OpenRouter structured outputs (perfil). */
export const projectProfileJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "sector",
    "etapa",
    "postulante",
    "region",
    "tipo_financiamiento",
    "palabras_clave_es",
    "palabras_clave_en",
    "resumen",
  ],
  properties: {
    sector: { type: "string" },
    etapa: { type: "string" },
    postulante: { type: "string" },
    region: { type: ["string", "null"] },
    tipo_financiamiento: { type: ["string", "null"] },
    palabras_clave_es: {
      type: "array",
      items: { type: "string" },
      maxItems: 12,
    },
    palabras_clave_en: {
      type: "array",
      items: { type: "string" },
      maxItems: 12,
    },
    resumen: { type: "string" },
  },
} as const;

/** JSON Schema para OpenRouter structured outputs (fichas). */
export const fundCardsJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["fondos"],
  properties: {
    fondos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "nombre",
          "organismo",
          "url",
          "estado",
          "cierre",
          "monto",
          "elegibilidad",
          "postulable_desde_chile",
          "ajuste",
          "descripcion",
          "motivo",
          "evidencia",
        ],
        properties: {
          nombre: { type: "string" },
          organismo: { type: "string" },
          url: { type: "string" },
          estado: {
            type: "string",
            enum: ["abierta", "por_abrir", "cerrada", "no_confirmado"],
          },
          cierre: { type: ["string", "null"] },
          monto: { type: ["string", "null"] },
          elegibilidad: {
            type: "string",
            enum: [
              "directa",
              "punto_nacional",
              "socio_extranjero",
              "no_confirmada",
            ],
          },
          postulable_desde_chile: {
            type: "string",
            enum: ["si", "no", "no_dicho"],
          },
          ajuste: { type: "number", minimum: 0, maximum: 100 },
          descripcion: { type: "string" },
          motivo: { type: "string" },
          evidencia: { type: "string" },
        },
      },
    },
  },
} as const;

export const searchRequestSchema = z.object({
  descripcion: z.string().min(20).max(12000),
  /** Instrucciones extra del usuario; solo se usan si hay texto. */
  afinado: z.string().max(4000).optional(),
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

/** Si hay más del tope, deja las de mayor `ajuste`. Si hay menos, las deja todas. */
export function selectTopMatchingFunds(cards: FundCard[]): FundCard[] {
  if (cards.length <= MAX_FUNDS_PER_GROUP) return cards;
  return [...cards]
    .sort((a, b) => {
      const byAjuste = b.ajuste - a.ajuste;
      if (byAjuste !== 0) return byAjuste;
      return a.nombre.localeCompare(b.nombre, "es");
    })
    .slice(0, MAX_FUNDS_PER_GROUP);
}
