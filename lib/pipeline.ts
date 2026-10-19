import { isChileanNationalFund } from "./catalog";
import { applyTodayToCards, localTodayYmd, parseYmd } from "./dates";
import { normalizeSourceList } from "./sources";
import {
  defaultModelId,
  normalizeModelOption,
  resolveModels,
  type EffortLevel,
  type ModelOption,
} from "./models";
import {
  chatCompletion,
  parseJsonFromContent,
  resolveApiKey,
  type ChatMessage,
  type UrlCitation,
} from "./openrouter";
import {
  PROJECT_SUMMARY_CHARS,
  buildExtractSystemPrompt,
  buildExtractUserPrompt,
  buildProfileSystemPrompt,
  buildProfileUserPrompt,
  buildSearchSystemPrompt,
  buildSearchUserPrompt,
} from "./prompts";
import {
  fundCardsResponseSchema,
  projectProfileSchema,
  sortFundCards,
  type FundCard,
  type FundGroup,
  type ProjectProfile,
  type SearchRequest,
  type SseEvent,
} from "./schema";

export type EmitFn = (event: SseEvent) => void;

type PipelineConfig = {
  apiKey: string;
  mainModel: string;
  profileModel: string;
  effort: EffortLevel;
  todayYmd: string;
  sources: string[];
};

function catalogFromRequest(input: SearchRequest): ModelOption[] {
  if (!input.models?.length) return [];
  return input.models
    .map((m) => normalizeModelOption(m))
    .filter((m): m is ModelOption => m !== null);
}

function configFromRequest(input: SearchRequest): PipelineConfig {
  const catalog = catalogFromRequest(input);
  const resolved = resolveModels(
    input.model?.trim() || defaultModelId(),
    Boolean(input.fast),
    catalog,
  );
  return {
    apiKey: resolveApiKey(input.apiKey),
    mainModel: resolved.mainModel,
    profileModel: resolved.profileModel,
    effort: input.effort ?? "medium",
    todayYmd: parseYmd(input.hoy ?? "") ?? localTodayYmd(),
    sources: normalizeSourceList(input.sources ?? []),
  };
}

async function profileProject(
  input: SearchRequest,
  config: PipelineConfig,
  signal?: AbortSignal,
): Promise<ProjectProfile> {
  const fullText = input.descripcion.trim();
  const needsSummary = fullText.length >= PROJECT_SUMMARY_CHARS;

  const result = await chatCompletion({
    apiKey: config.apiKey,
    model: config.profileModel,
    messages: [
      { role: "system", content: buildProfileSystemPrompt(needsSummary) },
      { role: "user", content: buildProfileUserPrompt(input, needsSummary) },
    ],
    temperature: 0.1,
    signal,
  });

  const parsed = projectProfileSchema.safeParse(parseJsonFromContent(result.content));
  if (parsed.success) {
    return needsSummary
      ? parsed.data
      : { ...parsed.data, resumen: fullText };
  }

  const retry = await chatCompletion({
    apiKey: config.apiKey,
    model: config.profileModel,
    messages: [
      { role: "system", content: buildProfileSystemPrompt(needsSummary) },
      { role: "user", content: buildProfileUserPrompt(input, needsSummary) },
      { role: "assistant", content: result.content },
      {
        role: "user",
        content: `El JSON no validó: ${parsed.error.message}. Devuelve SOLO el JSON corregido.`,
      },
    ],
    temperature: 0,
    signal,
  });

  const retried = projectProfileSchema.safeParse(parseJsonFromContent(retry.content));
  if (!retried.success) {
    throw new Error("No se pudo perfilar el proyecto. Revisa la descripción.");
  }
  return needsSummary
    ? retried.data
    : { ...retried.data, resumen: fullText };
}

