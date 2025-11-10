"use client";
import React, { useEffect, useMemo, useState } from "react";
import { doctocFetch } from "@/infrastructure/api/api-client";
import { Button } from "./ui/Button";
import { Loading } from "./ui/Loading";
import { apiGetUserInfo } from "@/infrastructure/api/doctoc-api";
import { DEFAULT_TIME_ZONE } from "@/config/constants";
import { getAvailableSlotsForDay, isSlotAvailableWithOverbooking, mapCalendarInfoToSchedule, type DoctorSchedule } from "@/application/services/doctor-schedule.service";
import type { BusyRange } from "@/core/domain/entities/Schedule";

type Props = {
    orgID: string;
    userId: string;
    dayKey: string; // DD-MM-YYYY
    onSelect: (slot: { startISO: string; endISO: string; startLocal: string; endLocal: string }) => void;
    patientQuotes?: any[]; // Citas del paciente para bloquear horarios específicos
    refreshKey?: number | string; // Clave para forzar recarga de busyRanges
};

export function ScheduleGrid({ orgID, userId, dayKey, onSelect, patientQuotes = [], refreshKey }: Props) {
    const [busy, setBusy] = useState<BusyRange[]>([]);
    const [loading, setLoading] = useState(true);
    const [schedule, setSchedule] = useState<DoctorSchedule>({ timezone: DEFAULT_TIME_ZONE });
    const [intervalMinutes] = useState(30);
    
    // Obtener horarios bloqueados por el paciente en este día
    const patientBookedSlots = useMemo(() => {
        const blockedRanges: Array<{ start: Date; end: Date }> = [];
        patientQuotes.forEach((quote: any) => {
            if (quote.startDate || quote.scheduledStart) {
                const quoteDate = new Date(quote.startDate || quote.scheduledStart);
                const dd = String(quoteDate.getDate()).padStart(2, "0");
                const mm = String(quoteDate.getMonth() + 1).padStart(2, "0");
                const yyyy = quoteDate.getFullYear();
                const quoteDayKey = `${dd}-${mm}-${yyyy}`;
                
                // Si la cita es del mismo día, guardar el rango de tiempo
                if (quoteDayKey === dayKey) {
                    const startTime = new Date(quote.startDate || quote.scheduledStart);
                    const endTime = new Date(quote.endDate || quote.scheduledEnd);
                    blockedRanges.push({ start: startTime, end: endTime });
                }
            }
        });
        return blockedRanges;
    }, [patientQuotes, dayKey]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                // Cargar quotes (citas) y calendarInfo en paralelo
                // IMPORTANTE: Necesitamos contar las citas individuales, no rangos consolidados
                const [quotesData, userInfo] = await Promise.all([
                    doctocFetch<any>({ path: "/getDayQuotesAPIV2", body: { orgID, dayKey, userId } }),
                    apiGetUserInfo(orgID, userId, ["calendarInfo"]),
                ]);

                const calendarInfo = (userInfo as any).calendarInfo || {};

                // Convertir las citas a busyRanges para compatibilidad
                // Cada cita debe contar como un rango separado para el conteo correcto
                const quotes = quotesData.quotes || [];
                const ranges: BusyRange[] = quotes
                    .filter((q: any) => {
                        // Filtrar solo citas activas (no canceladas)
                        const status = (q.status || "").toLowerCase();
                        return status !== "cancelada" && status !== "cancelado" && status !== "cancel" && status !== "eliminada" && status !== "eliminado";
                    })
                    .map((q: any) => ({
                        start: q.startDate || q.scheduledStart,
                        end: q.endDate || q.scheduledEnd,
                    }));
                
                setBusy(ranges);

                // Extraer horarios de la estructura de calendarInfo
                const scheduleData: DoctorSchedule = mapCalendarInfoToSchedule(calendarInfo);
                setSchedule(scheduleData);
            } catch (e) {
                // Error loading schedule data
            } finally {
                setLoading(false);
            }
        })();
    }, [orgID, userId, dayKey, refreshKey]); // Agregar refreshKey a las dependencias

    // Generar slots disponibles usando el servicio
    const slotEvaluations = useMemo(() => {
        if (!schedule.timezone) return [];
        const baseSlots = getAvailableSlotsForDay(dayKey, schedule, busy, intervalMinutes);
        const allowOverbooking = schedule.overschedule || false;
        const maxConcurrent = schedule.maxConcurrentAppointments || 2;

        return baseSlots.map(slot => {
            const availability = isSlotAvailableWithOverbooking(slot, busy, {
                allowOverbooking,
                maxConcurrent,
            });

            const slotStart = new Date(slot.startISO);
            const slotEnd = new Date(slot.endISO);
            const isBlockedByPatient = patientBookedSlots.some(blocked => {
                return (
                    (slotStart >= blocked.start && slotStart < blocked.end) ||
                    (slotEnd > blocked.start && slotEnd <= blocked.end) ||
                    (slotStart <= blocked.start && slotEnd >= blocked.end)
                );
            });

            const isActive = availability.available && !isBlockedByPatient;

            return {
                slot,
                availability,
                isBlockedByPatient,
                isActive,
            };
        });
    }, [dayKey, schedule, busy, intervalMinutes, patientBookedSlots]);

    const hasActiveSlots = slotEvaluations.some(item => item.isActive);

    if (loading) {
        return (
            <div className="p-8 text-center">
                <Loading size="lg" />
                <p className="mt-4 text-sm text-gray-500">Cargando horarios disponibles...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Información mejorada */}
            <div className="rounded-xl bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 p-4 border border-teal-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold">Zona horaria:</span>
                        <span className="text-teal-700 font-medium">{schedule.timezone || DEFAULT_TIME_ZONE}</span>
                    </div>

                </div>
            </div>

            {!hasActiveSlots ? (
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 p-12 text-center">
                    <div className="mb-4 text-6xl">⏰</div>
                    <p className="text-lg font-semibold text-gray-700">No hay horarios disponibles</p>
                    <p className="mt-2 text-sm text-gray-500">
                        El doctor no tiene horarios configurados o todos los horarios están ocupados para este día
                    </p>
                </div>
            ) : (
                <div>
                    <h3 className="mb-4 text-lg font-bold text-gray-900">Horarios disponibles</h3>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                        {slotEvaluations.map(({ slot, availability, isBlockedByPatient, isActive }, idx) => {
                            return (
                                <button
                                    key={`${slot.startISO}-${idx}`}
                                    disabled={!isActive}
                                    onClick={() => {
                                        if (isActive) {
                                            onSelect({ 
                                                startISO: slot.startISO, 
                                                endISO: slot.endISO,
                                                startLocal: slot.startLocal,
                                                endLocal: slot.endLocal
                                            });
                                        }
                                    }}
                                    className={`
                                        group relative rounded-xl border-2 p-4 text-sm font-semibold transition-all duration-200
                                        ${isActive 
                                            ? "border-teal-300 bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-700 hover:border-teal-500 hover:bg-gradient-to-br hover:from-teal-100 hover:to-cyan-100 hover:shadow-lg hover:scale-105 cursor-pointer" 
                                            : isBlockedByPatient
                                            ? "border-red-300 bg-red-50 text-red-600 cursor-not-allowed opacity-70"
                                            : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                                        }
                                    `}
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="flex items-center gap-2">
                                            <svg className={`h-4 w-4 ${isActive ? "text-teal-600" : isBlockedByPatient ? "text-red-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-bold">{slot.startLocal}</span>
                                            <span className="text-gray-400">-</span>
                                            <span className="font-bold">{slot.endLocal}</span>
                                        </div>
                                        {isBlockedByPatient && (
                                            <span className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
                                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                                Ya tienes cita
                                            </span>
                                        )}
                                        {!isBlockedByPatient && !availability.available && (
                                            <span className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
                                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                                Ocupado
                                            </span>
                                        )}
                                        {isActive && (
                                            <span className="mt-1 text-xs font-medium text-green-600 flex items-center gap-1">
                                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                Disponible
                                            </span>
                                        )}
                                    </div>
                                    {isActive && (
                                        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-500 group-hover:bg-teal-600 transition-colors"></div>
                                    )}
                                    {isBlockedByPatient && (
                                        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
