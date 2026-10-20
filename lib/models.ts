/** Modelo único de la app (slug OpenRouter). */
export const APP_MODEL_ID = "deepseek/deepseek-v4.1-flash";
export const APP_MODEL_LABEL = "DeepSeek V4.1 Flash";
/** Endpoint de proveedor OpenRouter (Open Inference FP4). */
export const APP_PROVIDER_ID = "open-inference/fp4";

export type WebSearchBudget = {
  max_results: number;
  max_total_results: number;
  max_uses: number;
  search_context_size: "low" | "medium" | "high";
};

/**
 * 3 consultas × 10 resultados: Exa cobra $0.007 por consulta con 10 resultados
 * incluidos; del 11 en adelante suma $0.001 c/u. El panel muestra máx. 20 fichas.
 * search_context_size "low" (~5k caracteres/resultado): el extractor ya recorta citas.
 */
export const SEARCH_BUDGET: WebSearchBudget = {
  max_results: 10,
  max_total_results: 30,
  max_uses: 3,
  search_context_size: "low",
};

export function resolveModels(): {
  mainModel: string;
  profileModel: string;
  displayLabel: string;
} {
  return {
    mainModel: APP_MODEL_ID,
    profileModel: APP_MODEL_ID,
    displayLabel: APP_MODEL_LABEL,
  };
}
