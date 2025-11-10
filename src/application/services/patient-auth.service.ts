import type { PatientId } from "@/config/constants";
import { apiGetAllPatients, apiSearchPatients } from "@/infrastructure/api/doctoc-api";

type Nullable<T> = T | null | undefined;

function normalizeEmail(email: Nullable<string>): string | null {
    if (!email) return null;
    const trimmed = email.trim();
    return trimmed ? trimmed.toLowerCase() : null;
}

function buildPatientKey(orgID: string, email: string) {
    return `patient_${orgID}_${email}`;
}

function buildOrgIdsKey(email: string) {
    return `patient_orgIDs_${email}`;
}

// Guardar patientID en localStorage vinculado con orgID y usuario
export function savePatientID(orgID: string, patientID: PatientId, userEmail?: string) {
    if (typeof window === "undefined") return;

    const normalizedEmail = normalizeEmail(userEmail);
    if (!normalizedEmail) return;

    const key = buildPatientKey(orgID, normalizedEmail);
    localStorage.setItem(key, patientID);
    console.log("[PatientAuth] savePatientID", { orgID, email: normalizedEmail, patientID });

    // Guardar lista de orgIDs donde el paciente tiene perfil (por usuario)
    const orgIDsKey = buildOrgIdsKey(normalizedEmail);
    const orgIDs = getPatientOrgIDs(normalizedEmail);
    if (!orgIDs.includes(orgID)) {
        orgIDs.push(orgID);
        localStorage.setItem(orgIDsKey, JSON.stringify(orgIDs));
    }
}

// Obtener lista de orgIDs donde el paciente tiene perfil
export function getPatientOrgIDs(userEmail?: string): string[] {
    if (typeof window === "undefined") return [];

    const normalizedEmail = normalizeEmail(userEmail);
    if (!normalizedEmail) {
        // Fallback a formato legacy
        const legacyKey = "patient_orgIDs";
        const legacyStored = localStorage.getItem(legacyKey);
        if (legacyStored) {
            try {
                return JSON.parse(legacyStored);
            } catch {
                return [];
            }
        }
        return [];
    }

    const orgIDsKey = buildOrgIdsKey(normalizedEmail);
    const stored = localStorage.getItem(orgIDsKey);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            return [];
        }
    }

    // Intentar recuperar datos guardados con formato legado (por compatibilidad)
    const legacyKey = `patient_orgIDs_${userEmail}`;
    const legacyStored = userEmail && userEmail !== normalizedEmail ? localStorage.getItem(legacyKey) : null;
    if (legacyStored) {
        try {
            const parsed = JSON.parse(legacyStored);
            localStorage.setItem(orgIDsKey, JSON.stringify(parsed));
            localStorage.removeItem(legacyKey);
            return parsed;
        } catch {
            return [];
        }
    }

    return [];
}

// Obtener patientID de localStorage (requiere email del usuario para evitar conflictos)
export function getPatientID(orgID: string, userEmail?: string): PatientId | null {
    if (typeof window === "undefined") return null;

    const normalizedEmail = normalizeEmail(userEmail);
    if (!normalizedEmail) return null;

    const key = buildPatientKey(orgID, normalizedEmail);
    const stored = localStorage.getItem(key);
    if (stored) {
        console.log("[PatientAuth] getPatientID (cache hit)", { orgID, email: normalizedEmail, patientID: stored });
        return stored;
    }

    // Intentar clave legado para compatibilidad
    if (userEmail && userEmail !== normalizedEmail) {
        const legacyKey = buildPatientKey(orgID, userEmail);
        const legacyStored = localStorage.getItem(legacyKey);
        if (legacyStored) {
            localStorage.setItem(key, legacyStored);
            localStorage.removeItem(legacyKey);
            console.log("[PatientAuth] getPatientID (legacy migration)", { orgID, email: normalizedEmail, patientID: legacyStored });
            return legacyStored;
        }
    }

    return null;
}

export function clearPatientCache(userEmail?: string) {
    if (typeof window === "undefined") return;

    const normalizedEmail = normalizeEmail(userEmail);
    const candidates = new Set<string>();
    if (normalizedEmail) candidates.add(normalizedEmail);
    if (userEmail && userEmail !== normalizedEmail) candidates.add(userEmail);

    if (candidates.size === 0) {
        // Limpiar solo claves legacy sin email asociado es riesgoso; evitarlo.
        return;
    }

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;

        for (const emailKey of candidates) {
            if (key === buildOrgIdsKey(emailKey)) {
                keysToRemove.push(key);
                break;
            }
            if (key.startsWith("patient_") && key.endsWith(`_${emailKey}`)) {
                keysToRemove.push(key);
                break;
            }
        }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log("[PatientAuth] clearPatientCache", { emails: Array.from(candidates), removedKeys: keysToRemove });
}

async function searchPatientByEmail(orgID: string, normalizedEmail: string): Promise<PatientId | null> {
    const attempt = async (type: string) => {
        try {
            const response = await apiSearchPatients({ orgID, type, text: normalizedEmail, limit: 5 });
            if (response.status === "success" && Array.isArray(response.patients)) {
                const match = response.patients.find((p: any) => {
                    const mail = normalizeEmail(p.mail || p.email);
                    return mail === normalizedEmail;
                });
                return match?.patient_id ?? null;
            }
        } catch {
            // Ignore and fallback
        }
        return null;
    };

    // Intentar variantes conocidas
    const typesToTry = ["mail", "email", "correo"];
    for (const type of typesToTry) {
        const found = await attempt(type);
        if (found) return found;
    }

    return null;
}

// Buscar paciente por email usando APIs de búsqueda y fallback a getAll
export async function findPatientByEmail(orgID: string, email: string): Promise<PatientId | null> {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;

    // Primero intentar con endpoint de búsqueda específico
    const bySearch = await searchPatientByEmail(orgID, normalizedEmail);
    if (bySearch) {
        savePatientID(orgID, bySearch, normalizedEmail);
        console.log("[PatientAuth] findPatientByEmail via search", { orgID, email: normalizedEmail, patientID: bySearch });
        return bySearch;
    }

    // Fallback: obtener todos los pacientes y filtrar manualmente
    try {
        const result = await apiGetAllPatients(orgID);

        if (result.status === "success" && Array.isArray(result.patients)) {
            const patient = result.patients.find((p: any) => {
                const mail = normalizeEmail(p.mail || p.email);
                return mail === normalizedEmail;
            });

            if (patient?.patient_id) {
                savePatientID(orgID, patient.patient_id, normalizedEmail);
                console.log("[PatientAuth] findPatientByEmail via getAll", { orgID, email: normalizedEmail, patientID: patient.patient_id });
                return patient.patient_id;
            }
        }
    } catch {
        // ignore fallback errors
    }

    console.warn("[PatientAuth] findPatientByEmail not found", { orgID, email: normalizedEmail });
    return null;
}

