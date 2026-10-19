import {
  DEFAULT_EFFORT,
  DEFAULT_MODEL_ID,
  DEFAULT_MODELS,
  normalizeModelOption,
  type EffortLevel,
  type ModelOption,
} from "./models";
import { DEFAULT_SOURCES, normalizeSourceList } from "./sources";

const KEY_API = "bf_openrouter_api_key";
const KEY_MODEL = "bf_model_id";
const KEY_FAST = "bf_fast";
const KEY_EFFORT = "bf_effort";
const KEY_CATALOG = "bf_model_catalog";
const KEY_SOURCES = "bf_search_sources";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadApiKey(): string {
  if (!canUseStorage()) return "";
  return localStorage.getItem(KEY_API)?.trim() ?? "";
}

export function saveApiKey(key: string): void {
  if (!canUseStorage()) return;
  const trimmed = key.trim();
  if (trimmed) localStorage.setItem(KEY_API, trimmed);
  else localStorage.removeItem(KEY_API);
}

export function loadModelCatalog(): ModelOption[] {
  if (!canUseStorage()) return [...DEFAULT_MODELS];
  const raw = localStorage.getItem(KEY_CATALOG);
  if (!raw) return [...DEFAULT_MODELS];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_MODELS];
    const models = parsed
      .map((item) =>
        normalizeModelOption(
          typeof item === "string"
            ? { id: item }
            : (item as { id?: string; label?: string; fastId?: string }),
        ),
      )
      .filter((m): m is ModelOption => m !== null);
    return models.length > 0 ? models : [...DEFAULT_MODELS];
  } catch {
    return [...DEFAULT_MODELS];
  }
}

export function saveModelCatalog(models: ModelOption[]): void {
  if (!canUseStorage()) return;
  const cleaned = models
    .map((m) => normalizeModelOption(m))
    .filter((m): m is ModelOption => m !== null);
  if (cleaned.length === 0) {
    localStorage.removeItem(KEY_CATALOG);
    return;
  }
  localStorage.setItem(KEY_CATALOG, JSON.stringify(cleaned));
}

export function loadModelId(catalog?: ModelOption[]): string {
  const list = catalog ?? loadModelCatalog();
  if (!canUseStorage()) return list[0]?.id ?? DEFAULT_MODEL_ID;
  const stored = localStorage.getItem(KEY_MODEL)?.trim();
  if (stored && list.some((m) => m.id === stored)) return stored;
  return list[0]?.id ?? DEFAULT_MODEL_ID;
}

export function saveModelId(id: string): void {
  if (!canUseStorage()) return;
  localStorage.setItem(KEY_MODEL, id);
}

export function loadFast(): boolean {
  if (!canUseStorage()) return false;
  return localStorage.getItem(KEY_FAST) === "1";
}

export function saveFast(fast: boolean): void {
  if (!canUseStorage()) return;
  localStorage.setItem(KEY_FAST, fast ? "1" : "0");
}

export function loadEffort(): EffortLevel {
  if (!canUseStorage()) return DEFAULT_EFFORT;
  const stored = localStorage.getItem(KEY_EFFORT);
  if (stored === "low" || stored === "medium" || stored === "high") return stored;
  return DEFAULT_EFFORT;
}

export function saveEffort(effort: EffortLevel): void {
  if (!canUseStorage()) return;
  localStorage.setItem(KEY_EFFORT, effort);
}

export function loadSearchSources(): string[] {
  if (!canUseStorage()) return [...DEFAULT_SOURCES];
  const raw = localStorage.getItem(KEY_SOURCES);
  if (!raw) return [...DEFAULT_SOURCES];
  try {
    const parsed = normalizeSourceList(JSON.parse(raw) as unknown);
    return parsed;
  } catch {
    return [...DEFAULT_SOURCES];
  }
}

export function saveSearchSources(urls: string[]): void {
  if (!canUseStorage()) return;
  const cleaned = normalizeSourceList(urls);
  localStorage.setItem(KEY_SOURCES, JSON.stringify(cleaned));
}
