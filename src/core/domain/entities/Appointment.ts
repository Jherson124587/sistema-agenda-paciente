export type Appointment = {
    id: string;
    patientId: string;
    userId: string; // doctor id
    date: string; // DD-MM-YYYY
    startDate: string; // ISO
    endDate: string; // ISO
    type: string;
    motive?: string;
    status: string;
    locationId?: string;
};




