import {
  CHILE_DOMAINS,
  CHILE_INSTRUMENTS,
  INTERNATIONAL_DOMAINS,
  INTERNATIONAL_INSTRUMENTS,
} from "./catalog";
import { sourcesPromptBlock } from "./sources";
import type { ProjectProfile, SearchRequest } from "./schema";

/** Umbral: bajo esto se usa el texto completo; sobre esto se resume a ~este largo. */
export const PROJECT_SUMMARY_CHARS = 2000;

export function buildProfileSystemPrompt(needsSummary: boolean): string {
  const resumenRule = needsSummary
    ? `"resumen": string (~${PROJECT_SUMMARY_CHARS} caracteres). Debe abarcar TODO el texto del proyecto (objetivos, actividades, beneficiarios, tecnología, etapa, territorio, impacto). No omitas temas importantes. Apunta a unos ${PROJECT_SUMMARY_CHARS} caracteres (±15%).`
    : `"resumen": string. Copia el texto del proyecto COMPLETO, sin acortar ni parafrasear.`;

  return `Eres un analista de financiamiento para proyectos en Chile.
Extrae un perfil estructurado del texto del proyecto.
Responde SOLO con JSON válido, sin markdown ni comentarios.
Esquema:
{
  "sector": string,
  "etapa": string,
  "postulante": string,
  "region": string | null,
  "tipo_financiamiento": string | null,
  "palabras_clave_es": string[] (máx 12),
  "palabras_clave_en": string[] (máx 12),
  ${resumenRule}
}`;
}

