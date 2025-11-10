export type BusyRange = { start: string; end: string }; // ISO strings

export type ScheduleConfig = {
    allowOverbooking: boolean;
    maxConcurrentAppointments?: number; // default 2
};




