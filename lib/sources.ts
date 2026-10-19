export const DEFAULT_SOURCES = ["https://www.convoca.io/"] as const;

export function normalizeSourceUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function parseSourceLines(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const url = normalizeSourceUrl(line);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function normalizeSourceList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const url = typeof item === "string" ? normalizeSourceUrl(item) : null;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function sourcesPromptBlock(urls: string[]): string {
  if (urls.length === 0) return "";
  return `Páginas prioritarias del usuario. Debes consultarlas (búsqueda site:dominio o la URL directa) además de la web abierta:
${urls.map((u) => `- ${u}`).join("\n")}`;
}
