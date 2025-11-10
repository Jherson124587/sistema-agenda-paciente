import { doctocFetch } from "./api-client";
import type { OrganizationId, UserId, PatientId, QuoteId } from "@/config/constants";

// ========== ORG INFO ==========
export async function apiGetOrgInfo(orgID: OrganizationId, sections: string[]) {
    return doctocFetch<{ [k: string]: unknown }>({
        path: "/getOrgInfoAPIV2",
        body: { orgID, sections },
    });
}

// ========== USERS ==========
export async function apiGetUserInfo(orgID: OrganizationId, uid: UserId, sections: string[]) {
    return doctocFetch<{ [k: string]: unknown }>({
        path: "/manageUserInfoAPIV2",
        body: { action: "get", orgID, uid, type: "user", sections },
    });
}

export async function apiUpdateUserCalendar(orgID: OrganizationId, uid: UserId, data: unknown) {
    return doctocFetch<{ status: string }>({
        path: "/manageUserInfoAPIV2",
        body: { action: "update", orgID, uid, type: "user", data },
    });
}

// ========== QUOTES / APPOINTMENTS ==========
export type CreateQuoteBody = {
    action: "create";
    orgID: OrganizationId;
    dayKey: string; // DD-MM-YYYY
    scheduledStart: string; // ISO
    scheduledEnd: string; // ISO
    patient: PatientId;
    userId: UserId;
    type: string;
    typeId?: string;
    motive: string;
    status: string;
    version: "v2";
    locationId?: string;
    recipeID?: string;
    category?: string;
    personaEjecutante?: string;
};

export async function apiCreateQuote(body: CreateQuoteBody) {
    return doctocFetch<{ status: string; quote: { id: QuoteId } }>({
        path: "/manageQuotesAPIV2",
        body,
    });
}

export async function apiUpdateQuote(body: Record<string, unknown>) {
    return doctocFetch<{ status: string; quote: { id: QuoteId } }>({
        path: "/manageQuotesAPIV2",
        body,
    });
}

export async function apiCancelQuote(body: { action: "cancel"; orgID: OrganizationId; dayKey: string; userId: UserId; quoteID: QuoteId; cancelReason?: string }) {
    return doctocFetch<{ status: string; action: string; quoteID: QuoteId }>({
        path: "/manageQuotesAPIV2",
        body,
    });
}

export async function apiGetDayQuotes(orgID: OrganizationId, dayKey: string, extra?: Record<string, unknown>) {
    return doctocFetch<{ status: string; quotes: any[]; total?: number }>({
        path: "/getDayQuotesAPIV2",
        body: { orgID, dayKey, ...(extra || {}) },
    });
}

export async function apiGetPatientQuotes(orgID: OrganizationId, patientID: PatientId) {
    return doctocFetch<{ status: string; quotes: any[]; total?: number }>({
        path: "/getPatientQuoteAPIV2",
        body: { orgID, patientID },
    });
}

export async function apiGetBusyRanges(orgID: OrganizationId, dayKey: string, userId?: UserId) {
    return doctocFetch<{ status?: string; busy_ranges?: { start: string; end: string }[] } | { start: string; end: string }[] >({
        path: "/getDayQuotesAPIV2",
        body: { orgID, dayKey, ...(userId ? { userId } : {}), format: "busy_ranges" },
    });
}

// ========== PATIENTS ==========
export async function apiGetAllPatients(orgID: OrganizationId) {
    return doctocFetch<{ status: string; total: number; patients: any[] }>({
        path: "/managePatientsAPIV2",
        body: { orgID, action: "getAll" },
    });
}

export async function apiCreatePatient(payload: { orgID: OrganizationId; names: string; surnames: string; dni?: string; birth_date?: string; gender?: string; phone?: string; mail?: string }) {
    return doctocFetch<{ status: string; action: string; patient_id: PatientId; message: string }>({
        path: "/managePatientsAPIV2",
        body: { action: "create", ...payload },
    });
}

export async function apiSearchPatients(payload: { orgID: OrganizationId; type: string; text: string; limit?: number }) {
    return doctocFetch<{ status: string; patients: any[] }>({
        path: "/managePatientsAPIV2",
        body: { action: "search", ...payload },
    });
}

export async function apiGetPatientById(orgID: OrganizationId, patientID: PatientId) {
    return doctocFetch<{ status: string; patients: any[] }>({
        path: "/managePatientsAPIV2",
        body: { action: "search", orgID, type: "id", text: patientID, limit: 1 },
    });
}

export async function apiUpdatePatient(payload: { orgID: OrganizationId; patient_id: PatientId; phone?: string; mail?: string; names?: string; surnames?: string; dni?: string; birth_date?: string; gender?: string }) {
    return doctocFetch<{ status: string; action: string; patient_id: PatientId; message: string }>({
        path: "/managePatientAPIV2",
        body: { action: "update", ...payload },
    });
}

// ========== PRICES ==========
export async function apiGetPrices(orgID: OrganizationId, categoriaID?: string) {
    return doctocFetch<{ total: number; prices: any[] }>({
        path: "/getPricesAPIV2",
        body: { orgID, action: "prices", ...(categoriaID ? { categoriaID } : {}) },
    });
}

export async function apiGetPriceCategories(orgID: OrganizationId) {
    return doctocFetch<{ categories: any[] }>({
        path: "/getPricesAPIV2",
        body: { orgID, action: "categories" },
    });
}

// ========== PAYMENTS ==========
export async function apiCreatePayment(orgID: OrganizationId, paymentData: any) {
    return doctocFetch<{ status: string; receiptID: string; receipt: any }>({
        path: "/managePaymentAPIV2",
        body: { action: "create", orgID, paymentData },
    });
}

export async function apiGetPatientPayments(orgID: OrganizationId, patientID: PatientId) {
    return doctocFetch<{ status: string; total: number; payments: any[] }>({
        path: "/getPatientPaymentsAPIV2",
        body: { orgID, patientID },
    });
}



