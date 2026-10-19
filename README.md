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
