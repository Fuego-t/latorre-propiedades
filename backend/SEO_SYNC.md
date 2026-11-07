# Sincronización de HTML público en Firebase Hosting

`firebaseSeoSync.service.ts` conserva la aplicación publicada y reemplaza únicamente el HTML SEO, sitemap y robots. El callback `loadContent` debe devolver una instantánea completa generada desde datos públicos. Son obligatorios `/index.html`, `/sitemap.xml`, `/robots.txt` y `/casas-en-venta-en-brandsen/index.html`.

## Integración

1. Llamar `configureSeoSync({ loadContent })` al iniciar la API y después `startSeoSyncWorker()`.
2. Incrementar `SeoPublishState.requestedRevision` en la misma transacción que modifica una propiedad y llamar `wakeSeoSync()` después del commit. `queueSeoSync()` queda disponible para solicitar una publicación inicial o manual.
3. El worker toma una concesión mediante compare-and-set, conserva un heartbeat y reintenta trabajo pendiente al iniciar y cada minuto. Reconoce solamente la revisión de la instantánea efectivamente publicada. Si aparece una edición más nueva, descarta la instantánea vieja antes de crear la release.
4. `getSeoSyncStatus()` permite informar al administrador si el contenido está pendiente, trabajando, publicado o requiere configuración. No debe indicarse que el HTML está sincronizado si `requestedRevision > publishedRevision`.

## Credencial de Render

Configurar de forma privada `FIREBASE_SERVICE_ACCOUNT_JSON` con una cuenta de servicio del proyecto existente y permisos de Firebase Hosting. El proceso genera un JWT RS256 para `https://oauth2.googleapis.com/token`; no imprime ni guarda claves o tokens. No reutilizar una sesión personal de Firebase CLI como credencial permanente del servidor.

Valores predeterminados: `FIREBASE_PROJECT_ID=latorre-world` y `FIREBASE_HOSTING_SITE_ID=latorre-propiedades`. El JSON debe pertenecer al proyecto configurado. La URL OAuth es fija y la subida de archivos sólo admite el host oficial de Google.

Si falta la credencial, las operaciones del panel siguen funcionando y la revisión permanece pendiente con `CONFIG_REQUIRED`; eso **no** significa que el HTML se actualizó.

## Publicación y límites

El servicio clona la versión activa sin finalizar, excluye las fichas HTML antiguas y los archivos SEO generados, conserva los assets y la configuración ajena, agrega los archivos comprimidos con hashes SHA-256, actualiza los redirects y finaliza la versión antes de publicarla. Los redirects nuevos sólo admiten el origen `https://latorrepropiedades.com` o rutas relativas de ese mismo sitio. Los redirects numéricos legacy anteriores se reemplazan en cada instantánea.

La configuración inicial de Firebase debe usar rewrites SPA explícitos: no dejar un catchall que convierta fichas inexistentes en respuestas HTTP 200.

Antes de crear la release se compara la versión activa contra la versión base. Esto detecta despliegues concurrentes, pero la API de releases no ofrece una precondición atómica en esa comparación: coordinar los despliegues manuales/de código con el worker.

Al ocultar o eliminar una ficha, su HTML anterior puede continuar publicado hasta que finalice la sincronización. El panel debe mostrar ese estado pendiente y sus errores, y comprobar la retirada. Ninguna instantánea nueva debe incluir propiedades privadas u ocultas.

No se borran automáticamente versiones previas, para conservar rollback. Vigilar el almacenamiento y configurar una retención adecuada en Firebase; las versiones creadas por intentos abandonados también pueden consumir espacio. No activar facturación ni ampliar cuotas automáticamente.

## Pruebas sin procesos auxiliares de esbuild

Desde la raíz del proyecto, ejecutar las pruebas con el compilador TypeScript ya instalado:

```powershell
node backend/scripts/test-seo-sync.cjs
node backend/tests/seo-render.test.cjs
node backend/tests/seo-mutation.test.cjs
```

Fuentes: [API de despliegue](https://firebase.google.com/docs/hosting/api-deploy), [clonar versiones](https://firebase.google.com/docs/reference/hosting/rest/v1beta1/sites.versions/clone), [configuración de Hosting](https://firebase.google.com/docs/hosting/full-config).
