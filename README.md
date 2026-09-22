# Latorre Propiedades — Mapa interactivo de propiedades

Aplicación web para Latorre Propiedades (Coronel Brandsen, Buenos Aires): mapa interactivo de
propiedades para el público y panel privado de administración para el equipo.

Monorepo con dos proyectos independientes:

```
latorre-propiedades/
├── frontend/   React + Vite + TypeScript + Tailwind + Leaflet (OpenStreetMap)
└── backend/    Node + Express + TypeScript + Prisma + PostgreSQL
```

## 1. Requisitos previos

- Node.js 18 o superior
- PostgreSQL 14 o superior (local o en la nube, por ejemplo [Neon](https://neon.tech) o [Supabase](https://supabase.com))
- Una cuenta gratuita de [Cloudinary](https://cloudinary.com) (para el almacenamiento de fotos)

El mapa usa **OpenStreetMap + Leaflet**: no necesita token, cuenta ni tarjeta de ningún tipo.

## 2. Instalación

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Editá .env: DATABASE_URL, JWT_SECRET, y (cuando los tengas) las credenciales de Cloudinary

npx prisma migrate dev --name init   # crea las tablas en la base de datos
npm run seed                          # carga localidades + 3 propiedades de demostración
npm run create-admin -- --name "Tu nombre" --email admin@latorrepropiedades.com --password "unaClaveSegura"

npm run dev   # levanta la API en http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env

npm run dev   # levanta la app en http://localhost:5173
```

Con ambos procesos corriendo, entrás a `http://localhost:5173` y ya deberías ver el mapa
centrado en Coronel Brandsen con las 3 propiedades de demostración. El panel de administración
está en `http://localhost:5173/admin` (usá el email/contraseña que creaste con `create-admin`).

## 3. El mapa (OpenStreetMap + Leaflet)

No requiere ninguna configuración: los tiles de OpenStreetMap y el buscador de direcciones
(Nominatim) son públicos y gratuitos. El proveedor de tiles está centralizado en
`frontend/src/lib/map.ts` — si en el futuro querés pasar a un proveedor pago (por más tráfico,
tiles con otro estilo, etc.) sólo hay que cambiar `TILE_LAYER_URL` en ese archivo.

## 4. Configurar Cloudinary (fotos)

1. Creá una cuenta gratuita en https://cloudinary.com
2. En el Dashboard vas a encontrar `Cloud name`, `API Key` y `API Secret`.
3. Completá esos tres valores en `backend/.env`.

Hasta que no configures Cloudinary, el resto de la app funciona con normalidad; sólo la subida
de fotos (paso "Fotos" del formulario de carga) devuelve un error explicando qué falta
configurar.

## 5. Crear el primer usuario administrador

```bash
cd backend
npm run create-admin -- --name "Nombre Apellido" --email tu-email@ejemplo.com --password "unaClaveSegura" --role OWNER
```

- `--role OWNER` puede eliminar propiedades; `--role AGENT` puede crear/editar pero no eliminar.
- Podés correr el comando de nuevo para crear más usuarios del equipo.

## 6. Datos de demostración

El seed (`npm run seed` en `backend/`) carga 3 propiedades de ejemplo (venta, alquiler
comercial y alquiler residencial) marcadas internamente como `isDemo: true`, con direcciones
ficticias aclaradas como "dirección de demostración". Antes de pasar a producción:

- Borralas desde `/admin/propiedades` (columna de acciones → ícono de basura), o
- Corré `npx prisma studio` en `backend/` y eliminá los registros con `isDemo = true`.

Para que el seed no cargue estos datos de entrada, poné `SEED_DEMO_DATA=false` en `backend/.env`
antes de correr `npm run seed`.

## 7. Estructura y decisiones de diseño

- **Privacidad de ubicaciones**: las propiedades guardan siempre la dirección y coordenadas
  exactas en la base de datos, pero el mapa público sólo recibe `publicLatitude`/`publicLongitude`.
  Si la propiedad es residencial y no se activó "Mostrar ubicación exacta públicamente", esas
  coordenadas públicas llevan un desplazamiento aleatorio (pero estable) de hasta ~120 metros.
  La dirección exacta (`exactAddress`) nunca viaja en las respuestas públicas de la API salvo
  que la propiedad tenga `showExactLocation = true`.
- **Estados de propiedad**: sólo `AVAILABLE` y `RESERVED` aparecen en el mapa y listado público.
  `SOLD`, `RENTED`, `PAUSED` y `HIDDEN` quedan automáticamente ocultas.
- **WhatsApp**: los dos números oficiales y el formato del mensaje están centralizados en
  `frontend/src/lib/whatsapp.ts`.
- **Colores de marcador**: amarillo/dorado (venta), verde oscuro (alquiler comercial), verde
  claro (alquiler de vivienda) — definidos en `frontend/src/lib/format.ts` (`OPERATION_COLORS`).
- **Clustering**: se resuelve en el cliente con `supercluster`, sobre Leaflet puro con
  marcadores DOM personalizados (íconos `L.divIcon`).

## 8. Scripts útiles

Backend (`backend/`):

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` / `npm start` | Compila y corre en producción |
| `npm run prisma:studio` | Explorador visual de la base de datos |
| `npm run prisma:migrate` | Crea/aplica migraciones en desarrollo |
| `npm run seed` | Carga localidades y datos de demo |
| `npm run create-admin -- --email ... --password ...` | Crea un usuario administrador |

Frontend (`frontend/`):

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Build de producción (`dist/`) |
| `npm run preview` | Sirve el build de producción localmente |

## 9. Funcionalidades pendientes / próximos pasos

Quedan preparados pero no implementados en esta primera entrega:

- **Recuperación de contraseña** para el panel de administración (el modelo `AdminUser` y el
  login ya están listos para agregarla; falta el flujo de email).
- **CRUD de localidades** desde el panel (hoy se administran vía `prisma studio` o editando el
  seed; el campo "Localidad" del formulario acepta texto libre).
- **Compresión/optimización server-side adicional** de imágenes más allá de la transformación
  automática de Cloudinary (recorte inteligente, watermark, etc.).
- Tests automatizados (unitarios/e2e) — no incluidos en esta entrega inicial.

## 10. Seguridad

- Las contraseñas de administrador se guardan con `bcrypt` (nunca en texto plano).
- Las rutas `/api/admin/*` requieren un JWT válido (`Authorization: Bearer <token>`).
- `DELETE /api/admin/properties/:id` requiere además el rol `OWNER`.
- Nunca subas tu archivo `.env` al repositorio (ya está en `.gitignore`); usá siempre
  `.env.example` como referencia para el equipo.
