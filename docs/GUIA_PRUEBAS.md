# Guía de Pruebas - Doctoc Clinic Portal

## 📋 Pre-requisitos

1. Node.js 18+ instalado
2. npm o yarn instalado
3. Variables de entorno configuradas

## 🚀 Pasos para Probar la Aplicación

### 1. Instalar Dependencias

```bash
npm install
```

Si hay conflictos de peer dependencies, usa:

```bash
npm install --legacy-peer-deps
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Token de la API Doctoc (obtenido de la documentación)
NEXT_PUBLIC_DOCTOC_TOKEN=PRk2P5dbYptiss5w2U8jdVPu9DAHXcoWmFrl3lDmGMthqfgtjePvJk6MacyiPPlK

# Zona horaria (America/Lima por defecto)
NEXT_PUBLIC_TZ=America/Lima

# Firebase Auth (si vas a probar autenticación)
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
```

**Nota:** El token mostrado es el que aparece en la documentación de la API. Si tienes tu propio token, úsalo.

### 3. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: `http://localhost:3000`

### 4. Probar las Funcionalidades

#### A. Landing Page de Clínica

**URL:** `http://localhost:3000/clinic/[orgId]`

**Ejemplo con orgId del ejemplo:**
```
http://localhost:3000/clinic/rFQpBRoNGiv0V9KnHZV6
```

**Qué deberías ver:**
- Información de la clínica (nombre, imagen, web)
- Redes sociales
- Lista de especialidades
- Lista de sedes
- Botón "Buscar doctores"

#### B. Búsqueda de Doctores

**URL:** `http://localhost:3000/clinic/[orgId]/search`

**Ejemplo:**
```
http://localhost:3000/clinic/rFQpBRoNGiv0V9KnHZV6/search
```

**Qué probar:**
1. Ver la lista de doctores disponibles
2. Buscar por nombre (escribir en el campo de búsqueda)
3. Filtrar por especialidad (usar el dropdown)
4. Hacer clic en un doctor para ver su perfil

#### C. Perfil del Doctor

**URL:** `http://localhost:3000/clinic/[orgId]/doctor/[userId]`

**Ejemplo:**
```
http://localhost:3000/clinic/rFQpBRoNGiv0V9KnHZV6/doctor/QI0H3vOu8rbeyAkXMG9WIDf9GRX2
```

**Qué deberías ver:**
- Información del doctor (nombre, especialidad)
- Estado de overbooking (activado/desactivado)
- Citas ocupadas del día actual
- Botón "Agendar cita"

#### D. Agendar Cita

**URL:** `http://localhost:3000/clinic/[orgId]/doctor/[userId]/book`

**Ejemplo:**
```
http://localhost:3000/clinic/rFQpBRoNGiv0V9KnHZV6/doctor/QI0H3vOu8rbeyAkXMG9WIDf9GRX2/book
```

**Qué probar:**
1. Seleccionar una fecha usando el DatePicker
2. Ingresar el ID del paciente (ej: `hzlXjBaIMZxn2Az7xEeu`)
3. Ingresar el motivo de la cita
4. Ver la grilla de horarios disponibles (ScheduleGrid)
5. Los horarios ocupados aparecerán deshabilitados
6. Si overbooking está activo, se permitirán hasta 2 citas simultáneas
7. Seleccionar un horario disponible
8. Confirmar en el modal
9. Verificar que se crea la cita

**Validaciones a probar:**
- ✅ No permite seleccionar horarios completamente ocupados (sin overbooking)
- ✅ Permite hasta 2 citas si overbooking está activo
- ✅ Muestra la zona horaria correcta
- ✅ Convierte correctamente de hora local a UTC

#### E. Dashboard del Paciente

**URL:** `http://localhost:3000/patient`

**Requisitos:** Necesitas estar autenticado (ver sección de autenticación)

**Qué probar:**
1. Ingresar `orgID` (ej: `rFQpBRoNGiv0V9KnHZV6`)
2. Ingresar `patientID` (ej: `hzlXjBaIMZxn2Az7xEeu`)
3. Clic en "Cargar citas"
4. Ver lista de citas del paciente
5. Probar "Cancelar" con motivo
6. Probar "Reagendar" (redirige a página de agendamiento)

#### F. Autenticación

**Login:** `http://localhost:3000/login`

**Registro:** `http://localhost:3000/register`

**Nota:** Para probar autenticación, necesitas configurar Firebase Auth correctamente.

## 🧪 Casos de Prueba Específicos

### Caso 1: Verificar Zona Horaria

1. Ir a agendar cita
2. Verificar que la zona horaria mostrada sea correcta (America/Lima por defecto)
3. Los horarios mostrados deben estar en la zona horaria local
4. Al crear la cita, debe enviarse en UTC a la API

### Caso 2: Overbooking

**Sin overbooking:**
1. Agendar una cita en un horario específico
2. Intentar agendar otra cita en el mismo horario
3. ✅ Debe estar bloqueado

**Con overbooking (máx 2):**
1. Agendar primera cita
2. Agendar segunda cita en el mismo horario (debe permitirse)
3. Intentar agendar tercera cita en el mismo horario
4. ✅ Debe estar bloqueado (muestra "ocupado 2/2")

### Caso 3: Cancelación de Cita

1. En el dashboard del paciente, cargar las citas
2. Clic en "Cancelar" de una cita
3. Ingresar motivo (opcional)
4. Confirmar cancelación
5. ✅ La cita debe desaparecer de la lista

### Caso 4: Búsqueda Dinámica

1. Ir a búsqueda de doctores
2. Escribir en el campo de búsqueda
3. ✅ Los resultados deben filtrarse en tiempo real
4. Cambiar especialidad
5. ✅ Los resultados deben actualizarse

## 🐛 Troubleshooting

### Error: "Cannot find module 'date-fns-tz'"

```bash
npm install date-fns-tz --legacy-peer-deps
```

### Error: "API error 401"

Verifica que el token en `.env.local` sea correcto.

### Error: "Firebase not initialized"

Si no vas a probar autenticación, puedes dejar las variables de Firebase vacías o comentarlas.

### Los horarios no se muestran correctamente

1. Verifica la variable `NEXT_PUBLIC_TZ` en `.env.local`
2. Verifica que la fecha esté en formato correcto (DD-MM-YYYY)
3. Revisa la consola del navegador para errores

## 📊 Datos de Prueba

### orgID de ejemplo:
```
rFQpBRoNGiv0V9KnHZV6
```

### userId (doctor) de ejemplo:
```
QI0H3vOu8rbeyAkXMG9WIDf9GRX2
```

### patientID de ejemplo:
```
hzlXjBaIMZxn2Az7xEeu
```

### dayKey formato:
```
DD-MM-YYYY
Ejemplo: 14-03-2025
```

## ✅ Checklist de Pruebas

- [ ] La aplicación inicia sin errores
- [ ] Landing page muestra información de clínica
- [ ] Búsqueda de doctores funciona
- [ ] Filtro por especialidad funciona
- [ ] Perfil del doctor muestra información correcta
- [ ] ScheduleGrid muestra horarios disponibles
- [ ] Overbooking funciona correctamente
- [ ] Zona horaria se maneja correctamente
- [ ] Agendamiento crea la cita correctamente
- [ ] Dashboard muestra citas del paciente
- [ ] Cancelación funciona con motivo
- [ ] Autenticación funciona (si está configurada)

## 🎯 Próximos Pasos

1. Probar con datos reales de tu organización
2. Configurar Firebase Auth para autenticación completa
3. Personalizar estilos si es necesario
4. Agregar más validaciones según necesidades


