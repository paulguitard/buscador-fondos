# Búsqueda de fondos

Pega la descripción de un proyecto y encuentra convocatorias de financiamiento en Chile e internacionales, usando OpenRouter con búsqueda web.

## Requisitos

- Node.js 20+
- Clave de [OpenRouter](https://openrouter.ai/keys)

## Configuración

Copia `.env.example` a `.env.local` y define `OPENROUTER_API_KEY`. En Vercel, añade la misma variable en **Project → Settings → Environment Variables** (Production, Preview y Development).

También puedes pegar una API key propia en el engranaje: esa opción pisa la del servidor y se guarda solo en el navegador (`localStorage`), junto con modelos y fuentes.

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Uso

1. Elige modelo junto a **Buscar**.
2. (Opcional) Pega una API key propia en el engranaje si no usas `OPENROUTER_API_KEY`.
3. Pega la descripción del proyecto (mínimo 20 caracteres).
4. Pulsa **Buscar**. El panel muestra fichas a medida que llegan.
5. Usa **Detener** para cancelar.

Los resultados son una orientación: confirma plazos y bases en el sitio oficial de cada fondo.

## Deploy en Vercel (Hobby)

Con [Fluid Compute](https://vercel.com/docs/fluid-compute) (activo por defecto) Hobby permite **hasta 300 segundos (5 minutos)** por invocación. El límite de 60 s ya no aplica. `/api/search` declara `maxDuration = 300`, que es el techo del plan.

No desactives Fluid Compute en el proyecto: sin Fluid volvería el tope antiguo de 60 s y las búsquedas con web search se cortarían.

Si una búsqueda se acerca a esos 5 minutos, la API cierra el flujo con un mensaje (Fast o Effort Low suelen terminar antes).
