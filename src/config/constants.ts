export const DOCTOC_BASE_URL = "https://us-central1-doctoc-main.cloudfunctions.net";

// Token por defecto solo para desarrollo local; en prod debe venir de env/server
export const DOCTOC_API_TOKEN = process.env.NEXT_PUBLIC_DOCTOC_TOKEN || "";

// Zona horaria por defecto de la organización (fallback):
// Se debe leer desde la clínica si estuviera disponible; usamos Lima como default.
export const DEFAULT_TIME_ZONE = process.env.NEXT_PUBLIC_TZ || "America/Lima";

export const DEFAULT_MAX_CONCURRENT_APPTS = 2;

export type OrganizationId = string;
export type UserId = string;
export type PatientId = string;
export type QuoteId = string;



