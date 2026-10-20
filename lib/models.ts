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
 * Tope de Exa/OpenRouter: 25 resultados por llamada.
 * max_total_results y max_uses altos para cubrir más consultas distintas.
 * search_context_size "low" (~5k caracteres/resultado): el extractor ya recorta citas.
 */
export const SEARCH_BUDGET: WebSearchBudget = {
  max_results: 25,
  max_total_results: 50,
  max_uses: 10,
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
