import { zonedTimeToUtc, utcToZonedTime, format } from "date-fns-tz";
import { DEFAULT_MAX_CONCURRENT_APPTS, DEFAULT_TIME_ZONE } from "@/config/constants";
import type { BusyRange } from "@/core/domain/entities/Schedule";

export type DoctorSchedule = {
    horariesFijo?: {
        Monday?: TimeBlock[];
        Tuesday?: TimeBlock[];
        Wednesday?: TimeBlock[];
        Thursday?: TimeBlock[];
        Friday?: TimeBlock[];
        Saturday?: TimeBlock[];
        Sunday?: TimeBlock[];
    };
    horariesDinamico?: DynamicSchedule[];
    configureByType?: boolean;
    overschedule?: boolean;
    maxConcurrentAppointments?: number;
    timezone?: string;
};

export type TimeBlock = {
    id: number;
    start: string; // HH:mm
    end: string; // HH:mm
};

export type DynamicSchedule = {
    id: number;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    daySchedules: {
        [date: string]: TimeBlock[]; // YYYY-MM-DD: TimeBlock[]
    };
};

export type AvailableSlot = {
    startISO: string;
    endISO: string;
    startLocal: string;
    endLocal: string;
};

type WeekdayKey = keyof NonNullable<DoctorSchedule["horariesFijo"]>;

// Obtener día de la semana en inglés
function getDayName(date: Date): string {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[date.getDay()];
}

