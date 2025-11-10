# Proceso y decisiones

- Clean Architecture para aislar dominio e infraestructura.
- Validación de overbooking en cliente para feedback inmediato; el servidor mantiene la fuente de verdad.
- Manejo de zona horaria con `date-fns-tz` (DEFAULT_TIME_ZONE configurable).
- Server Actions simplificadas mediante funciones en `infrastructure/api`.