async function extractCards(
  group: FundGroup,
  report: string,
  citations: UrlCitation[],
  profile: ProjectProfile,
  config: PipelineConfig,
  signal?: AbortSignal,
): Promise<FundCard[]> {
  const attempt = async (previous?: string, errorMsg?: string) => {
    const messages: ChatMessage[] = [
      { role: "system", content: buildExtractSystemPrompt(group) },
      {
        role: "user",
        content: buildExtractUserPrompt(
          group,
          report,
          citations,
          profile,
          config.todayYmd,
        ),
      },
    ];

    if (previous && errorMsg) {
      messages.push(
        { role: "assistant", content: previous },
        {
          role: "user",
          content: `El JSON no validó: ${errorMsg}. Devuelve SOLO el JSON corregido. Omite fichas sin URL válida.`,
        },
      );
    }

    return chatCompletion({
      apiKey: config.apiKey,
      model: config.mainModel,
      messages,
      temperature: 0,
      signal,
    });
  };

  const first = await attempt();
  let parsed = fundCardsResponseSchema.safeParse(parseJsonFromContent(first.content));

  if (!parsed.success) {
    const second = await attempt(first.content, parsed.error.message);
    parsed = fundCardsResponseSchema.safeParse(parseJsonFromContent(second.content));
  }

  if (!parsed.success) {
    throw new Error(`No se pudieron estructurar fondos (${group}).`);
  }

  const citationUrls = new Set(citations.map((c) => c.url));
  const withValidUrl = parsed.data.fondos.filter((card) => {
    try {
      const u = new URL(card.url);
      if (!["http:", "https:"].includes(u.protocol)) return false;
      if (citationUrls.size === 0) return true;
      return (
        citationUrls.has(card.url) ||
        [...citationUrls].some(
          (c) => card.url.startsWith(c) || c.startsWith(card.url.split("?")[0]),
        )
      );
    } catch {
      return false;
    }
  });

  const scoped =
    group === "internacional"
      ? withValidUrl.filter((card) => !isChileanNationalFund(card))
      : withValidUrl;

  return sortFundCards(applyTodayToCards(scoped, config.todayYmd));
}

async function searchGroup(
  group: FundGroup,
  input: SearchRequest,
  profile: ProjectProfile,
  config: PipelineConfig,
  emit: EmitFn,
  signal?: AbortSignal,
): Promise<void> {
  const statusMsg =
    group === "chile"
      ? "Buscando en Chile…"
      : "Buscando convocatorias internacionales…";
  emit({ type: "status", message: statusMsg });

  try {
    const search = await chatCompletion({
      apiKey: config.apiKey,
      model: config.mainModel,
      messages: [
        { role: "system", content: buildSearchSystemPrompt(group, config.sources) },
        {
          role: "user",
          content: buildSearchUserPrompt(
            group,
            profile,
            input,
            config.todayYmd,
            config.sources,
          ),
        },
      ],
      useWebSearch: true,
      effort: config.effort,
      temperature: 0.2,
      signal,
    });

    if (!search.content.trim()) {
      emit({
        type: "error",
        group,
        message: `La búsqueda (${group}) no devolvió contenido.`,
      });
      emit({ type: "group_done", group, count: 0 });
      return;
    }

    emit({
      type: "status",
      message:
        group === "chile"
          ? "Ordenando resultados de Chile…"
          : "Ordenando resultados internacionales…",
    });

    const cards = await extractCards(
      group,
      search.content,
      search.citations,
      profile,
      config,
      signal,
    );

    for (const card of cards) {
      if (signal?.aborted) break;
      emit({ type: "card", group, card });
    }

    emit({ type: "group_done", group, count: cards.length });
  } catch (err) {
    if (signal?.aborted) return;
    const message =
      err instanceof Error ? err.message : `Error en búsqueda (${group}).`;
    emit({ type: "error", group, message });
    emit({ type: "group_done", group, count: 0 });
  }
}

export async function runSearchPipeline(
  input: SearchRequest,
  emit: EmitFn,
  signal?: AbortSignal,
): Promise<void> {
  let config: PipelineConfig;
  try {
    config = configFromRequest(input);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Falta la API key de OpenRouter.";
    emit({ type: "error", message });
    emit({ type: "done" });
    return;
  }

  const needsSummary = input.descripcion.trim().length >= PROJECT_SUMMARY_CHARS;
  emit({
    type: "status",
    message: needsSummary
      ? "Resumiendo el proyecto…"
      : "Leyendo el proyecto…",
  });

  let profile: ProjectProfile;
  try {
    profile = await profileProject(input, config, signal);
  } catch (err) {
    if (signal?.aborted) {
      emit({ type: "done" });
      return;
    }
    const message =
      err instanceof Error ? err.message : "No se pudo leer el proyecto.";
    emit({ type: "error", message });
    emit({ type: "done" });
    return;
  }

  if (signal?.aborted) {
    emit({ type: "done" });
    return;
  }

  emit({
    type: "status",
    message: needsSummary
      ? `Resumen listo (~${profile.resumen.length} caracteres). Buscando fondos…`
      : `Perfil listo: ${profile.sector}. Buscando fondos…`,
  });

  await Promise.all([
    searchGroup("chile", input, profile, config, emit, signal),
    searchGroup("internacional", input, profile, config, emit, signal),
  ]);

  if (!signal?.aborted) {
    emit({ type: "status", message: "Búsqueda terminada." });
  }
  emit({ type: "done" });
}
