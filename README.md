# Formulario Único de Inscripción Digital a Concursos de Docentes

Aplicación web para la inscripción digital a concursos docentes (Profesores Titulares, Asociados y Adjuntos) de la Universidad Nacional de Tucumán, conforme al Reglamento General de Concursos Docentes vigente (Res. RES - DGAC - 10801 / 2026).

- **Postulantes:** ven los llamados con inscripción abierta, seleccionan el concurso, completan sus datos, adjuntan la documentación (solicitud, DNI, CV, respaldatoria de antecedentes) y aceptan las declaraciones juradas. Reciben un comprobante PDF con código QR.
- **Administradores (Departamento Concursos):** crean/editan/eliminan llamados, consultan postulantes, descargan la documentación y exportan a CSV/PDF. Login con Google OAuth.

**Stack:** Next.js 16 · Prisma · PostgreSQL · NextAuth v5 · Tailwind CSS v4 · pdfkit

---

## Documentación requerida por el postulante

Todos los archivos en PDF (validado en cliente y servidor):

| Documento | Límite |
|---|---|
| Solicitud de inscripción | 10 MB |
| Documento Nacional de Identidad (ambos lados) | 10 MB |
| Curriculum Vitae (Anexo II) | 100 MB |
| Documentación respaldatoria de antecedentes | 100 MB |

Los archivos se guardan en disco bajo `UPLOAD_DIR` (por defecto `./uploads`), en una carpeta por postulante. En producción debe montarse un volumen persistente.

---

## Deploy en Dokploy

### Requisitos previos

- Servidor con Dokploy
- Base de datos PostgreSQL accesible desde el servidor
- App de Google OAuth creada en [console.cloud.google.com](https://console.cloud.google.com)
- **Volumen persistente** para `/app/uploads` (almacenamiento de PDFs)

---

### 1. Crear la aplicación en Dokploy

1. Panel de Dokploy → **Applications** → **Create Application**
2. Completar:
   - **Name:** `concursos-docentes`
   - **Build Type:** `Dockerfile`
   - **Repository:** `git@github.com:brandall2021/concursos-docentes.git`
   - **Branch:** `master`
   - **Dockerfile Path:** `./Dockerfile`

---

### 2. Configurar variables de entorno

En Dokploy → aplicación → **Environment**:

```env
DATABASE_URL=postgresql://USUARIO:PASSWORD@HOST:PUERTO/concursos_docentes

AUTH_URL=https://concursos.softgroup.com.ar
AUTH_SECRET=<generá con: openssl rand -base64 32>

GOOGLE_CLIENT_ID=<desde Google Cloud Console>
GOOGLE_CLIENT_SECRET=<desde Google Cloud Console>

ADMIN_EMAIL=concursos@face.unt.edu.ar

UPLOAD_DIR=/app/uploads
```

> Para `AUTH_SECRET`: `openssl rand -base64 32`

---

### 3. Configurar volumen de uploads

En Dokploy → aplicación → **Advanced** → **Volumes / Mounts**, agregar:

- **Mount path (container):** `/app/uploads`
- **Volume/Host path:** el que provea Dokploy para persistencia

Sin este volumen, la documentación se pierde en cada redeploy.

---

### 4. Configurar dominio

En Dokploy → aplicación → **Domains**:

- **Domain:** `concursos.softgroup.com.ar`
- **Port:** `3000`
- **HTTPS:** activar (Let's Encrypt)

---

### 5. Configurar Google OAuth

En [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → **OAuth 2.0 Client ID** (Web application), agregar en **Authorized redirect URIs**:

```
https://concursos.softgroup.com.ar/api/auth/callback/google
```

---

### 6. Migraciones

La primera vez, o vía Post-deploy command:

```bash
npx prisma migrate deploy
```

---

### 7. Deploy y primer acceso

En Dokploy → **Deploy Now**. El entrypoint crea la base si no existe, aplica migraciones y levanta el contenedor en el puerto 3000.

Primer acceso en `/admin/login`: autenticarse con `ADMIN_EMAIL`. Desde `/admin/usuarios` se agregan otros administradores.

---

## Desarrollo local

```bash
npm install
cp .env.example .env

npx prisma migrate dev --name init
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### Tests

```bash
npm test
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx                              # Página pública: llamados abiertos
│   ├── inscripcion/[concursoId]/             # Formulario + confirmación
│   ├── admin/                                # Panel (protegido)
│   │   ├── concursos/                        # CRUD + postulantes
│   │   └── usuarios/                         # Gestión de admins
│   └── api/
│       ├── auth/[...nextauth]/               # NextAuth handlers
│       ├── comprobante/[postulanteId]/       # PDF comprobante con QR
│       └── admin/
│           ├── concursos/[id]/export/        # Export CSV / PDF
│           └── postulantes/[id]/documentos/  # Descarga de PDFs
├── actions/                                  # Server Actions
├── components/                               # Componentes React
└── lib/                                      # auth, prisma, uploads, estado de concurso
prisma/
└── schema.prisma                             # Modelos Concurso y Postulante
```
