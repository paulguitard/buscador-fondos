import {
  MAX_FUNDS_PER_GROUP,
  type ProjectProfile,
  type SearchRequest,
} from "./schema";

/** Cuánto del informe de búsqueda entra al extractor. */
export const EXTRACT_REPORT_MAX_CHARS = 24000;
/** Extracto por cita URL que se pasa al extractor. */
export const EXTRACT_CITATION_MAX_CHARS = 1500;

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

function extraPromptBlock(input: SearchRequest): string {
  const text = input.afinado?.trim();
  if (!text) return "";
  return `\nInstrucciones adicionales del usuario (aplica solo lo que no contradiga las reglas de alcance Chile/internacional):\n${text}\n`;
}

export function buildProfileUserPrompt(
  input: SearchRequest,
  needsSummary: boolean,
): string {
  const resumenHint = needsSummary
    ? `\nEl texto supera ${PROJECT_SUMMARY_CHARS} caracteres: genera un "resumen" de aproximadamente ${PROJECT_SUMMARY_CHARS} caracteres que cubra el contenido completo.`
    : `\nEl texto tiene menos de ${PROJECT_SUMMARY_CHARS} caracteres: en "resumen" pega el texto completo sin resumir.`;

  return `Descripción del proyecto:
${input.descripcion}
${extraPromptBlock(input)}${resumenHint}`;
}

export function buildSearchSystemPrompt(
  group: "chile" | "internacional",
): string {
  const closedRule =
    "NO descartes un fondo solo porque la convocatoria ya cerró. Inclúyelo igual, con su fecha de cierre; el listado las pondrá abajo.";

  if (group === "chile") {
    return `Eres un investigador de convocatorias de financiamiento en Chile.
Busca fondos y convocatorias que calcen con el proyecto: abiertas, por abrir y también cerradas (si calzan).
No priorices dominios, sitios ni organismos. Busca en la web abierta y evalúa cada convocatoria solo por calce con el proyecto (sector, etapa, postulante, territorio, monto).
Incluye organismos públicos y privados CHILENOS (sede en Chile). Usa la búsqueda web tantas veces como puedas (consultas distintas) para reunir el mayor número de convocatorias únicas. No te detengas en las primeras coincidencias.
PROHIBIDO incluir fundaciones, agencias o convocatorias de otros países aunque el programa se ejecute en Chile o financie proyectos chilenos. Ejemplos: The Borrow Foundation (Reino Unido), Rotary International, Dental Trade Alliance, BID, CAF, PNUD, UE, NIH, USAID. Esos van SOLO al grupo internacional.
El criterio es el otorgante: si la sede o el organismo es extranjero, NO es fondo nacional.
Para cada fondo encontrado, indica nombre, organismo, URL, plazos de cierre con fecha concreta, montos SOLO si aparecen en la fuente, y por qué calza.
El estado abierta/cerrada debe basarse en la fecha de HOY que te indican, no en tu conocimiento entrenado.
${closedRule}
Cita las páginas que uses. No inventes fechas ni montos.`;
  }

  return `Eres un investigador de fondos INTERNACIONALES (multilaterales, de otros países o de organismos globales) a los que un proyecto desde Chile podría postular.
No priorices dominios, sitios ni organismos. Busca en la web abierta y evalúa cada convocatoria solo por calce con el proyecto.
PROHIBIDO incluir fondos nacionales o regionales de Chile: Corfo, ANID, Sercotec, Mineduc, FOSIS, INDAP, GORE, MOP, DGA, Start-Up Chile, fondos.gob.cl u otros ministerios/agencias chilenas. Esos van SOLO al grupo Chile.
Usa la búsqueda web tantas veces como puedas (consultas distintas) para reunir el mayor número de convocatorias únicas. No te detengas en las primeras coincidencias.
DESCARTA un fondo SOLO si la fuente dice de forma explícita que es exclusivo de países/regiones que NO incluyen a Chile (p. ej. solo UE-27, solo EE.UU., solo África, lista de países sin Chile, «not open to Latin America»). Si la geografía no se menciona, INCLÚYELO igual y marca elegibilidad no confirmada.
El estado abierta/cerrada debe basarse en la fecha de HOY que te indican.
${closedRule}
Cita las páginas. No inventes elegibilidad, plazos ni montos.`;
}

