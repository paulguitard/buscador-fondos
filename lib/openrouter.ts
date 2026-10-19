import { SEARCH_BUDGET, type WebSearchBudget } from "./models";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type UrlCitation = {
  url: string;
  title?: string;
  content?: string;
  start_index?: number;
  end_index?: number;
};

export type ChatCompletionResult = {
  content: string;
  citations: UrlCitation[];
  raw: unknown;
};

type Annotation = {
  type?: string;
  url_citation?: UrlCitation;
};

function buildWebSearchTool(budget: WebSearchBudget) {
  return {
    type: "openrouter:web_search" as const,
    parameters: {
      engine: "exa" as const,
      max_results: budget.max_results,
      max_total_results: budget.max_total_results,
      max_uses: budget.max_uses,
      search_context_size: budget.search_context_size,
    },
  };
}

export function resolveApiKey(): string {
  const fromEnv = process.env.OPENROUTER_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  throw new Error("Falta OPENROUTER_API_KEY en el entorno del servidor.");
}

function extractJsonText(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return trimmed;
}

export function parseJsonFromContent(content: string): unknown {
  return JSON.parse(extractJsonText(content));
}

function collectCitations(message: {
  annotations?: Annotation[];
  content?: string | null;
}): UrlCitation[] {
  const fromAnnotations =
    message.annotations
      ?.filter((a) => a.type === "url_citation" && a.url_citation?.url)
      .map((a) => a.url_citation!) ?? [];

  const urls = new Map<string, UrlCitation>();
  for (const c of fromAnnotations) {
    urls.set(c.url, c);
  }

  const content = message.content ?? "";
  const urlRegex = /https?:\/\/[^\s\)\]\>\"\']+/g;
  for (const match of content.matchAll(urlRegex)) {
    const cleaned = match[0].replace(/[.,;:]+$/, "");
    if (!urls.has(cleaned)) {
      urls.set(cleaned, { url: cleaned });
    }
  }

  return [...urls.values()];
}

export async function chatCompletion(options: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  useWebSearch?: boolean;
  temperature?: number;
  signal?: AbortSignal;
}): Promise<ChatCompletionResult> {
  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.2,
    reasoning: { effort: "high" },
  };

  if (options.useWebSearch) {
    body.tools = [buildWebSearchTool(SEARCH_BUDGET)];
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Busqueda de Fondos",
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    let detail = errText.slice(0, 400);
    try {
      const parsed = JSON.parse(errText) as { error?: { message?: string } };
      if (parsed.error?.message) detail = parsed.error.message;
    } catch {
      /* keep raw */
    }
    throw new Error(`OpenRouter ${response.status}: ${detail || response.statusText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        annotations?: Annotation[];
      };
    }>;
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(data.error.message);
  }

  const message = data.choices?.[0]?.message;
  if (!message) {
    throw new Error("OpenRouter no devolvió una respuesta válida.");
  }

  const content = message.content?.trim() ?? "";
  return {
    content,
    citations: collectCitations(message),
    raw: data,
  };
}
