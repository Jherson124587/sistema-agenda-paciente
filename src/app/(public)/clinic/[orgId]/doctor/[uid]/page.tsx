import { apiGetUserInfo, apiGetBusyRanges } from "@/infrastructure/api/doctoc-api";
import { DEFAULT_TIME_ZONE } from "@/config/constants";
import Link from "next/link";
import { Button } from "@/presentation/components/ui/Button";

type Props = { params: { orgId: string; uid: string } };

export default async function DoctorDetailPage({ params }: Props) {
    const { orgId, uid } = params;
    const userInfo = await apiGetUserInfo(orgId, uid, ["basic", "professional", "calendarInfo"]);
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const dayKey = `${dd}-${mm}-${yyyy}`;
    const busy = await apiGetBusyRanges(orgId, dayKey, uid);
    const busy_ranges = Array.isArray(busy) ? busy : (busy as any).busy_ranges || [];

    const basic = (userInfo as any).basic || {};
    const calendarInfo = (userInfo as any).calendarInfo || {};
    const tz = calendarInfo.timezone || DEFAULT_TIME_ZONE;
    const allowOverbooking = calendarInfo.overschedule || false;
    const maxConcurrent = calendarInfo.maxConcurrentAppointments || 2;

    return (
        <main className="mx-auto max-w-4xl px-4 py-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{basic.name || "Doctor"}</h1>
                    <div className="text-sm text-gray-600">UID: {uid}</div>
                    {(userInfo as any).professional?.specialty && (
                        <div className="mt-1 text-sm text-gray-600">{(userInfo as any).professional.specialty}</div>
                    )}
                </div>
                <Link href={`/clinic/${orgId}/doctor/${uid}/book`}>
                    <Button>Agendar cita</Button>
                </Link>
            </div>
            <section className="mt-6 rounded border p-4">
                <h2 className="mb-2 text-lg font-medium">Hoy ({dayKey}) — TZ {tz}</h2>
                <div className="mb-2 text-sm text-gray-600">
                    Overbooking: {allowOverbooking ? `Sí (máx ${maxConcurrent})` : "No"}
                </div>
                <div className="space-y-2">
                    {busy_ranges.length === 0 ? (
                        <div className="text-gray-500">No tiene citas registradas.</div>
                    ) : (
                        busy_ranges.map((r: any, idx: number) => (
                            <div key={idx} className="rounded border p-2 text-sm">
                                {new Date(r.start).toLocaleTimeString()} - {new Date(r.end).toLocaleTimeString()}
                            </div>
                        ))
                    )}
                </div>
            </section>
        </main>
    );
}



