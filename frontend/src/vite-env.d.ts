/// <reference types="vite/client" />

// Declara los tipos de `import.meta.env` para TypeScript. Sin este archivo,
// `import.meta.env.VITE_API_URL` en src/lib/api.ts no compila.

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_MAPBOX_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