export function buildSearchUserPrompt(
  group: "chile" | "internacional",
  profile: ProjectProfile,
  input: SearchRequest,
  todayYmd: string,
): string {
  const scope =
    group === "chile"
      ? "Busca SOLO fondos de organismos chilenos (públicos y privados con sede en Chile). No incluyas fundaciones extranjeras aunque operen en Chile. Incluye abiertas, por abrir y cerradas."
      : "Busca SOLO fondos internacionales (no Corfo, ANID, MOP ni otras agencias de Chile). Incluye también convocatorias ya cerradas si calzan. Omite las que la fuente reserva de forma explícita a zonas sin Chile; si no lo dice, inclúyelas.";

  return `${scope}
Fecha de HOY: ${todayYmd}. Úsala para etiquetar abierta/cerrada; no uses la fecha para excluir fondos.
${extraPromptBlock(input)}
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
- BID/IDB, CAF, UE, PNUD, Banco Mundial y similares SÍ son internacionales.
- Clasifica "postulable_desde_chile": "si" si la fuente abre a Chile, Latinoamérica, LAC, Iberoamérica, países en desarrollo o a cualquier país; "no" SOLO si restringe de forma explícita a una zona/lista que no incluye a Chile; "no_dicho" si no habla de geografía. No infieras un "no".`
      : `- Este grupo es SOLO Chile: organismos públicos o privados CON SEDE EN CHILE.
- DESCARTA fundaciones y agencias extranjeras aunque financien trabajo en Chile (The Borrow Foundation / Reino Unido, Rotary International, Dental Trade Alliance, UE, BID, CAF, PNUD, NIH, USAID, etc.).
- El criterio es el otorgante, no el país donde se ejecuta el programa.
- En "postulable_desde_chile" usa siempre "si".`;

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
      "postulable_desde_chile": "si" | "no" | "no_dicho",
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
- Si no hay evidencia de elegibilidad para Chile, usa "no_confirmada" y "postulable_desde_chile": "no_dicho".
- "postulable_desde_chile": "no" solo con texto explícito de exclusión geográfica. Si no se dice, "no_dicho" (el fondo se muestra).
- Si el estado de la convocatoria no está claro, usa "no_confirmado".
- Copia la fecha de cierre textual en "cierre" (incluye día, mes y año si aparecen).
- Clasifica "estado" comparando con HOY (te la indican en el mensaje). Si el cierre ya pasó, "cerrada". Si cierra hoy o después y ya está abierta, "abierta".
- NO omitas un fondo porque esté cerrado: inclúyelo con estado "cerrada".
- "descripcion" es solo la ficha del fondo según la fuente (objetivo, a quién va, qué financia). NO menciones el proyecto del usuario ahí.
- "motivo" explica el calce con el proyecto (sector, etapa, postulante, territorio, monto). Eso no va en "descripcion".
- Omite duplicados (mismo fondo / misma URL).
- Extrae TODAS las convocatorias únicas con URL del informe. No recortes a un número pequeño.
- Si hay más de ${MAX_FUNDS_PER_GROUP}, igual inclúyelas todas con un "ajuste" honesto (0-100). El servidor se quedará con las ${MAX_FUNDS_PER_GROUP} de mayor ajuste.
${groupRule}`;
}

export function buildExtractUserPrompt(
  group: "chile" | "internacional",
  report: string,
  citations: Array<{ url: string; title?: string; content?: string }>,
  profile: ProjectProfile,
  todayYmd: string,
  input: SearchRequest,
): string {
  const cites =
    citations.length === 0
      ? "(sin citas estructuradas; usa solo URLs explícitas del informe)"
      : citations
          .map(
            (c, i) =>
              `[${i + 1}] ${c.title ?? "Sin título"}\nURL: ${c.url}\nExtracto: ${(c.content ?? "").slice(0, EXTRACT_CITATION_MAX_CHARS)}`,
          )
          .join("\n\n");

  return `Grupo: ${group}
Fecha de HOY (usar esta, no inventes otra): ${todayYmd}
Perfil: ${profile.sector} / ${profile.etapa} / ${profile.postulante}
${extraPromptBlock(input)}
Informe de búsqueda:
${report.slice(0, EXTRACT_REPORT_MAX_CHARS)}

Citas:
${cites}`;
}
