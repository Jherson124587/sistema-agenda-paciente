import { isSlotAvailable, busyRangesToSlots } from "../schedule.service";
import type { BusyRange, ScheduleConfig } from "@/core/domain/entities/Schedule";

describe("ScheduleService", () => {
    describe("isSlotAvailable", () => {
        it("should allow slot when no overbooking and slot is free", () => {
            const config: ScheduleConfig = { allowOverbooking: false };
            const busy: BusyRange[] = [];
            const slot = { startISO: "2025-03-15T10:00:00Z", endISO: "2025-03-15T10:30:00Z" };
            expect(isSlotAvailable(slot, busy, config)).toBe(true);
        });

        it("should block slot when no overbooking and slot is occupied", () => {
            const config: ScheduleConfig = { allowOverbooking: false };
            const busy: BusyRange[] = [
                { start: "2025-03-15T10:00:00Z", end: "2025-03-15T10:30:00Z" }
            ];
            const slot = { startISO: "2025-03-15T10:00:00Z", endISO: "2025-03-15T10:30:00Z" };
            expect(isSlotAvailable(slot, busy, config)).toBe(false);
        });

        it("should allow slot when overbooking enabled and under max", () => {
            const config: ScheduleConfig = { allowOverbooking: true, maxConcurrentAppointments: 2 };
            const busy: BusyRange[] = [
                { start: "2025-03-15T10:00:00Z", end: "2025-03-15T10:30:00Z" }
            ];
            const slot = { startISO: "2025-03-15T10:00:00Z", endISO: "2025-03-15T10:30:00Z" };
            expect(isSlotAvailable(slot, busy, config)).toBe(true);
        });

        it("should block slot when overbooking enabled and at max", () => {
            const config: ScheduleConfig = { allowOverbooking: true, maxConcurrentAppointments: 2 };
            const busy: BusyRange[] = [
                { start: "2025-03-15T10:00:00Z", end: "2025-03-15T10:30:00Z" },
                { start: "2025-03-15T10:00:00Z", end: "2025-03-15T10:30:00Z" }
            ];
            const slot = { startISO: "2025-03-15T10:00:00Z", endISO: "2025-03-15T10:30:00Z" };
            expect(isSlotAvailable(slot, busy, config)).toBe(false);
        });
    });
});