// Convertir HH:mm a ISO en una fecha específica (usando zona horaria del doctor)
function timeToISO(dateStr: string, timeStr: string, timezone: string): string {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const localDateTime = `${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
    // Convertir desde la zona horaria del doctor a UTC
    return zonedTimeToUtc(localDateTime, timezone).toISOString();
}

// Verificar si dos rangos de tiempo se solapan (en UTC)
function overlapsUTC(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
    const aS = new Date(aStart).getTime();
    const aE = new Date(aEnd).getTime();
    const bS = new Date(bStart).getTime();
    const bE = new Date(bEnd).getTime();
    // Solapan si: aStart < bEnd && bStart < aEnd
    return aS < bE && bS < aE;
}

// Generar slots disponibles para un día específico
export function getAvailableSlotsForDay(
    dayKey: string, // DD-MM-YYYY
    schedule: DoctorSchedule,
    busyRanges: BusyRange[],
    intervalMinutes: number = 30
): AvailableSlot[] {
    const [dd, mm, yyyy] = dayKey.split("-");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const date = new Date(`${dateStr}T12:00:00`);
    const dayName = getDayName(date);
    const tz = schedule.timezone || DEFAULT_TIME_ZONE;

    // 1. Prioridad: Excepciones (horariesDinamico para esta fecha específica)
    let dayBlocks: TimeBlock[] = [];
    if (schedule.horariesDinamico && schedule.horariesDinamico.length > 0) {
        const dynamic = schedule.horariesDinamico.find(d => {
            const start = new Date(d.startDate);
            const end = new Date(d.endDate);
            const current = new Date(dateStr);
            return current >= start && current <= end;
        });
        if (dynamic?.daySchedules[dateStr]) {
            dayBlocks = dynamic.daySchedules[dateStr];
        }
    }

    // 2. Si no hay excepción, usar horarios fijos
    if (dayBlocks.length === 0 && schedule.horariesFijo) {
        const daySchedule = schedule.horariesFijo[dayName as keyof typeof schedule.horariesFijo];
        if (daySchedule && daySchedule.length > 0) {
            dayBlocks = daySchedule;
        }
    }

    // Si no hay horarios configurados para este día, el médico no atiende
    if (dayBlocks.length === 0) {
        return [];
    }

    // Generar slots desde los bloques configurados
    const slots: AvailableSlot[] = [];
    for (const block of dayBlocks) {
        const [startH, startM] = block.start.split(":").map(Number);
        const [endH, endM] = block.end.split(":").map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        for (let minutes = startMinutes; minutes < endMinutes; minutes += intervalMinutes) {
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            const nextMinutes = minutes + intervalMinutes;
            const nextH = Math.floor(nextMinutes / 60);
            const nextM = nextMinutes % 60;
            const nextTimeStr = `${String(nextH).padStart(2, "0")}:${String(nextM).padStart(2, "0")}`;

            // Convertir a UTC usando la zona horaria del doctor
            const startISO = timeToISO(dateStr, timeStr, tz);
            const endISO = timeToISO(dateStr, nextTimeStr, tz);

            // Mostrar en zona horaria local
            const localStart = utcToZonedTime(new Date(startISO), tz);
            const localEnd = utcToZonedTime(new Date(endISO), tz);
            
            slots.push({
                startISO,
                endISO,
                startLocal: format(localStart, "HH:mm", { timeZone: tz }),
                endLocal: format(localEnd, "HH:mm", { timeZone: tz }),
            });
        }
    }

    return slots;
}

// Verificar disponibilidad con overbooking (CRÍTICO: contar correctamente las citas ocupadas)
export function isSlotAvailableWithOverbooking(
    slot: AvailableSlot,
    busyRanges: BusyRange[],
    config: { allowOverbooking: boolean; maxConcurrent?: number }
): { available: boolean; count: number; max: number } {
    // Contar cuántas citas ocupadas se solapan con este slot
    const overlaps = busyRanges.filter(b => {
        // IMPORTANTE: Comparar en UTC, ambos rangos ya están en UTC desde la API
        return overlapsUTC(slot.startISO, slot.endISO, b.start, b.end);
    }).length;

    const max = config.allowOverbooking ? (config.maxConcurrent || 2) : 1;
    
    // Si hay overbooking, permitir hasta max citas simultáneas
    // Si no hay overbooking, solo permitir si no hay ninguna cita
    const available = overlaps < max;
    
    return {
        available,
        count: overlaps,
        max,
    };
}

export function getBookableSlotsForDay(
    dayKey: string,
    schedule: DoctorSchedule,
    busyRanges: BusyRange[],
    intervalMinutes: number = 30
): AvailableSlot[] {
    const baseSlots = getAvailableSlotsForDay(dayKey, schedule, busyRanges, intervalMinutes);
    const allowOverbooking = Boolean(schedule.overschedule);
    const maxConcurrent = schedule.maxConcurrentAppointments ?? DEFAULT_MAX_CONCURRENT_APPTS;

    return baseSlots.filter(slot =>
        isSlotAvailableWithOverbooking(slot, busyRanges, {
            allowOverbooking,
            maxConcurrent,
        }).available
    );
}

function cloneTimeBlock(block: TimeBlock): TimeBlock {
    return { id: block.id, start: block.start, end: block.end };
}

export function mapCalendarInfoToSchedule(calendarInfo: any): DoctorSchedule {
    const horarios = (calendarInfo?.horarios ?? {}) as Record<string, Record<string, any>>;

    const mergedFijo: Partial<Record<WeekdayKey, TimeBlock[]>> = {};
    const mergedDynamic = new Map<string, DynamicSchedule>();

    Object.values(horarios).forEach(byType => {
        if (!byType || typeof byType !== "object") return;

        Object.values(byType).forEach(config => {
            if (!config || typeof config !== "object") return;

            const fixedSchedules = config.horariesFijo || {};
            Object.entries(fixedSchedules).forEach(([day, blocks]) => {
                if (!Array.isArray(blocks) || blocks.length === 0) return;
                const dayKey = day as WeekdayKey;
                if (!mergedFijo[dayKey]) {
                    mergedFijo[dayKey] = [];
                }
                const existing = mergedFijo[dayKey]!;
                const seen = new Set(existing.map(b => `${b.start}-${b.end}`));
                blocks.forEach((block: TimeBlock) => {
                    const key = `${block.start}-${block.end}`;
                    if (!seen.has(key)) {
                        existing.push(cloneTimeBlock(block));
                        seen.add(key);
                    }
                });
                existing.sort((a, b) => a.start.localeCompare(b.start));
            });

            const dynamicSchedules = Array.isArray(config.horariesDinamico) ? config.horariesDinamico : [];
            dynamicSchedules.forEach((dynamic: DynamicSchedule) => {
                if (!dynamic || typeof dynamic !== "object") return;
                const dynamicKey = `${dynamic.id}-${dynamic.startDate}-${dynamic.endDate}`;
                if (mergedDynamic.has(dynamicKey)) return;

                const clonedDaySchedules: Record<string, TimeBlock[]> = {};
                Object.entries(dynamic.daySchedules || {}).forEach(([dateKey, dayBlocks]) => {
                    if (!Array.isArray(dayBlocks)) return;
                    const unique = new Map<string, TimeBlock>();
                    dayBlocks.forEach(block => {
                        const key = `${block.start}-${block.end}`;
                        if (!unique.has(key)) {
                            unique.set(key, cloneTimeBlock(block));
                        }
                    });
                    clonedDaySchedules[dateKey] = Array.from(unique.values()).sort((a, b) => a.start.localeCompare(b.start));
                });

                mergedDynamic.set(dynamicKey, {
                    id: dynamic.id,
                    startDate: dynamic.startDate,
                    endDate: dynamic.endDate,
                    daySchedules: clonedDaySchedules,
                });
            });
        });
    });

    const timezone = calendarInfo?.timezone || DEFAULT_TIME_ZONE;
    const overschedule = Boolean(calendarInfo?.overschedule);
    const maxConcurrent = calendarInfo?.maxConcurrentAppointments ?? DEFAULT_MAX_CONCURRENT_APPTS;

    const horariesFijo = Object.keys(mergedFijo).length > 0 ? mergedFijo : undefined;
    const horariesDinamico = mergedDynamic.size > 0 ? Array.from(mergedDynamic.values()) : undefined;

    return {
        horariesFijo,
        horariesDinamico,
        configureByType: calendarInfo?.configureByType,
        overschedule,
        maxConcurrentAppointments: maxConcurrent,
        timezone,
    };
}
