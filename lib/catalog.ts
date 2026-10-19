/** Dominios chilenos (gobierno y agencias) para filtrar el grupo internacional. No se usan para priorizar la búsqueda. */
export const CHILE_ORIGIN_DOMAINS = [
  "corfo.cl",
  "anid.cl",
  "mineduc.cl",
  "sercotec.cl",
  "fosis.gob.cl",
  "indap.gob.cl",
  "gore.cl",
  "startupchile.org",
  "agenciase.cl",
  "fondos.gob.cl",
  "gob.cl",
  "mop.cl",
  "mop.gob.cl",
  "dga.cl",
  "dga.gob.cl",
  "economia.gob.cl",
  "minciencia.gob.cl",
  "mma.gob.cl",
  "subdere.gov.cl",
  "subdere.gob.cl",
] as const;

const CHILE_ORGANISM_PATTERNS = [
  /\bcorfo\b/i,
  /\banid\b/i,
  /\bsercotec\b/i,
  /\bfosis\b/i,
  /\bindap\b/i,
  /\bmineduc\b/i,
  /\bgore\b/i,
  /\bstart-?up chile\b/i,
  /\bministerio de obras públicas\b/i,
  /\bmop\b/i,
  /\bdirección general de aguas\b/i,
  /\bdga\b/i,
  /\bagencia de sostenibilidad energética\b/i,
  /\bminciencia\b/i,
  /\bconicyt\b/i,
  /\bfondos\.gob\.cl\b/i,
  /\bgobierno de chile\b/i,
  /\bgobierno regional\b/i,
];

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function hostnameIsChilean(host: string): boolean {
  if (host.endsWith(".gob.cl") || host.endsWith(".gov.cl")) return true;
  return CHILE_ORIGIN_DOMAINS.some(
    (d) => host === d || host.endsWith(`.${d}`),
  );
}

/** Fondo nacional chileno (no debe ir al panel internacional). */
export function isChileanNationalFund(card: {
  nombre: string;
  organismo: string;
  url: string;
}): boolean {
  const host = hostnameOf(card.url);
  if (host && hostnameIsChilean(host)) return true;

  const blob = `${card.nombre} ${card.organismo}`;
  return CHILE_ORGANISM_PATTERNS.some((re) => re.test(blob));
}
