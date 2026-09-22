# Publicar Latorre Propiedades

Guía para pasar de `localhost` a un link que se pueda compartir y usar.

**Resultado final:** un solo dominio (`latorre-propiedades.netlify.app`) donde viven el sitio
público y el panel de administración. El backend queda detrás del mismo dominio, en `/api`.

**Costo:** $0, y sin tarjeta de crédito en ningún paso.

---

## Antes de empezar

Necesitás tener instalado:

```bash
node --version    # 20 o superior
npm --version
```

Y estas cuentas, todas gratis y **ninguna pide tarjeta**:

- [Cloudinary](https://cloudinary.com) — las fotos
- [Render](https://render.com) — el backend
- [Netlify](https://netlify.com) — el sitio
- [GitHub](https://github.com) — el código (si todavía no tenés)

La base de datos ([Neon](https://neon.tech)) ya la tenés andando, no hace falta tocarla.

> **Guardá cada credencial apenas la obtengas.** Varias se muestran una sola vez.

---

## Paso 1 · Cloudinary — YA ESTÁ HECHO

Las fotos ya no se guardan en el disco del servidor, que es lo que se borraba en cada
despliegue. Las credenciales están cargadas en `backend/.env` (cuenta `mvkdsjwo`, plan Free,
25GB) y quedó verificado que una carga nueva desde el panel va a Cloudinary.

Cuando configures Render vas a tener que cargar esas mismas tres variables allá.

**Pendiente de seguridad:** el API Secret actual se expuso en un chat. Antes de compartir
el link, entrá a *Settings → API Keys* en Cloudinary, generá una clave nueva, borrá la
vieja y actualizá los dos lugares (`backend/.env` y Render).

---

## Paso 2 · Base de datos — YA ESTÁ HECHO

La base ya vive en Neon (`us-east-2`, Ohio), las 4 migraciones están aplicadas y tu
usuario administrador ya existe ahí. El backend en la nube se va a conectar a esta misma
base, así que todas las propiedades y consultas que cargaste siguen estando.

No hay que hacer nada en este paso. La `DATABASE_URL` que usás en local es la misma que
va a Cloud Run.

> **Importante:** por eso el backend se despliega en `us-east1` y no en São Paulo. Cada
> pedido hace varias consultas a la base; si el servidor queda en otro hemisferio, todo
> el panel se siente lento. `firebase.json` ya está actualizado con esa región.

---

## Paso 3 · Subir el código a GitHub

Render y Netlify despliegan desde un repositorio: cada vez que subas un cambio, ellos lo
publican solos. Por eso este paso va antes.

1. Creá un repositorio **privado** en [github.com/new](https://github.com/new). Sin README
   ni `.gitignore` (ya los tenés).
2. Desde la carpeta del proyecto:

```bash
git add .
git commit -m "Latorre Propiedades: sitio, panel y API"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
git push -u origin main
```

> **Verificá antes de subir** que no se vaya ningún secreto. `git status` no tiene que
> mostrar ningún `.env`: están en `.gitignore`. Si aparece alguno, avisá antes de seguir.

---

## Paso 4 · Render (el backend)

Render corre el `Dockerfile` que ya está en `backend/`. No pide tarjeta.

1. Entrá a [render.com](https://render.com) y creá la cuenta con **GitHub** (así ya queda
   conectado al repositorio).
2. *New* → **Blueprint** → elegí tu repositorio. Render lee `render.yaml` y te propone
   crear el servicio `latorre-api`. Aceptá.
3. Te va a pedir los valores marcados como secretos. Cargá:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | la connection string de Neon (la misma de tu `.env`) |
| `JWT_SECRET` | uno nuevo, generado con el comando de abajo |
| `CORS_ORIGIN` | `https://<tu-sitio>.netlify.app` (lo sabrás en el paso 5; por ahora poné cualquier cosa y corregilo después) |
| `CLOUDINARY_CLOUD_NAME` | `mvkdsjwo` |
| `CLOUDINARY_API_KEY` | la de tu `.env` |
| `CLOUDINARY_API_SECRET` | la de tu `.env` |

Para el secreto nuevo (**no reuses el de tu `.env` local**):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

4. *Create* y esperá. La primera vez tarda unos minutos porque compila la imagen Docker.
5. Cuando termine te da una URL tipo `https://latorre-api.onrender.com`. Probala:

```bash
curl https://latorre-api.onrender.com/api/health
# {"ok":true,"service":"latorre-propiedades-api"}
```

> **Si le pusiste otro nombre al servicio**, la URL cambia — y hay que corregirla en
> `netlify.toml`, donde dice `latorre-api.onrender.com`. Si no, el sitio no encuentra la API.

### Lo que hay que saber del plan gratuito

El servicio **se apaga solo tras 15 minutos sin visitas**, y la siguiente visita tarda
cerca de un minuto mientras vuelve a encenderse. Después anda normal.

Para tu jefa eso es molesto. Se resuelve gratis: creá una cuenta en
[cron-job.org](https://cron-job.org) (o UptimeRobot) y programá una visita a
`https://latorre-api.onrender.com/api/health` **cada 10 minutos**. Con eso el servicio
no se duerme nunca y entra justo dentro de las 750 horas mensuales gratuitas.

---

## Paso 5 · Netlify (el sitio)

1. Entrá a [netlify.com](https://netlify.com), creá la cuenta con GitHub. No pide tarjeta.
2. *Add new site* → *Import an existing project* → elegí tu repositorio.
3. **No toques la configuración de build**: `netlify.toml` ya dice qué compilar
   (`frontend`), con qué comando y dónde queda el resultado.
4. *Deploy*. En un minuto te da el link: `https://<algo-random>.netlify.app`.
5. En *Site configuration → Change site name*, ponele algo presentable:
   `latorre-propiedades.netlify.app`.
6. Volvé a Render y corregí `CORS_ORIGIN` con esa URL definitiva.

El `netlify.toml` reenvía `/api` a Render del lado del servidor, así que para el navegador
todo sale del mismo dominio: no hay CORS y el link es uno solo.

---

## Paso 6 · Verificar antes de compartir

Recorré esto en el link de producción, no en localhost:

- [ ] Abre el mapa y se ven las propiedades
- [ ] `/admin/login` entra con tu usuario (el que ya existe en Neon)
- [ ] Cargar una propiedad nueva, con foto, de punta a punta
- [ ] La foto se ve en el mapa y en el detalle (URL de `res.cloudinary.com`)
- [ ] El buscador de direcciones encuentra una dirección conocida
- [ ] Abrirlo desde el celular

---

## Después: cómo actualizar

No hay comandos de despliegue. Subís el cambio y se publica solo:

```bash
git add .
git commit -m "lo que cambiaste"
git push
```

Render recompila el backend y Netlify el sitio, cada uno por su lado. Tardan un par de
minutos.

Las variables de entorno quedan guardadas en Render: no hace falta repetirlas.

Si agregás campos a la base, corré `npx prisma migrate deploy` contra Neon **antes** de
subir el cambio.

---
## Si algo falla

| Síntoma | Causa más probable |
|---|---|
| La primera visita del día tarda un minuto | Normal en el plan gratuito de Render: el servicio estaba dormido. Ver el pinger del paso 4 |
| El sitio carga pero no aparecen propiedades | La URL de Render en `netlify.toml` no coincide con el nombre real del servicio |
| Las fotos no se ven | Faltan las credenciales de Cloudinary en Render |
| Error al iniciar sesión | El `JWT_SECRET` de Render cambió: al cambiarlo se invalidan las sesiones abiertas, hay que volver a entrar |
| El backend no arranca | Casi siempre la `DATABASE_URL`. Mirá los logs en el panel de Render, pestaña *Logs* |

---

## Migración de las fotos viejas — YA ESTÁ HECHA

Las 4 fotos que estaban guardadas con una URL `http://localhost:4000` ya se subieron a
Cloudinary y las URLs de la base quedaron reescritas. Son las de "Casa en Brandsen 2
dormitorios" y "Casa con pileta". Las cuatro responden, conservan su orden y cuál es la
principal, y quedaron convertidas a WebP (506KB → 375KB).

Los archivos originales siguen en `backend/uploads/` como respaldo. Se pueden borrar una
vez que veas el sitio publicado y esté todo bien.

Si en algún momento volvés a tener fotos locales (por ejemplo si trabajás sin credenciales
de Cloudinary), el script se puede correr de nuevo:

```bash
cd backend
npm run migrate-images -- --dry-run   # muestra qué haría, sin tocar nada
npm run migrate-images                # migra de verdad
```
