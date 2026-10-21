# Formulario Único de Inscripción Digital a Concursos de Docentes

Aplicación web para la inscripción digital a concursos docentes (Profesores Titulares, Asociados y Adjuntos) de la Universidad Nacional de Tucumán, conforme al Reglamento General de Concursos Docentes vigente (Resolución N°: RES - DGAC - 10801 / 2026).

- **Postulantes:** ven los llamados con inscripción abierta, seleccionan el concurso, completan sus datos, adjuntan la documentación (solicitud, DNI, CV y respaldatoria de antecedentes) y aceptan las declaraciones juradas. Reciben un **ID de inscripción de 5 caracteres** y un comprobante PDF con código QR.
- **Administradores (Departamento Concursos):** crean, editan y eliminan llamados; consultan postulantes, les cargan **observaciones** y descargan la documentación o exportan a CSV/PDF. Login con Google OAuth.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · Prisma 5 · PostgreSQL · NextAuth v5 · Tailwind CSS v4 · pdfkit · qrcode · nodemailer · Vitest

---

## Índice

1. [Requisitos](#requisitos)
2. [Variables de entorno](#variables-de-entorno)
3. [Documentación requerida por el postulante](#documentación-requerida-por-el-postulante)
4. [ID de inscripción y observaciones](#id-de-inscripción-y-observaciones)
5. [Notificación por email](#notificación-por-email)
6. [Desarrollo local](#desarrollo-local)
7. [Base de datos](#base-de-datos)
8. [Tests y build](#tests-y-build)
9. [Despliegue en Dokploy](#despliegue-en-dokploy)
10. [Arquitectura y estructura](#arquitectura-y-estructura)

---

## Requisitos

- **Node.js 22.12+** (lo exige Vitest 5; `next` conforma con 20.9+. La imagen Docker usa `node:22-alpine`).
- **PostgreSQL 14+** accesible desde la aplicación.
- **Google OAuth** (Client ID y Secret) para el panel de administración.
- **Docker** (opcional, sólo para despliegue en contenedor).

---

## Variables de entorno

Copiar `.env.example` a `.env` y completar los valores.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión PostgreSQL: `postgresql://USUARIO:PASSWORD@HOST:5432/concursos_docentes` |
| `AUTH_URL` | Sí | URL pública de la aplicación, p. ej. `https://concursos.softgroup.com.ar`. En local: `http://localhost:3000` |
| `AUTH_SECRET` | Sí | Secreto de NextAuth y **clave HMAC** que firma los enlaces del comprobante. Generar con `openssl rand -base64 32`. Rotarlo revoca todos los enlaces enviados por correo |
| `GOOGLE_CLIENT_ID` / `AUTH_GOOGLE_ID` | Sí | Client ID de Google OAuth (se acepta el prefijo `AUTH_GOOGLE_*` o `GOOGLE_*`) |
| `GOOGLE_CLIENT_SECRET` / `AUTH_GOOGLE_SECRET` | Sí | Client Secret de Google OAuth |
| `ADMIN_EMAIL` | Sí | Email del primer administrador (whitelist del login con Google) |
| `AUTH_ALLOWED_DOMAINS` | No | Raíces de dominio Google permitidas, separadas por coma (p. ej. `unt.edu.ar,edu.ar`). **Casa por sufijo**: `unt.edu.ar` habilita `face.unt.edu.ar`. Vacío = sin restricción de dominio |
| `RATE_LIMIT_MAX` | No | Inscripciones por IP dentro de la ventana. Por defecto `5` |
| `RATE_LIMIT_VENTANA_MIN` | No | Duración de la ventana en minutos. Por defecto `60` |
| `UPLOAD_DIR` | No | Directorio de almacenamiento de PDFs. Por defecto `./uploads`; en producción `/app/uploads` |
| `PORTAL_URL` | No | Dirección que se imprime en el QR del comprobante. Por defecto `https://concursos.face-unt.ar`. Es independiente de `AUTH_URL` |
| `SMTP_HOST` | No | Servidor SMTP para enviar el comprobante por email. Si falta, no se envía correo |
| `SMTP_PORT` | No | Puerto SMTP (típico `587` o `465`) |
| `SMTP_SECURE` | No | `true` para TLS implícito (puerto 465). Por defecto se infiere del puerto |
| `SMTP_USER` / `SMTP_PASSWORD` | No | Credenciales SMTP (si el servidor requiere autenticación) |
| `SMTP_FROM` | No | Remitente, p. ej. `Concursos Docentes <no-reply@face.unt.edu.ar>` |

> **Nota:** el login admite tanto `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` (convención NextAuth v5) como `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (convención clásica).

> **Nota:** la IP se lee de `X-Forwarded-For` (primera entrada) y, si falta, de `X-Real-IP`; si tampoco existe, todas las inscripciones comparten la clave `desconocida` y `RATE_LIMIT_MAX` pasa a limitar el sitio entero, no por visitante. El proxy inverso de Dokploy (Traefik) debe mandar una de las dos cabeceras.

---

## Documentación requerida por el postulante

Todos los archivos deben estar en **PDF** (se valida en cliente y en servidor por tamaño y por firma `%PDF`):

| Documento | Campo interno | Límite |
|---|---|---|
| Solicitud de inscripción | `solicitud` | 10 MB |
| Documento Nacional de Identidad (ambos lados) | `dniArchivo` | 10 MB |
| Curriculum Vitae (Anexo II) | `cv` | 100 MB |
| Documentación respaldatoria de antecedentes | `antecedentes` | 100 MB |

Los archivos se guardan en disco bajo `UPLOAD_DIR`, en una carpeta por postulante (`<postulanteId>/<campo>.pdf`). **En producción debe montarse un volumen persistente**, de lo contrario la documentación se pierde en cada redeploy.

El límite de subida de las Server Actions está configurado en `250 MB` (`experimental.serverActions.bodySizeLimit` en `next.config.ts`).

---

## ID de inscripción y observaciones

Cada inscripción recibe un **código de 5 caracteres** (`codigoInscripcion`) generado por el sistema con `crypto.randomInt` sobre el alfabeto `ABCDEFGHJKMNPQRSTUVWXYZ`: sin `I`, `L`, `O` ni dígitos, porque `0/O` y `1/I/L` se confunden cuando el código se dicta por teléfono. Son ~6.4M de combinaciones y el índice único de la base es la garantía real: si dos carreras chocan, la acción reintenta con otro código (hasta 5 veces) antes de fallar.

El código aparece en cuatro lugares: la pantalla de confirmación, el encabezado del comprobante PDF, la primera línea del QR y la columna **ID** de la tabla de postulantes. Las búsquedas del panel siguen por nombre/DNI.

La **observación** es una nota interna del Departamento Concursos: se edita desde la tabla de postulantes (`actualizarObservacion`, server action protegida por `requireAdmin`) y viaja en el export CSV y en el PDF, donde se imprime indentada debajo del postulante. No figura en el comprobante que descarga el interesado.

El QR del comprobante lleva además la dirección del portal (`PORTAL_URL`, por defecto `https://concursos.face-unt.ar`). Es una variable separada de `AUTH_URL` a propósito: `AUTH_URL` define el dominio de las sesiones y del enlace firmado, y mudar uno no debería cambiar la referencia institucional que escanea un tercero.

---

## Notificación por email

Al completar la inscripción, el sistema envía automáticamente al postulante un correo con el **comprobante en PDF adjunto** y un enlace de descarga. El envío se realiza por **SMTP** (nodemailer) y es **opcional**: si no se configuran las variables `SMTP_*`, la inscripción funciona igual pero no se envía el correo (se registra un aviso en el log del servidor).

Variables necesarias:

```env
SMTP_HOST=smtp.tu-servidor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario@tu-servidor.com
SMTP_PASSWORD=tu-password
SMTP_FROM=Concursos Docentes <no-reply@face.unt.edu.ar>
```

El envío se hace en segundo plano tras crear el registro; si el SMTP falla, la inscripción **no** se pierde ni se revierte.

El enlace del correo (`/api/comprobante/[postulanteId]?t=<firma>`) está firmado con HMAC sobre el ID del postulante usando `AUTH_SECRET`, y responde **401** si la firma falta o no coincide. Se sirve con `X-Robots-Tag: noindex, nofollow` y `Cache-Control: private, no-store`.

---

## Desarrollo local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de entorno
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
# Editar .env con tu DATABASE_URL, AUTH_SECRET, GOOGLE_* y ADMIN_EMAIL

# 3. Generar el cliente Prisma y aplicar migraciones
npx prisma generate
npx prisma migrate dev

# 4. Iniciar el servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

---

## Base de datos

Modelo de datos (Prisma + PostgreSQL):

- **`Concurso`** — `numeroExpediente`, `cargo`, `dedicacion`, `disciplina`, `area?`, `catedra?`, `asignatura`, `fechaApertura`, `fechaCierre`. Los estados (abierto/cerrado/próximo) se calculan según las fechas.
- **`Postulante`** — datos del postulante (`apellidos`, `nombres`, `dni`, `email`), las 4 rutas de archivo, `fechaInscripcion`, `codigoInscripcion` y `observacion?` (nota interna del administrador, máx. 2000 caracteres). Restricción de unicidad `@@unique([dni, concursoId])`: un mismo DNI no puede inscribirse dos veces al mismo concurso.
- **`User` / `Account` / `Session` / `VerificationToken`** — modelo estándar de NextAuth v5 (sesiones en base de datos).

### Migraciones

```bash
npx prisma migrate dev        # desarrollo: crea y aplica
npx prisma migrate deploy     # producción: sólo aplica las pendientes
npx prisma studio             # explorador visual de la base
```

> El entrypoint del contenedor ejecuta `prisma migrate deploy` automáticamente en cada arranque.

> `20261021150000_codigo_inscripcion_y_observacion` agrega `codigoInscripcion` (único) y `observacion` a `Postulante` y **rellena el código de los postulantes ya inscriptos** con un bloque `DO $$` de Postgres. No hace falta intervenir manualmente, pero una vez aplicado no hay vuelta atrás: los códigos asignados a los registros existentes son los que quedan.

---

## Tests y build

```bash
npm test          # Vitest (ejecución única)
npm run test:watch
npm run build     # build de producción (Next.js standalone)
npm run start     # servir el build de producción
```

Los tests viven junto al código (`*.test.ts`) y cubren las reglas que no conviene revalidar a mano: contención de rutas y validación por firma `%PDF` en `lib/uploads`, neutralización de fórmulas y nombres de archivo en `lib/http` (donde también se prueba la firma HMAC del comprobante), la ventana fija del limitador en `lib/rate-limit`, el alfabeto y la colisión del código de inscripción en `lib/codigo-inscripcion`, el matching por sufijo de `lib/dominios`, los estados de concurso, la guard de `actualizarObservacion` y el flujo completo de `inscribirPostulante` (validaciones, límite por IP, reintento de código y reversión de archivos huérfanos).

> El build no debe dejar advertencias: un `readFile` con ruta dinámica sin `/* turbopackIgnore: true */` en `lib/comprobante.ts` traza todo el proyecto al standalone y terminaría filtrando `.env` dentro de la imagen.

---

## Despliegue en Dokploy

### Requisitos previos

- Servidor con **Dokploy** instalado.
- Base de datos **PostgreSQL** accesible desde el servidor de Dokploy.
- App de **Google OAuth** creada en [console.cloud.google.com](https://console.cloud.google.com).
- **Volumen persistente** para `/app/uploads` (almacenamiento de los PDFs).

---

### 1. Crear la aplicación en Dokploy

1. Panel de Dokploy → **Applications** → **Create Application**.
2. Completar:

   | Campo | Valor |
   |---|---|
   | **Name** | `concursos` |
   | **Build Type** | `Dockerfile` |
   | **Repository** | `https://github.com/brandall2021/concursos.git` |
   | **Branch** | `main` |
   | **Dockerfile Path** | `./Dockerfile` |

3. Podés conectar el repositorio vía GitHub App (recomendado) o pegar la URL HTTPS/SSH.

---

### 2. Configurar variables de entorno

En Dokploy → aplicación → **Environment**:

```env
DATABASE_URL=postgresql://USUARIO:PASSWORD@HOST:5432/concursos_docentes

AUTH_URL=https://concursos.softgroup.com.ar
AUTH_SECRET=<generá con: openssl rand -base64 32>

GOOGLE_CLIENT_ID=<desde Google Cloud Console>
GOOGLE_CLIENT_SECRET=<desde Google Cloud Console>

ADMIN_EMAIL=concursos@face.unt.edu.ar
AUTH_ALLOWED_DOMAINS=unt.edu.ar,edu.ar

RATE_LIMIT_MAX=5
RATE_LIMIT_VENTANA_MIN=60

UPLOAD_DIR=/app/uploads
PORTAL_URL=https://concursos.face-unt.ar

# Opcional — envío del comprobante por email
SMTP_HOST=smtp.tu-servidor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario@tu-servidor.com
SMTP_PASSWORD=tu-password
SMTP_FROM=Concursos Docentes <no-reply@face.unt.edu.ar>
```

> Para `AUTH_SECRET`: `openssl rand -base64 32`. Es además la clave que firma los enlaces del comprobante: si lo cambiás después de un envío, los comprobantes ya enviados dejan de abrir.
>
> `AUTH_ALLOWED_DOMAINS` es opcional pero conviene fijarlo en producción (`unt.edu.ar,edu.ar`); sin él, la única barrera del login es la whitelist de la tabla `User`.

---

### 3. Configurar el volumen de uploads

En Dokploy → aplicación → **Advanced** → **Volumes / Mounts**, agregar:

| Campo | Valor |
|---|---|
| **Mount type** | Volume |
| **Volume name** | `concursos-uploads` |
| **Mount path (container)** | `/app/uploads` |

El `Dockerfile` ya declara `VOLUME ["/app/uploads"]` y `UPLOAD_DIR=/app/uploads`, por lo que el montaje apunta directamente al directorio de almacenamiento. Sin este volumen, la documentación se pierde en cada redeploy.

---

### 4. Configurar el dominio

En Dokploy → aplicación → **Domains**:

| Campo | Valor |
|---|---|
| **Domain** | `concursos.softgroup.com.ar` |
| **Port** | `3000` |
| **HTTPS** | activar (Let's Encrypt) |

El contenedor escucha en el puerto **3000** (`PORT=3000`, `HOSTNAME=0.0.0.0`).

---

### 5. Configurar Google OAuth

En [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → **OAuth 2.0 Client ID** (Web application), agregar:

**Authorized redirect URIs:**

```
https://concursos.softgroup.com.ar/api/auth/callback/google
```

**Authorized JavaScript origins:**

```
https://concursos.softgroup.com.ar
```

Copiar el **Client ID** y **Client Secret** a las variables `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` de Dokploy.

---

### 6. Migraciones

No hace falta un paso manual: el **entrypoint** (`docker-entrypoint.sh`) ejecuta en cada arranque:

1. `node scripts/ensure-db.mjs` — verifica y, si no existe, **crea la base de datos** (requiere `postgresql-client` incluido en la imagen).
2. `node node_modules/prisma/build/index.js migrate deploy` — aplica las migraciones pendientes.
3. `exec node server.js` — inicia la aplicación.

> Si la base ya existe y tiene permisos, el paso 1 no hace cambios. Asegurate de que el usuario de `DATABASE_URL` tenga permisos para crear la base (o creala vos y saltá ese paso).

---

### 7. Deploy y primer acceso

1. En Dokploy → **Deploy Now**.
2. Esperar a que el build termine y el contenedor quede saludable.
3. Acceder a `https://concursos.softgroup.com.ar/admin/login` y autenticarse con Google usando el `ADMIN_EMAIL` configurado.
4. Desde `/admin/usuarios` se agregan/eliminan otros administradores (whitelist por email).

**Prueba rápida de las barreras** (en una ventana de incógnito, sin sesión):

| Pedido | Esperado |
|---|---|
| `GET /admin` | 302 a `/admin/login` |
| `GET /api/admin/concursos/<id>/export?format=csv` | `401` |
| `GET /api/comprobante/<id>` (sin `?t=`) | `401` con `Enlace no válido` |
| `GET /` | `200` |

Y en el build: `npm run build` no debe tirar advertencias de Turbopack y `docker image inspect` del runner no debe mostrar `.env` ni `uploads/` dentro de `/app`.

---

### Notas de infraestructura

- **Multi-stage build:** `deps` → `builder` → `prod-deps` → `runner` (imagen final `node:22-alpine`, usuario sin privilegios `nextjs`).
- **Modo standalone:** `next.config.ts` usa `output: 'standalone'`, por lo que la imagen final sólo copia `.next/standalone`, `.next/static`, `public`, `prisma` y `node_modules` de producción.
- **`.dockerignore`:** excluye `.env*`, `.git`, `uploads/`, `node_modules`, `.next` y la documentación del `COPY . .` del builder, para que ningún secreto termine dentro de la imagen.
- **pdfkit:** se marca como `serverExternalPackages` y las fuentes AFM se incluyen vía `outputFileTracingIncludes` (`./node_modules/pdfkit/js/data/**/*`), con copia explícita a `/ROOT/node_modules/pdfkit/js/data` en el `Dockerfile`.
- **Healthcheck recomendado:** `GET /` (devuelve 200 con la lista de llamados abiertos).
- **Límite por IP:** el contador vive en memoria del proceso. Con más de una réplica es por réplica, y necesita que el proxy inverso escriba `X-Forwarded-For`; si no llega, todos los postulantes comparten la clave `desconocida`.

---

## Arquitectura y estructura

```
src/
├── app/
│   ├── page.tsx                                  # Página pública: llamados abiertos
│   ├── inscripcion/[concursoId]/
│   │   ├── page.tsx                              # Texto legal + formulario
│   │   └── confirmacion/page.tsx                 # Comprobante + descarga
│   ├── admin/                                    # Panel (protegido por NextAuth)
│   │   ├── page.tsx                              # Dashboard con métricas
│   │   ├── concursos/                            # CRUD de llamados
│   │   │   ├── page.tsx
│   │   │   ├── nueva/page.tsx
│   │   │   └── [id]/
│   │   │       ├── editar/page.tsx
│   │   │       └── postulantes/page.tsx          # Tabla + descargas + export
│   │   ├── usuarios/                             # Gestión de administradores
│   │   └── login/page.tsx                        # Login con Google
│   └── api/
│       ├── auth/[...nextauth]/route.ts           # Handlers de NextAuth
│       ├── comprobante/[postulanteId]/route.ts   # PDF del comprobante con QR
│       └── admin/
│           ├── concursos/[id]/export/route.ts    # Export CSV / PDF
│           └── postulantes/[id]/documentos/[campo]/route.ts  # Descarga de PDFs (auth)
├── actions/                                      # Server Actions
│   ├── concursos.ts                              # create / update / delete
│   ├── postulantes.ts                            # inscribirPostulante (validación + guardado)
│   ├── observaciones.ts                          # actualizarObservacion (notas del panel)
│   └── usuarios.ts                               # Alta/baja de administradores
├── components/                                   # Componentes React
│   ├── ConcursoForm.tsx / ConcursoSelect.tsx / ConcursoStatusBadge.tsx
│   ├── PostulanteForm.tsx                        # Formulario público (4 archivos)
│   ├── ObservacionEditor.tsx                     # Edición inline de la observación
│   ├── Footer.tsx                                # Pie institucional de las páginas públicas
│   ├── ExportButtons.tsx / DeleteConcursoButton.tsx / UsuariosTable.tsx
│   ├── InstitutionalBrand.tsx                    # Marca UNT
│   ├── ConcursoFilters.tsx                       # Filtros de búsqueda del panel
│   └── ui/                                       # Button, Input, Select, FileInput
├── types/next-auth.d.ts                          # Rol en los tipos de Session/User
├── proxy.ts                                      # Middleware: protege /admin y /api/admin
└── lib/
    ├── auth.ts                                   # Configuración NextAuth v5
    ├── guards.ts                                 # requireAdmin(): barrera de rol única
    ├── prisma.ts                                 # Cliente Prisma (singleton)
    ├── documentos.ts                             # Constantes y validación PDF (client-safe)
    ├── dominios.ts                               # AUTH_ALLOWED_DOMAINS: casa por sufijo
    ├── codigo-inscripcion.ts                     # ID de 5 letras + detección de colisión
    ├── institucion.ts                            # Datos del pie y PORTAL_URL del QR
    ├── uploads.ts                                # FS server-only (guardar/limpiar/resolver)
    ├── comprobante.ts                            # Generación del PDF del comprobante (con QR y logo)
    ├── comprobante-firma.ts                      # Firma HMAC de la URL pública del comprobante
    ├── rate-limit.ts                             # Ventana fija en memoria, por IP
    ├── http.ts                                   # Escape de CSV y nombres de archivo seguros
    ├── email.ts                                  # Envío del comprobante por SMTP (nodemailer)
    └── concurso-status.ts                        # Estados y etiquetas de concurso

prisma/
├── schema.prisma                                 # Modelos de datos
└── migrations/                                   # Migraciones versionadas
scripts/
└── ensure-db.mjs                                 # Crea la base si no existe (entrypoint)
.dockerignore                                     # Nada de .env, .git ni uploads en la imagen
docker-entrypoint.sh                              # ensure-db → migrate deploy → server
Dockerfile                                        # Build multi-stage (standalone)
```

`src/proxy.ts` es el middleware de Next 16 (renombrado desde `middleware.ts`): intercepta `/admin/:path*` y `/api/admin/:path*` y responde 401 en las APIs, o redirige en las páginas, cuando no hay sesión. La barrera de rol (`requireAdmin`) corre además dentro de cada página, action y route, así que el panel sigue protegido si el middleware se salta o cambia de matcher.

Los tests están junto al código: `lib/*.test.ts` y `actions/postulantes.test.ts`.

### Flujo de inscripción

1. El postulante accede a `/` y ve los llamados con inscripción abierta.
2. En `/inscripcion/[concursoId]` lee el texto legal, completa sus datos, adjunta los 4 PDFs y acepta las declaraciones juradas.
3. La Server Action `inscribirPostulante` valida campos, largos, tipos y firma PDF (`%PDF-`), controla la tasa por IP, genera el ID de inscripción de 5 letras, crea primero el registro y después escribe los archivos en disco (si la escritura falla, revierte la fila).
4. Redirige a `/inscripcion/[concursoId]/confirmacion`, que muestra el **ID de inscripción** junto al botón de descarga.
5. El comprobante PDF (`/api/comprobante/[postulanteId]?t=<firma>`) incluye un **código QR** con la URL de verificación firmada.

Un DNI que ya figura inscrito produce un mensaje genérico: saber *quién* se presentó a un concurso es dato sensible, y el formulario es público.

### Seguridad

- Panel `/admin/*` y `/api/admin/*` protegidos por NextAuth v5 con sesiones en base de datos. La barrera es doble: el proxy rechaza la falta de sesión **y** cada página/action/route verifica `session.user.role === 'ADMIN'`.
- Login por whitelist: sólo el `ADMIN_EMAIL` inicial o usuarios ya registrados pueden ingresar. Con `AUTH_ALLOWED_DOMAINS` se restringe además el dominio de la cuenta Google, comparando por sufijo sobre la raíz (`unt.edu.ar` incluye `face.unt.edu.ar`, pero no `unt.edu.ar.evil.com`). Los rechazos quedan en el log del servidor con el motivo: dominio o whitelist.
- Las rutas de descarga y export verifican rol y devuelven **401** sin autenticación.
- `/api/comprobante/[id]` es público por diseño (el postulante no tiene alta), pero exige `?t=` firma HMAC del `AUTH_SECRET`: la clave primaria deja de ser la credencial y rotar el secreto revoca todos los enlaces emitidos.
- Los PDFs se validan por contenido, no por `type`/extensión, y se sirven con nombre de archivo saneado y `Content-Disposition: attachment`.
- El export CSV neutraliza preficios de fórmula (`= + - @ tab CR`) para que Excel/LibreOffice no evalúen celdas escritas por postulantes.
- Eliminar un concurso borra también sus PDFs del disco, no sólo las filas.
- Encabezados `CSP`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy: same-origin`, `HSTS` y `Permissions-Policy` en `next.config.ts`.
- El formulario de inscripción limita intentos por IP (`RATE_LIMIT_MAX` cada `RATE_LIMIT_VENTANA_MIN` minutos). El contador vive en memoria del proceso: con más de una réplica es por réplica; para un límite real agregá un backend compartido (Redis) o el límite del proxy inverso.

### Limitaciones aceptadas

Decisiones conscientemente tomadas, para no re-descubirlas en una auditoría futura:

- **`'unsafe-inline'` en `script-src` y `style-src`.** Next 16 con Turbopack emite scripts y estilos en línea en el HTML renderizado; sin el permiso la aplicación se rompe. La CSP igual cierra `object-src`, `base-uri`, `frame-ancestors` y `form-action`.
- **`allowDangerousEmailAccountLinking: true`.** Necesario para que una cuenta Google coincida con el usuario que el administrador dio de alta antes del primer login. El riesgo real lo contiene la whitelist de `User` (y `AUTH_ALLOWED_DOMAINS`), no este flag.
- **Enlace del comprobante sin sesión.** Es el único acceso que un postulante anónimo puede necesitar, por eso está firmado en lugar de autenticado. Quien tenga el enlace completo puede ver ese comprobante: no lo publiques ni lo compartas.
- **Límite de tasa en memoria.** Simple y sin dependencias, a cambio de ser por proceso. Aceptar esto implica que el DoS volumétrico lo absorbe el proxy inverso, no la app.
- **`npm audit` deja 4 advertencias altas**, todas la misma cadena de `nodemailer@8.0.11` (una copia deduped que comparten la app, `@auth/core` y `next-auth`). No existe versión parchada dentro del rango que acepta `next-auth@5.0.0-beta.32` (`^7.0.7 || ^8.0.5`): los fixes están en 10.x y saltar ahí rompe el peer. Los avisos no son alcanzables en este flujo: sólo se envía a la dirección que el propio postulante escribió, validada por regex y topada en 254 caracteres; `to` va como cadena, no como array anidado; no se usa `raw` ni `resolveContent`; y el transporte SMTP es uno solo cacheado, sin mezcla de tenants. Quitar `SMTP_*` elimina el vector por completo.
