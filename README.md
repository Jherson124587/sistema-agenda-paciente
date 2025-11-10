# Doctoc Clinic Portal (Next.js)

Portal web completo para la gestión de citas médicas online utilizando las APIs de Doctoc.

## 🚀 Características

- ✅ Landing page de clínicas con información, sedes y especialidades
- ✅ Búsqueda de doctores por especialidad
- ✅ Visualización de horarios con manejo correcto de zona horaria
- ✅ Sistema de overbooking configurable (máx 2 citas simultáneas)
- ✅ Agendamiento de citas con validaciones
- ✅ Dashboard del paciente (ver, reagendar, cancelar citas)
- ✅ Autenticación con Firebase Auth
- ✅ Clean Architecture con separación de responsabilidades

## 📋 Requisitos

- Node.js 18+
- Next.js 16+
- npm o yarn

## 🔧 Instalación

```bash
npm install
```

## ⚙️ Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_DOCTOC_TOKEN=tu_token_aqui
NEXT_PUBLIC_TZ=America/Lima
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
```

## 🏃 Scripts

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm test` - Ejecuta los tests
- `npm run lint` - Ejecuta el linter

## 📍 Rutas Principales

### Públicas
- `/` - Página principal
- `/clinic/[orgId]` - Landing de clínica (SSR)
- `/clinic/[orgId]/search` - Búsqueda de doctores
- `/clinic/[orgId]/doctor/[uid]` - Detalle del doctor y disponibilidad
- `/clinic/[orgId]/doctor/[uid]/book` - Agendamiento de cita

### Autenticadas
- `/login` - Iniciar sesión
- `/register` - Registrarse
- `/logout` - Cerrar sesión
- `/patient` - Dashboard del paciente

## 🏗️ Arquitectura

El proyecto sigue **Clean Architecture** con las siguientes capas:

```
src/
├── app/              # Next.js App Router (rutas y layouts)
├── core/             # Capa de dominio
│   ├── domain/       # Entidades y repositorios (interfaces)
│   └── application/  # Servicios y casos de uso
├── infrastructure/   # Implementaciones externas
│   └── api/          # Cliente HTTP y APIs de Doctoc
├── presentation/      # UI y componentes
│   └── components/   # Componentes reutilizables
├── auth/             # Configuración de Firebase Auth
└── config/           # Constantes y configuración
```

## 🧪 Testing

El proyecto incluye configuración de Jest y Testing Library. Ejecuta:

```bash
npm test
```

## 📚 Documentación

- `docs/API.md` - Documentación de APIs utilizadas
- `docs/COMPONENTES.md` - Componentes reutilizables
- `docs/PROCESO.md` - Decisiones técnicas y proceso

## ⚠️ Notas Importantes

### Zona Horaria
El sistema maneja correctamente las zonas horarias usando `date-fns-tz`. Por defecto usa `America/Lima`, pero se puede configurar por organización.

### Overbooking
- Si está activado: permite hasta 2 citas simultáneas en el mismo horario
- Si está desactivado: bloquea horarios con solapamiento
- La configuración se lee del `calendarInfo` del doctor

## 🛠️ Tecnologías

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Firebase Auth
- date-fns / date-fns-tz
- Jest + Testing Library

## 📝 Licencia

Este proyecto es privado.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
