/** Semillas de consulta (no filtro cerrado). El modelo puede salir de esta lista. */

export const CHILE_DOMAINS = [
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
] as const;

export const CHILE_INSTRUMENTS = [
  "Corfo Semilla",
  "Corfo Crea y Valida",
  "Start-Up Chile",
  "ANID FONDEF",
  "ANID FONDECYT",
  "Sercotec Capital Abeja",
  "Sercotec Crece",
  "FOSIS",
  "INDAP",
  "fondos regionales GORE",
  "Mineduc",
  "fundaciones privadas Chile",
] as const;

export const INTERNATIONAL_DOMAINS = [
  "iadb.org",
  "bidlab.org",
  "europa.eu",
  "ec.europa.eu",
  "caf.com",
  "greenclimate.fund",
  "undp.org",
  "worldbank.org",
  "unesco.org",
  "oecd.org",
] as const;

export const INTERNATIONAL_INSTRUMENTS = [
  "BID Lab",
  "Horizon Europe",
  "Erasmus+",
  "CAF",
  "Green Climate Fund",
  "PNUD",
  "Banco Mundial",
  "UNESCO",
  "IDRC",
  "USAID",
] as const;

/** Dominios chilenos extra (gobierno y agencias) para filtrar el grupo internacional. */
export const CHILE_ORIGIN_DOMAINS = [
  ...CHILE_DOMAINS,
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
  "agenciase.cl",
  "corfo.cl",
  "anid.cl",
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
