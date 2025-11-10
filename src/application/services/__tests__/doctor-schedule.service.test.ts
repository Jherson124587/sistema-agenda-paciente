import { getAvailableSlotsForDay, isSlotAvailableWithOverbooking } from "../doctor-schedule.service";
import type { DoctorSchedule, BusyRange } from "../doctor-schedule.service";

describe("DoctorScheduleService", () => {
    describe("isSlotAvailableWithOverbooking", () => {
        it("should allow slot when no overbooking and slot is free", () => {
            const config = { allowOverbooking: false };
            const busy: BusyRange[] = [];
            const slot = { startISO: "2025-03-15T10:00:00Z", endISO: "2025-03-15T10:30:00Z", startLocal: "10:00", endLocal: "10:30" };
            const result = isSlotAvailableWithOverbooking(slot, busy, config);
            expect(result.available).toBe(true);
            expect(result.count).toBe(0);
            expect(result.max).toBe(1);
        });

        it("should block slot when no overbooking and slot is occupied", () => {
            const config = { allowOverbooking: false };
            const busy: BusyRange[] = [
                { start: "2025-03-15T10:00:00Z", end: "2025-03-15T10:30:00Z" }
            ];
            const slot = { startISO: "2025-03-15T10:00:00Z", endISO: "2025-03-15T10:30:00Z", startLocal: "10:00", endLocal: "10:30" };
            const result = isSlotAvailableWithOverbooking(slot, busy, config);
            expect(result.available).toBe(false);
            expect(result.count).toBe(1);
            expect(result.max).toBe(1);
        });

        it("should allow slot when overbooking enabled and 1 appointment (under max 2)", () => {
            const config = { allowOverbooking: true, maxConcurrent: 2 };
            const busy: BusyRange[] = [
                { start: "2025-03-15T10:00:00Z", end: "2025-03-15T10:30:00Z" }
            ];
            const slot = { startISO: "2025-03-15T10:00:00Z", endISO: "2025-03-15T10:30:00Z", startLocal: "10:00", endLocal: "10:30" };
            const result = isSlotAvailableWithOverbooking(slot, busy, config);
            expect(result.available).toBe(true);
            expect(result.count).toBe(1);
            expect(result.max).toBe(2);
        });

        it("should allow slot when overbooking enabled and exactly at max (2 appointments)", () => {
            const config = { allowOverbooking: true, maxConcurrent: 2 };
            const busy: BusyRange[] = [
                { start: "2025-03-15T10:00:00Z", end: "2025-03-15T10:30:00Z" },
                { start: "2025-03-15T10:00:00Z", end: "2025-03-15T10:30:00Z" }
            ];
            const slot = { startISO: "2025-03-15T10:00:00Z", endISO: "2025-03-15T10:30:00Z", startLocal: "10:00", endLocal: "10:30" };
            const result = isSlotAvailableWithOverbooking(slot, busy, config);
            expect(result.available).toBe(false); // Debe estar bloqueado cuando llega a 2
            expect(result.count).toBe(2);
            expect(result.max).toBe(2);
        });

        it("should block slot when overbooking enabled and exceeds max (3 appointments)", () => {
            const config = { allowOverbooking: true, maxConcurrent: 2 };
            const busy: BusyRange[] = [
                { start: "2025-03-15T10:00:00Z", end: "2025-03-15T10:30:00Z" },
                { start: "2025-03-15T10:00:00Z", end: "2025-03-15T10:30:00Z" },
                { start: "2025-03-15T10:00:00Z", end: "2025-03-15T10:30:00Z" }
            ];
            const slot = { startISO: "2025-03-15T10:00:00Z", endISO: "2025-03-15T10:30:00Z", startLocal: "10:00", endLocal: "10:30" };
            const result = isSlotAvailableWithOverbooking(slot, busy, config);
            expect(result.available).toBe(false);
            expect(result.count).toBe(3);
            expect(result.max).toBe(2);
        });
    });
});


