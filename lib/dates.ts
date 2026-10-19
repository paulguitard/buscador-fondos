import type { FundCard } from "./schema";

const MONTHS: Record<string, number> = {
  enero: 1,
  january: 1,
  ene: 1,
  jan: 1,
  febrero: 2,
  february: 2,
  feb: 2,
  marzo: 3,
  march: 3,
  mar: 3,
  abril: 4,
  april: 4,
  abr: 4,
  apr: 4,
  mayo: 5,
  may: 5,
  junio: 6,
  june: 6,
  jun: 6,
  julio: 7,
  july: 7,
  jul: 7,
  agosto: 8,
  august: 8,
  ago: 8,
  aug: 8,
  septiembre: 9,
  september: 9,
  sep: 9,
  sept: 9,
  octubre: 10,
  october: 10,
  oct: 10,
  noviembre: 11,
  november: 11,
  nov: 11,
  diciembre: 12,
  december: 12,
  dic: 12,
  dec: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Fecha local del computador en YYYY-MM-DD. */
export function localTodayYmd(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function parseYmd(value: string): string | null {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

function ymd(y: number, m: number, d: number): string | null {
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  if (y < 1990 || y > 2100) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Extrae una fecha de cierre desde texto libre (19/03/2026, 2026-03-19, 19 de marzo de 2026).
 */
export function parseDateFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  const raw = text.trim();
  if (!raw) return null;

  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return ymd(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dmy = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const a = Number(dmy[1]);
    const b = Number(dmy[2]);
    const y = Number(dmy[3]);
    // Si el primero > 12, es día/mes/año. Si el segundo > 12, es mes/día/año.
    if (a > 12) return ymd(y, b, a);
    if (b > 12) return ymd(y, a, b);
    return ymd(y, b, a); // Chile: día/mes/año
  }

  const named = raw.match(
    /(\d{1,2})\s+de\s+([A-Za-záéíóúñ]+)\s+(?:de\s+)?(\d{4})/i,
  );
  if (named) {
    const month =
      MONTHS[
        named[2]
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
      ];
    if (month) return ymd(Number(named[3]), month, Number(named[1]));
  }

  const enNamed = raw.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (enNamed) {
    const month = MONTHS[enNamed[1].toLowerCase()];
    if (month) return ymd(Number(enNamed[3]), month, Number(enNamed[2]));
  }

  return null;
}

function compareYmd(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Recalcula el estado con la fecha de hoy del usuario.
 * Si hay fecha de cierre: hoy <= cierre → abierta (salvo que ya se marcó por_abrir);
 * hoy > cierre → cerrada.
 */
export function reconcileEstado(
  card: FundCard,
  todayYmd: string,
): FundCard["estado"] {
  const cierre = parseDateFromText(card.cierre);

  if (cierre) {
    if (compareYmd(cierre, todayYmd) < 0) return "cerrada";
    if (card.estado === "por_abrir") return "por_abrir";
    return "abierta";
  }

  if (card.estado === "abierta") return "no_confirmado";
  return card.estado;
}

export function applyTodayToCards(
  cards: FundCard[],
  todayYmd: string,
): FundCard[] {
  return cards.map((card) => ({
    ...card,
    estado: reconcileEstado(card, todayYmd),
  }));
}
