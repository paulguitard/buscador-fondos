import { connection } from "next/server";
import { resolveApiKey } from "@/lib/openrouter";
import { runSearchPipeline } from "@/lib/pipeline";
import { searchRequestSchema, type SseEvent } from "@/lib/schema";

export const maxDuration = 300;

function encodeSse(event: SseEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: Request) {
  await connection();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = searchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error:
          "Describe el proyecto con al menos 20 caracteres (máximo 12.000).",
      },
      { status: 400 },
    );
  }

  try {
    resolveApiKey(parsed.data.apiKey);
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Falta la API key de OpenRouter. Ábrela en Configuración.",
      },
      { status: 401 },
    );
  }

  const encoder = new TextEncoder();
  const abortFromClient = request.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;

      const emit = (event: SseEvent) => {
        if (closed || abortFromClient.aborted) return;
        try {
          controller.enqueue(encoder.encode(encodeSse(event)));
        } catch {
          closed = true;
        }
      };

      try {
        await runSearchPipeline(parsed.data, emit, abortFromClient);
      } catch (err) {
        if (!abortFromClient.aborted) {
          const message =
            err instanceof Error ? err.message : "Error inesperado en la búsqueda.";
          emit({ type: "error", message });
          emit({ type: "done" });
        }
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
