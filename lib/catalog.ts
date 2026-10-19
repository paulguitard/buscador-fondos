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

/** País o sede extranjera en el nombre/organismo (aunque el programa se ejecute en Chile). */
const FOREIGN_COUNTRY_PATTERNS = [
  /\breino unido\b/i,
  /\bunited kingdom\b/i,
  /\bgran bretaña\b/i,
  /\binglaterra\b/i,
  /\buk\b/i,
  /\bee\.?\s*uu\.?\b/i,
  /\bestados unidos\b/i,
  /\bunited states\b/i,
  /\busa\b/i,
  /\bcanadá\b/i,
  /\bcanada\b/i,
  /\balemania\b/i,
  /\bgermany\b/i,
  /\bfrancia\b/i,
  /\bfrance\b/i,
  /\bsuiza\b/i,
  /\bswitzerland\b/i,
  /\bespaña\b/i,
  /\bspain\b/i,
  /\bitalia\b/i,
  /\bitaly\b/i,
  /\bpaíses bajos\b/i,
  /\bnetherlands\b/i,
  /\bholanda\b/i,
  /\bjapón\b/i,
  /\bjapan\b/i,
  /\baustralia\b/i,
  /\bnoruega\b/i,
  /\bnorway\b/i,
  /\bsuecia\b/i,
  /\bsweden\b/i,
  /\bbélgica\b/i,
  /\bbelgium\b/i,
  /\bportugal\b/i,
  /\birlanda\b/i,
  /\bireland\b/i,
  /\bméxico\b/i,
  /\bmexico\b/i,
  /\bbrasil\b/i,
  /\bbrazil\b/i,
  /\bargentina\b/i,
  /\bperú\b/i,
  /\bperu\b/i,
  /\bcolombia\b/i,
];

const FOREIGN_ORG_PATTERNS = [
  /\bborrow foundation\b/i,
  /\bdental trade alliance\b/i,
  /\bbanco interamericano\b/i,
  /\binter-american development\b/i,
  /\bidb\b/i,
  /\bbid\b/i,
  /\bbanco mundial\b/i,
  /\bworld bank\b/i,
  /\bcorporación andina de fomento\b/i,
  /\bcaf\b/i,
  /\bpnud\b/i,
  /\bundp\b/i,
  /\bunión europea\b/i,
  /\beuropean (union|commission)\b/i,
  /\bhorizon europe\b/i,
  /\brotary international\b/i,
  /\bunesco\b/i,
  /\busaid\b/i,
  /\bwellcome trust\b/i,
  /\bbill &? melinda gates\b/i,
  /\bgates foundation\b/i,
  /\borganización mundial de la salud\b/i,
  /\bworld health organization\b/i,
  /\bwho\b/i,
  /\boms\b/i,
  /\bnaciones unidas\b/i,
  /\bunited nations\b/i,
  /\bfao\b/i,
  /\bocde\b/i,
  /\boecd\b/i,
];

/** ccTLD que no es Chile: el otorgante no es un organismo chileno. */
const FOREIGN_CCTLD = new Set([
  "uk",
  "gb",
  "eu",
  "de",
  "fr",
  "es",
  "it",
  "nl",
  "be",
  "ch",
  "se",
  "no",
  "dk",
  "fi",
  "ie",
  "pt",
  "at",
  "jp",
  "au",
  "nz",
  "ca",
  "us",
  "br",
  "mx",
  "ar",
  "pe",
  "co",
  "uy",
  "py",
  "bo",
  "ec",
  "ve",
  "in",
  "cn",
  "kr",
  "sg",
  "za",
  "int",
]);

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function hostnameIsChilean(host: string): boolean {
  if (host.endsWith(".cl")) return true;
  return CHILE_ORIGIN_DOMAINS.some(
    (d) => host === d || host.endsWith(`.${d}`),
  );
}

/** La fuente restringe el fondo a zonas que no incluyen a Chile. */
export function isClosedToChileApplicants(card: {
  postulable_desde_chile: "si" | "no" | "no_dicho";
}): boolean {
  return card.postulable_desde_chile === "no";
}

type FundOriginCard = {
  nombre: string;
  organismo: string;
  url: string;
};

function hostnameHasForeignCctld(host: string): boolean {
  const labels = host.split(".");
  for (let i = 0; i < labels.length; i++) {
    const tld = labels.slice(i).join(".");
    if (tld === "gob.cl" || tld === "gov.cl" || tld.endsWith(".cl")) return false;
  }
  const last = labels[labels.length - 1];
  if (last && FOREIGN_CCTLD.has(last)) return true;
  if (labels.length >= 2 && labels[labels.length - 1] === "uk") return true;
  return false;
}

/** Fondo nacional chileno (no debe ir al panel internacional). */
export function isChileanNationalFund(card: FundOriginCard): boolean {
  const host = hostnameOf(card.url);
  if (host && hostnameIsChilean(host)) return true;

  const blob = `${card.nombre} ${card.organismo}`;
  return CHILE_ORGANISM_PATTERNS.some((re) => re.test(blob));
}

/**
 * Otorgante extranjero o multilateral. Aunque financie trabajo en Chile,
 * no pertenece al panel de fondos nacionales.
 */
export function isClearlyForeignFund(card: FundOriginCard): boolean {
  if (isChileanNationalFund(card)) return false;

  const blob = `${card.nombre} ${card.organismo}`;
  if (FOREIGN_COUNTRY_PATTERNS.some((re) => re.test(blob))) return true;
  if (FOREIGN_ORG_PATTERNS.some((re) => re.test(blob))) return true;

  const host = hostnameOf(card.url);
  if (host && hostnameHasForeignCctld(host)) return true;

  return false;
}

export function belongsInChilePanel(card: FundOriginCard): boolean {
  return isChileanNationalFund(card) || !isClearlyForeignFund(card);
}

export function belongsInInternationalPanel(card: FundOriginCard): boolean {
  return !isChileanNationalFund(card);
}
