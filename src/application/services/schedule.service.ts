import { DEFAULT_MAX_CONCURRENT_APPTS, DEFAULT_TIME_ZONE } from "@/config/constants";
import type { BusyRange, ScheduleConfig } from "@/core/domain/entities/Schedule";
import { zonedTimeToUtc, utcToZonedTime } from "date-fns-tz";

export type TimeSlot = { start: Date; end: Date; isoStart: string; isoEnd: string };

export function toOrgISO(dateLike: string | Date, tz: string = DEFAULT_TIME_ZONE) {
    const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
    // Asegura que la hora entregada se interprete en la zona horaria de la org
    const utc = zonedTimeToUtc(date, tz);
    return utc.toISOString();
}

export function busyRangesToSlots(busy: BusyRange[], tz: string = DEFAULT_TIME_ZONE): TimeSlot[] {
    return busy.map(b => {
        const start = utcToZonedTime(new Date(b.start), tz);
        const end = utcToZonedTime(new Date(b.end), tz);
        return { start, end, isoStart: new Date(b.start).toISOString(), isoEnd: new Date(b.end).toISOString() };
    });
}

export function isSlotAvailable(target: TimeSlot, busy: BusyRange[], config: ScheduleConfig): boolean {
    const max = config.allowOverbooking ? (config.maxConcurrentAppointments ?? DEFAULT_MAX_CONCURRENT_APPTS) : 1;
    const overlaps = busy.filter(b => overlapISO(target.isoStart, target.isoEnd, b.start, b.end)).length;
    return overlaps < max;
}

function overlapISO(aStart: string, aEnd: string, bStart: string, bEnd: string) {
    const aS = new Date(aStart).getTime();
    const aE = new Date(aEnd).getTime();
    const bS = new Date(bStart).getTime();
    const bE = new Date(bEnd).getTime();
    return aS < bE && bS < aE;
}




