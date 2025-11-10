import type { AppointmentsRepository } from "@/core/repositories/appointments-repository";
import type { Appointment } from "@/core/domain/entities/Appointment";
import type { BusyRange } from "@/core/domain/entities/Schedule";
import { apiCancelQuote, apiCreateQuote, apiGetBusyRanges, apiGetDayQuotes, apiUpdateQuote } from "./doctoc-api";

function mapQuoteToAppointment(q: any): Appointment {
    return {
        id: q.id,
        patientId: q.patientId || q.patient,
        userId: q.userId || q.medico,
        date: q.date,
        startDate: q.startDate || q.scheduledStart,
        endDate: q.endDate || q.scheduledEnd,
        type: q.type,
        motive: q.motive,
        status: q.status,
        locationId: q.locationId,
    };
}

export class AppointmentsApiRepository implements AppointmentsRepository {
    async getDayAppointments(params: { orgID: string; dayKey: string; userId?: string }): Promise<Appointment[]> {
        const { orgID, dayKey, userId } = params;
        const data = await apiGetDayQuotes(orgID, dayKey, userId ? { userId } : undefined);
        return (data.quotes || []).map(mapQuoteToAppointment);
    }

    async getBusyRanges(params: { orgID: string; dayKey: string; userId?: string }): Promise<BusyRange[]> {
        const { orgID, dayKey, userId } = params;
        const data = await apiGetBusyRanges(orgID, dayKey, userId);
        if (Array.isArray(data)) return data as BusyRange[];
        return (data.busy_ranges || []) as BusyRange[];
    }

    async createAppointment(payload: Record<string, unknown>): Promise<{ id: string }> {
        const res = await apiCreateQuote(payload as any);
        return { id: (res as any).quote?.id };
    }

    async updateAppointment(payload: Record<string, unknown>): Promise<{ id: string }> {
        const res = await apiUpdateQuote(payload);
        return { id: (res as any).quote?.id };
    }

    async cancelAppointment(payload: { orgID: string; dayKey: string; userId: string; quoteID: string; cancelReason?: string }): Promise<void> {
        await apiCancelQuote({ action: "cancel", ...payload });
    }
}




