import type { Appointment } from "@/core/domain/entities/Appointment";
import type { BusyRange } from "@/core/domain/entities/Schedule";

export interface AppointmentsRepository {
    getDayAppointments(params: { orgID: string; dayKey: string; userId?: string }): Promise<Appointment[]>;
    getBusyRanges(params: { orgID: string; dayKey: string; userId?: string }): Promise<BusyRange[]>;
    createAppointment(payload: Record<string, unknown>): Promise<{ id: string }>;
    updateAppointment(payload: Record<string, unknown>): Promise<{ id: string }>;
    cancelAppointment(payload: { orgID: string; dayKey: string; userId: string; quoteID: string; cancelReason?: string }): Promise<void>;
}




