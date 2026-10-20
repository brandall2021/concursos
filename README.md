# Formulario Único de Inscripción Digital a Concursos de Docentes

Aplicación web para la inscripción digital a concursos docentes (Profesores Titulares, Asociados y Adjuntos) de la Universidad Nacional de Tucumán, conforme al Reglamento General de Concursos Docentes vigente (Resolución N°: RES - DGAC - 10801 / 2026).

- **Postulantes:** ven los llamados con inscripción abierta, seleccionan el concurso, completan sus datos, adjuntan la documentación (solicitud, DNI, CV y respaldatoria de antecedentes) y aceptan las declaraciones juradas. Reciben un comprobante PDF con código QR.
- **Administradores (Departamento Concursos):** crean, editan y eliminan llamados; consultan postulantes; descargan la documentación y exportan a CSV/PDF. Login con Google OAuth.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · Prisma 5 · PostgreSQL · NextAuth v5 · Tailwind CSS v4 · pdfkit · qrcode · Vitest

---

## Índice

1. [Requisitos](#requisitos)
2. [Variables de entorno](#variables-de-entorno)
3. [Documentación requerida por el postulante](#documentación-requerida-por-el-postulante)
4. [Desarrollo local](#desarrollo-local)
5. [Base de datos](#base-de-datos)
6. [Tests y build](#tests-y-build)
7. [Despliegue en Dokploy](#despliegue-en-dokploy)
8. [Arquitectura y estructura](#arquitectura-y-estructura)

---

## Requisitos

- **Node.js 20+** (el contenedor usa `node:20-alpine`).
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
| `AUTH_SECRET` | Sí | Clave secreta de NextAuth. Generar con `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `AUTH_GOOGLE_ID` | Sí | Client ID de Google OAuth (se acepta el prefijo `AUTH_GOOGLE_*` o `GOOGLE_*`) |
| `GOOGLE_CLIENT_SECRET` / `AUTH_GOOGLE_SECRET` | Sí | Client Secret de Google OAuth |
| `ADMIN_EMAIL` | Sí | Email del primer administrador (whitelist del login con Google) |
| `UPLOAD_DIR` | No | Directorio de almacenamiento de PDFs. Por defecto `./uploads`; en producción `/app/uploads` |

> **Nota:** el login admite tanto `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` (convención NextAuth v5) como `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (convención clásica).

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
- **`Postulante`** — datos del postulante (`apellidos`, `nombres`, `dni`, `email`), las 4 rutas de archivo y `fechaInscripcion`. Restricción de unicidad `@@unique([dni, concursoId])`: un mismo DNI no puede inscribirse dos veces al mismo concurso.
- **`User` / `Account` / `Session` / `VerificationToken`** — modelo estándar de NextAuth v5 (sesiones en base de datos).

### Migraciones

```bash
npx prisma migrate dev        # desarrollo: crea y aplica
npx prisma migrate deploy     # producción: sólo aplica las pendientes
npx prisma studio             # explorador visual de la base
```

> El entrypoint del contenedor ejecuta `prisma migrate deploy` automáticamente en cada arranque.

---

## Tests y build

```bash
npm test          # Vitest (ejecución única)
npm run test:watch
npm run build     # build de producción (Next.js standalone)
npm run start     # servir el build de producción
```

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

UPLOAD_DIR=/app/uploads
```

> Para `AUTH_SECRET`: `openssl rand -base64 32`.

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

---

### Notas de infraestructura

- **Multi-stage build:** `deps` → `builder` → `prod-deps` → `runner` (imagen final `node:20-alpine`, usuario sin privilegios `nextjs`).
- **Modo standalone:** `next.config.ts` usa `output: 'standalone'`, por lo que la imagen final sólo copia `.next/standalone`, `.next/static`, `public`, `prisma` y `node_modules` de producción.
- **pdfkit:** se marca como `serverExternalPackages` y las fuentes AFM se incluyen vía `outputFileTracingIncludes` (`./node_modules/pdfkit/js/data/**/*`), con copia explícita a `/ROOT/node_modules/pdfkit/js/data` en el `Dockerfile`.
- **Healthcheck recomendado:** `GET /` (devuelve 200 con la lista de llamados abiertos).

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
│   └── usuarios.ts                               # Alta/baja de administradores
├── components/                                   # Componentes React
│   ├── ConcursoForm.tsx / ConcursoSelect.tsx / ConcursoStatusBadge.tsx
│   ├── PostulanteForm.tsx                        # Formulario público (4 archivos)
│   ├── ExportButtons.tsx / DeleteConcursoButton.tsx / UsuariosTable.tsx
│   ├── InstitutionalBrand.tsx                    # Marca UNT
│   └── ui/                                       # Button, Input, Select, FileInput
└── lib/
    ├── auth.ts                                   # Configuración NextAuth v5
    ├── prisma.ts                                 # Cliente Prisma (singleton)
    ├── documentos.ts                             # Constantes y validación PDF (client-safe)
    ├── uploads.ts                                # FS server-only (guardar/limpiar/resolver)
    └── concurso-status.ts                        # Estados y etiquetas de concurso
prisma/
├── schema.prisma                                 # Modelos de datos
└── migrations/                                   # Migraciones versionadas
scripts/
└── ensure-db.mjs                                 # Crea la base si no existe (entrypoint)
docker-entrypoint.sh                              # ensure-db → migrate deploy → server
Dockerfile                                        # Build multi-stage (standalone)
```

### Flujo de inscripción

1. El postulante accede a `/` y ve los llamados con inscripción abierta.
2. En `/inscripcion/[concursoId]` lee el texto legal, completa sus datos, adjunta los 4 PDFs y acepta las declaraciones juradas.
3. La Server Action `inscribirPostulante` valida campos, tipos y tamaños, guarda los archivos en disco y crea el registro (con manejo de DNI duplicado `P2002`).
4. Redirige a `/inscripcion/[concursoId]/confirmacion` con el ID del postulante.
5. El comprobante PDF (`/api/comprobante/[postulanteId]`) incluye un **código QR** con la URL de verificación.

### Seguridad

- Panel `/admin/*` protegido por NextAuth v5 con sesiones en base de datos.
- Login por whitelist: sólo el `ADMIN_EMAIL` inicial o usuarios ya registrados pueden ingresar.
- Las rutas de descarga y export verifican la sesión y devuelven **401** sin autenticación.