export function buildProfileUserPrompt(
  input: SearchRequest,
  needsSummary: boolean,
): string {
  const extras = [
    input.organizacion ? `Organización: ${input.organizacion}` : null,
    input.region ? `Región: ${input.region}` : null,
    input.monto ? `Monto aproximado: ${input.monto}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const resumenHint = needsSummary
    ? `\nEl texto supera ${PROJECT_SUMMARY_CHARS} caracteres: genera un "resumen" de aproximadamente ${PROJECT_SUMMARY_CHARS} caracteres que cubra el contenido completo.`
    : `\nEl texto tiene menos de ${PROJECT_SUMMARY_CHARS} caracteres: en "resumen" pega el texto completo sin resumir.`;

  return `Descripción del proyecto:
${input.descripcion}
${extras ? `\nDatos adicionales:\n${extras}` : ""}
${resumenHint}`;
}

export function buildSearchSystemPrompt(
  group: "chile" | "internacional",
  sourceUrls: string[] = [],
): string {
  const sources = sourcesPromptBlock(sourceUrls);
  const closedRule =
    "NO descartes un fondo solo porque la convocatoria ya cerró. Inclúyelo igual, con su fecha de cierre; el listado las pondrá abajo.";

  if (group === "chile") {
    return `Eres un investigador de convocatorias de financiamiento en Chile.
Busca fondos y convocatorias que calcen con el proyecto: abiertas, por abrir y también cerradas (si calzan).
Prioriza sitios oficiales (${CHILE_DOMAINS.join(", ")}) y luego la web abierta.
Instrumentos de referencia (semillas, no lista cerrada): ${CHILE_INSTRUMENTS.join(", ")}.
Haz varias búsquedas enfocadas (oficiales, agregadores y web abierta). Incluye organismos públicos y privados.
Para cada fondo encontrado, indica nombre, organismo, URL, plazos de cierre con fecha concreta, montos SOLO si aparecen en la fuente, y por qué calza.
El estado abierta/cerrada debe basarse en la fecha de HOY que te indican, no en tu conocimiento entrenado.
${closedRule}
${sources}
Cita las páginas que uses. No inventes fechas ni montos.`;
  }

  return `Eres un investigador de fondos INTERNACIONALES (multilaterales, de la UE, de otros países o de organismos globales) a los que un proyecto desde Chile podría postular.
Busca convocatorias de organismos como BID/IDB, BID Lab, CAF, UE (Horizon, Erasmus), PNUD, Banco Mundial, GCF, UNESCO, IDRC, USAID u otros fondos NO chilenos.
Prioriza (${INTERNATIONAL_DOMAINS.join(", ")}) y luego la web abierta.
Instrumentos de referencia: ${INTERNATIONAL_INSTRUMENTS.join(", ")}.
PROHIBIDO incluir fondos nacionales o regionales de Chile: Corfo, ANID, Sercotec, Mineduc, FOSIS, INDAP, GORE, MOP, DGA, Start-Up Chile, fondos.gob.cl u otros ministerios/agencias chilenas. Esos van SOLO al grupo Chile.
Haz varias búsquedas enfocadas. Si la página NO dice que Chile (o LAC / países en desarrollo) puede postular, márcalo como no confirmado.
El estado abierta/cerrada debe basarse en la fecha de HOY que te indican.
${closedRule}
${sources}
Cita las páginas. No inventes elegibilidad, plazos ni montos.`;
}

export function buildSearchUserPrompt(
  group: "chile" | "internacional",
  profile: ProjectProfile,
  input: SearchRequest,
  todayYmd: string,
  sourceUrls: string[] = [],
): string {
  const scope =
    group === "chile"
      ? "Busca fondos chilenos (públicos y privados) que calcen. Incluye abiertas, por abrir y cerradas."
      : "Busca SOLO fondos internacionales (no Corfo, ANID, MOP ni otras agencias de Chile). Organismos extranjeros o multilaterales a los que Chile o Latinoamérica puedan postular. Incluye también convocatorias ya cerradas si calzan.";

  const sources = sourcesPromptBlock(sourceUrls);

  return `${scope}
Fecha de HOY: ${todayYmd}. Úsala para etiquetar abierta/cerrada; no uses la fecha para excluir fondos.
${sources ? `\n${sources}\n` : ""}

Perfil del proyecto:
- Sector: ${profile.sector}
- Etapa: ${profile.etapa}
- Quién postula: ${profile.postulante}
- Región: ${profile.region ?? "no indicada"}
- Tipo de financiamiento: ${profile.tipo_financiamiento ?? "no indicado"}
- Palabras clave ES: ${profile.palabras_clave_es.join(", ")}
- Palabras clave EN: ${profile.palabras_clave_en.join(", ")}
- Texto del proyecto:
${profile.resumen}`;
}

export function buildExtractSystemPrompt(group: "chile" | "internacional"): string {
  const groupRule =
    group === "internacional"
      ? `- Este grupo es SOLO internacional. DESCARTA cualquier fondo de organismos chilenos (Corfo, ANID, Sercotec, MOP, DGA, Mineduc, FOSIS, INDAP, GORE, Start-Up Chile, ministerios de Chile, .gob.cl).
- BID/IDB, CAF, UE, PNUD, Banco Mundial y similares SÍ son internacionales.`
      : `- Este grupo es SOLO Chile. Incluye organismos públicos y privados chilenos. DESCARTA fondos de la UE, BID, CAF, PNUD u otros multilaterales.`;

  return `Extraes fichas de fondos a partir de un informe de búsqueda y sus citas URL.
Responde SOLO con JSON válido, sin markdown.
Esquema:
{
  "fondos": [
    {
      "nombre": string,
      "organismo": string,
      "url": string (URL completa http/https de una cita),
      "estado": "abierta" | "por_abrir" | "cerrada" | "no_confirmado",
      "cierre": string | null,
      "monto": string | null,
      "elegibilidad": "directa" | "punto_nacional" | "socio_extranjero" | "no_confirmada",
      "ajuste": number 0-100,
      "descripcion": string (qué es el fondo, según la web; SIN relacionar con el proyecto),
      "motivo": string (por qué calza con ESTE proyecto; 2-4 oraciones para el modal),
      "evidencia": string (frase tomada del extracto o informe)
    }
  ]
}
Reglas:
- Solo incluye fondos con URL real presente en las citas o en el informe.
- No inventes plazos, montos ni elegibilidad.
- Si no hay evidencia de elegibilidad para Chile, usa "no_confirmada".
- Si el estado de la convocatoria no está claro, usa "no_confirmado".
- Copia la fecha de cierre textual en "cierre" (incluye día, mes y año si aparecen).
- Clasifica "estado" comparando con HOY (te la indican en el mensaje). Si el cierre ya pasó, "cerrada". Si cierra hoy o después y ya está abierta, "abierta".
- NO omitas un fondo porque esté cerrado: inclúyelo con estado "cerrada".
- "descripcion" es solo la ficha del fondo según la fuente (objetivo, a quién va, qué financia). NO menciones el proyecto del usuario ahí.
- "motivo" explica el calce con el proyecto (sector, etapa, postulante, territorio, monto). Eso no va en "descripcion".
- Omite duplicados. Máximo 12 fondos.
${groupRule}`;
}

export function buildExtractUserPrompt(
  group: "chile" | "internacional",
  report: string,
  citations: Array<{ url: string; title?: string; content?: string }>,
  profile: ProjectProfile,
  todayYmd: string,
): string {
  const cites =
    citations.length === 0
      ? "(sin citas estructuradas; usa solo URLs explícitas del informe)"
      : citations
          .map(
            (c, i) =>
              `[${i + 1}] ${c.title ?? "Sin título"}\nURL: ${c.url}\nExtracto: ${(c.content ?? "").slice(0, 800)}`,
          )
          .join("\n\n");

  return `Grupo: ${group}
Fecha de HOY (usar esta, no inventes otra): ${todayYmd}
Perfil: ${profile.sector} / ${profile.etapa} / ${profile.postulante}

Informe de búsqueda:
${report.slice(0, 12000)}

Citas:
${cites}`;
}
