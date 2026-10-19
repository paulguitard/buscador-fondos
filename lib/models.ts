export type EffortLevel = "low" | "medium" | "high";

export type ModelOption = {
  id: string;
  label: string;
  /** Modelo más rápido/barato (perfilado y modo Fast). Si falta, se usa `id`. */
  fastId: string;
};

/** Fallback si no hay OPENROUTER_MODEL ni catálogo configurado. */
export const FALLBACK_MODEL_ID = "deepseek/deepseek-v4.1-flash-1017";

/** Slug por defecto: OPENROUTER_MODEL en el servidor, o el fallback. */
export function defaultModelId(): string {
  if (typeof process !== "undefined") {
    const fromEnv = process.env.OPENROUTER_MODEL?.trim();
    if (fromEnv?.includes("/")) return fromEnv;
  }
  return FALLBACK_MODEL_ID;
}

/** Catálogo por defecto si el usuario aún no configuró modelos. */
export const DEFAULT_MODELS: ModelOption[] = [
  {
    id: FALLBACK_MODEL_ID,
    label: "DeepSeek V4.1 Flash",
    fastId: FALLBACK_MODEL_ID,
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    fastId: "anthropic/claude-haiku-4.5",
  },
  {
    id: "openai/gpt-4.1",
    label: "GPT-4.1",
    fastId: "openai/gpt-4.1-mini",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    fastId: "google/gemini-2.5-flash",
  },
];

/** @deprecated Usar DEFAULT_MODELS o el catálogo del usuario */
export const MODELS = DEFAULT_MODELS;

export const DEFAULT_MODEL_ID = FALLBACK_MODEL_ID;
export const DEFAULT_EFFORT: EffortLevel = "medium";

export const EFFORT_LABELS: Record<EffortLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export type WebSearchBudget = {
  max_results: number;
  max_total_results: number;
  max_uses: number;
  search_context_size: "low" | "medium" | "high";
};

export function effortToSearchBudget(effort: EffortLevel): WebSearchBudget {
  switch (effort) {
    case "low":
      return {
        max_results: 3,
        max_total_results: 9,
        max_uses: 2,
        search_context_size: "low",
      };
    case "high":
      return {
        max_results: 8,
        max_total_results: 24,
        max_uses: 6,
        search_context_size: "medium",
      };
    default:
      return {
        max_results: 5,
        max_total_results: 15,
        max_uses: 4,
        search_context_size: "low",
      };
  }
}

/** Deriva un nombre legible desde un slug OpenRouter. */
export function labelFromSlug(slug: string): string {
  const part = slug.split("/").pop() ?? slug;
  return part
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeModelOption(raw: {
  id?: string;
  label?: string;
  fastId?: string;
}): ModelOption | null {
  const id = raw.id?.trim();
  if (!id || !id.includes("/")) return null;
  const fastId = raw.fastId?.trim() || id;
  const label = raw.label?.trim() || labelFromSlug(id);
  return { id, label, fastId };
}

/**
 * Parsea líneas pegadas. Formatos:
 * - provider/model
 * - Nombre | provider/model
 * - Nombre | provider/model | provider/fast-model
 */
export function parseModelLines(text: string): ModelOption[] {
  const seen = new Set<string>();
  const out: ModelOption[] = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const parts = trimmed.split("|").map((p) => p.trim()).filter(Boolean);
    let option: ModelOption | null = null;

    if (parts.length === 1) {
      option = normalizeModelOption({ id: parts[0] });
    } else if (parts.length === 2) {
      if (parts[1].includes("/")) {
        option = normalizeModelOption({ label: parts[0], id: parts[1] });
      } else if (parts[0].includes("/")) {
        option = normalizeModelOption({ id: parts[0], fastId: parts[1] });
      }
    } else {
      option = normalizeModelOption({
        label: parts[0],
        id: parts[1],
        fastId: parts[2],
      });
    }

    if (option && !seen.has(option.id)) {
      seen.add(option.id);
      out.push(option);
    }
  }

  return out;
}

export function resolveModels(
  modelId: string,
  fast: boolean,
  catalog: ModelOption[] = DEFAULT_MODELS,
): { mainModel: string; profileModel: string; displayLabel: string } {
  const list = catalog.length > 0 ? catalog : DEFAULT_MODELS;
  const requested = modelId.trim() || defaultModelId();
  const fromCatalog = list.find((m) => m.id === requested);
  const option =
    fromCatalog ??
    normalizeModelOption({ id: requested }) ??
    list[0] ??
    normalizeModelOption({ id: FALLBACK_MODEL_ID })!;
  const fastId = option.fastId || option.id;
  return {
    mainModel: fast ? fastId : option.id,
    profileModel: fastId,
    displayLabel: option.label,
  };
}

export function modelLabel(
  modelId: string,
  catalog: ModelOption[] = DEFAULT_MODELS,
): string {
  return catalog.find((m) => m.id === modelId)?.label ?? modelId;
}
