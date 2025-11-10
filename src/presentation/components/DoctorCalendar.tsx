"use client";
import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { Loading } from "./ui/Loading";
import { apiGetBusyRanges, apiGetUserInfo } from "@/infrastructure/api/doctoc-api";
import { getAvailableSlotsForDay, getBookableSlotsForDay, mapCalendarInfoToSchedule, type DoctorSchedule } from "@/application/services/doctor-schedule.service";
import { format, addDays, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday, isPast, startOfDay } from "date-fns";

type Props = {
    orgID: string;
    userId: string;
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    minDate?: Date;
    maxDate?: Date;
    patientQuotes?: any[]; // Citas del paciente para bloquear fechas
};

export const DoctorCalendar = memo(function DoctorCalendar({ orgID, userId, selectedDate, onDateSelect, minDate, maxDate, patientQuotes = [] }: Props) {
    const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(selectedDate));
    const [schedule, setSchedule] = useState<DoctorSchedule>({});
    const [loading, setLoading] = useState(true);
    const [availableDays, setAvailableDays] = useState<Set<string>>(new Set());
    const [dayAvailability, setDayAvailability] = useState<Record<string, { hasSlots: boolean; fetched: boolean }>>({});

    useEffect(() => {
        setCurrentMonth(startOfMonth(selectedDate));
    }, [selectedDate]);

    // Calcular rango de fechas a verificar usando useMemo para evitar recálculos
    const minCheckDate = useMemo(() => {
        if (minDate) {
            return startOfDay(minDate).getTime();
        }
        return startOfDay(new Date()).getTime();
    }, [minDate]);

    const maxCheckDate = useMemo(() => {
        if (maxDate) {
            return startOfDay(maxDate).getTime();
        }
        return startOfDay(addDays(new Date(), 30)).getTime();
    }, [maxDate]);

    const resolveDayAvailability = useCallback(
        async (dayKey: string, scheduleData: DoctorSchedule): Promise<boolean> => {
            try {
                const response = await apiGetBusyRanges(orgID, dayKey, userId);
                const busyRanges = Array.isArray(response) ? response : Array.isArray((response as any)?.busy_ranges) ? (response as any).busy_ranges : [];
                const bookableSlots = getBookableSlotsForDay(dayKey, scheduleData, busyRanges, 30);
                return bookableSlots.length > 0;
            } catch (error) {
                if (process.env.NODE_ENV !== "production") {
                    // eslint-disable-next-line no-console
                    console.warn("[DoctorCalendar] Error fetching busy ranges, using schedule fallback", { dayKey, error });
                }
                const fallbackSlots = getAvailableSlotsForDay(dayKey, scheduleData, [], 30);
                return fallbackSlots.length > 0;
            }
        },
        [orgID, userId]
    );

    useEffect(() => {
        let cancelled = false;
        
        (async () => {
            setLoading(true);
            try {
                // Obtener información del calendario del doctor
                const userInfo = await apiGetUserInfo(orgID, userId, ["calendarInfo"]);
                if (cancelled) return;
                
                const calendarInfo = (userInfo as any).calendarInfo || {};
                const scheduleData: DoctorSchedule = mapCalendarInfoToSchedule(calendarInfo);
                setSchedule(scheduleData);

                const availabilityUpdates: Record<string, { hasSlots: boolean; fetched: boolean }> = {};
                const daysWithAvailability: string[] = [];

                const startDate = new Date(minCheckDate);
                const endDate = new Date(maxCheckDate);
                const dayKeys: string[] = [];

                while (startDate <= endDate) {
                    const dd = String(startDate.getDate()).padStart(2, "0");
                    const mm = String(startDate.getMonth() + 1).padStart(2, "0");
                    const yyyy = startDate.getFullYear();
                    dayKeys.push(`${dd}-${mm}-${yyyy}`);
                    startDate.setDate(startDate.getDate() + 1);
                }

                const concurrency = 5;
                for (let index = 0; index < dayKeys.length; index += concurrency) {
                    if (cancelled) return;
                    const chunk = dayKeys.slice(index, index + concurrency);
                    const chunkResults = await Promise.all(
                        chunk.map(async dayKey => {
                            const hasSlots = await resolveDayAvailability(dayKey, scheduleData);
                            return { dayKey, hasSlots };
                        })
                    );

                    if (cancelled) return;

                    chunkResults.forEach(({ dayKey, hasSlots }) => {
                        availabilityUpdates[dayKey] = { hasSlots, fetched: true };
                        if (hasSlots) {
                            daysWithAvailability.push(dayKey);
                        }
                    });
                }

                const today = new Date();
                const todayDayKey = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
                if (!availabilityUpdates[todayDayKey]) {
                    const hasSlots = await resolveDayAvailability(todayDayKey, scheduleData);
                    availabilityUpdates[todayDayKey] = { hasSlots, fetched: true };
                    if (hasSlots) {
                        daysWithAvailability.push(todayDayKey);
                    }
                }

                if (!cancelled) {
                    setAvailableDays(new Set(daysWithAvailability));
                    setDayAvailability(prev => ({ ...prev, ...availabilityUpdates }));
                }
            } catch (e) {
                if (!cancelled) {
                    console.error("Error loading calendar", e);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [orgID, userId, minCheckDate, maxCheckDate, resolveDayAvailability]);

    useEffect(() => {
        if (!schedule.timezone) return;
        const today = new Date();
        const todayDayKey = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
        if (dayAvailability[todayDayKey]?.fetched) return;

        let cancelled = false;
        (async () => {
            const hasSlots = await resolveDayAvailability(todayDayKey, schedule);
            if (!cancelled) {
                setDayAvailability(prev => ({ ...prev, [todayDayKey]: { hasSlots, fetched: true } }));
                setAvailableDays(prev => {
                    const next = new Set(prev);
                    if (hasSlots) {
                        next.add(todayDayKey);
                    } else {
                        next.delete(todayDayKey);
                    }
                    return next;
                });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [schedule, resolveDayAvailability, dayAvailability]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = [];
    let day = new Date(calendarStart);
    
    while (day <= calendarEnd) {
        days.push(new Date(day));
        day = addDays(day, 1);
    }

    const minDateBoundary = minDate ? startOfDay(minDate) : undefined;
    const maxDateBoundary = maxDate ? startOfDay(maxDate) : undefined;
    const prevMonth = startOfMonth(subMonths(currentMonth, 1));
    const nextMonth = startOfMonth(addMonths(currentMonth, 1));
    const prevMonthEnd = endOfMonth(prevMonth);
    const canGoPrev = !minDateBoundary || prevMonthEnd >= minDateBoundary;
    const canGoNext = !maxDateBoundary || nextMonth <= maxDateBoundary;

    const isDayAvailable = (date: Date): boolean => {
        if (isPast(date) && !isToday(date)) return false;
        
        const dd = String(date.getDate()).padStart(2, "0");
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const yyyy = date.getFullYear();
        const dayKey = `${dd}-${mm}-${yyyy}`;
        
        // Si es el día de hoy, verificar siempre en tiempo real si tiene horas disponibles
        // Esto asegura que el día de hoy siempre se pueda seleccionar si tiene horas futuras
        // Incluso si no está en el Set inicial de availableDays
        const isTodayDate = isToday(date);
        if (isTodayDate) {
            // Verificar primero si está en el Set (más rápido)
            if (availableDays.has(dayKey)) {
                return true;
            }
            // Si no está en el Set pero el schedule está cargado, verificar en tiempo real
            // Solo verificar si schedule tiene datos (timezone indica que está cargado)
            if (schedule.timezone) {
                const slots = getAvailableSlotsForDay(dayKey, schedule, [], 30);
                return slots.length > 0;
            }
            // Si el schedule aún no está cargado, asumir que está disponible si es el día de hoy
            // (para evitar que aparezca como no disponible durante la carga inicial)
            return true;
        }
        
        const cached = dayAvailability[dayKey];
        if (cached) {
            return cached.hasSlots;
        }

        return availableDays.has(dayKey);
    };

    const isDaySelectable = (date: Date): boolean => {
        const isTodayDate = isToday(date);
        const dd = String(date.getDate()).padStart(2, "0");
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const yyyy = date.getFullYear();
        const dayKey = `${dd}-${mm}-${yyyy}`;
        
        // IMPORTANTE: Para el día de hoy, verificar disponibilidad PRIMERO
        // y SIEMPRE permitir si está disponible, sin importar otras validaciones
        // Esto asegura que el usuario pueda volver a seleccionar el día de hoy
        if (isTodayDate) {
            const isAvailable = isDayAvailable(date);
            // Para el día de hoy, SOLO validar disponibilidad
            // Ignorar TODAS las demás validaciones (minDate, maxDate, isPast) para el día de hoy
            return isAvailable;
        }
        
        // Para otros días, aplicar todas las validaciones normales
        const isPastDate = isPast(date);
        if (isPastDate) {
            return false;
        }
        
        // Validar minDate y maxDate usando comparación de fechas sin horas
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        if (minDate) {
            const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
            if (dateOnly < minDateOnly) {
                return false;
            }
        }
        if (maxDate) {
            const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
            if (dateOnly > maxDateOnly) {
                return false;
            }
        }
        
        const isAvailable = isDayAvailable(date);
        
        // Solo bloquear el día si NO tiene horas disponibles (médico no atiende)
        // NO bloquear si el paciente ya tiene cita (eso se maneja en ScheduleGrid bloqueando solo el horario)
        return isAvailable;
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loading size="lg" />
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 shadow-lg">
            {/* Header mejorado */}
            <div className="mb-6 flex items-center justify-between">
                <button
                    className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 p-2 text-white shadow-md hover:from-teal-600 hover:to-cyan-600 hover:shadow-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-md"
                    onClick={() => setCurrentMonth(prev => startOfMonth(subMonths(prev, 1)))}
                    disabled={!canGoPrev}
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h3 className="text-xl font-bold text-gray-900 capitalize">
                    {format(currentMonth, "MMMM yyyy")}
                </h3>
                <button
                    className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 p-2 text-white shadow-md hover:from-teal-600 hover:to-cyan-600 hover:shadow-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-md"
                    onClick={() => setCurrentMonth(prev => startOfMonth(addMonths(prev, 1)))}
                    disabled={!canGoNext}
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
                {/* Días de la semana */}
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
                    <div key={day} className="p-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wide">
                        {day}
                    </div>
                ))}

                {/* Días del calendario */}
                {days.map((day, idx) => {
                    const isAvailable = isDayAvailable(day);
                    const isSelectable = isDaySelectable(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isCurrentDay = isToday(day);

                    return (
                        <button
                            key={idx}
                            disabled={!isSelectable}
                            onClick={() => {
                                if (isSelectable) {
                                    onDateSelect(day);
                                }
                            }}
                            className={`
                                group relative h-12 w-full rounded-xl border-2 text-sm font-semibold transition-all duration-200
                                ${!isCurrentMonth ? "text-gray-300 border-gray-200 bg-gray-50" : ""}
                                ${isCurrentDay && !isSelected && isSelectable ? "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-400 text-blue-700 ring-2 ring-blue-200" : ""}
                                ${isSelected ? "bg-gradient-to-br from-teal-500 to-cyan-500 text-white border-teal-600 shadow-lg scale-105 ring-2 ring-teal-200" : ""}
                                ${isAvailable && isSelectable && !isSelected ? "border-gray-300 bg-white hover:bg-gradient-to-br hover:from-teal-50 hover:to-cyan-50 hover:border-teal-400 hover:shadow-md hover:scale-105" : ""}
                                ${!isAvailable && isCurrentMonth ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed" : ""}
                                ${!isCurrentMonth && !isSelectable ? "opacity-40" : ""}
                            `}
                        >
                            {format(day, "d")}
                            {/* Indicadores visuales */}
                            {isAvailable && isSelectable && !isSelected && (
                                <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-green-500 group-hover:bg-teal-600 transition-colors" />
                            )}
                            {isSelected && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-white border-2 border-teal-500 flex items-center justify-center">
                                    <svg className="h-2.5 w-2.5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Leyenda mejorada */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span className="font-medium">Disponible</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"></div>
                    <span className="font-medium">Seleccionado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gray-300"></div>
                    <span className="font-medium">Sin disponibilidad</span>
                </div>
            </div>
        </div>
    );
});

