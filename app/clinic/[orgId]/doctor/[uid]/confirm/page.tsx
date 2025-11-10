"use client";
import { useMemo, useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Textarea } from "@/presentation/components/ui/Textarea";
import { Button } from "@/presentation/components/ui/Button";
import { Modal } from "@/presentation/components/ui/Modal";
import { Loading } from "@/presentation/components/ui/Loading";
import { Toast } from "@/presentation/components/ui/Toast";
import { doctocFetch } from "@/infrastructure/api/api-client";
import { apiGetUserInfo, apiCreatePatient } from "@/infrastructure/api/doctoc-api";
import { DEFAULT_TIME_ZONE } from "@/config/constants";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/auth/firebase";
import { getPatientID, findPatientByEmail, savePatientID } from "@/application/services/patient-auth.service";
import { format } from "date-fns";

function ConfirmForm() {
    const params = useParams<{ orgId: string; uid: string }>();
    const searchParams = useSearchParams();
    const orgID = params.orgId; const userId = params.uid;
    const router = useRouter();
    
    // Obtener parámetros de la URL
    const dateParam = searchParams.get("date");
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const quoteId = searchParams.get("quoteId");
    
    const [motive, setMotive] = useState("");
    const [symptoms, setSymptoms] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [calendarInfo, setCalendarInfo] = useState<any>({});
    const [doctorInfo, setDoctorInfo] = useState<any>({});
    const [patientID, setPatientID] = useState<string | null>(null);
    const [loadingPatient, setLoadingPatient] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
    const [isRescheduling, setIsRescheduling] = useState(!!quoteId);

    const selectedDate = dateParam ? new Date(dateParam) : new Date();
    const selectedSlot = startParam && endParam ? {
        startISO: startParam,
        endISO: endParam
    } : null;

    // Cargar información del doctor
    useEffect(() => {
        (async () => {
            try {
                const info = await apiGetUserInfo(orgID, userId, ["basic", "professional", "calendarInfo"]);
                const basic = (info as any).basic || {};
                const professional = (info as any).professional || {};
                const calendarInfo = (info as any).calendarInfo || {};
                setDoctorInfo({ name: basic.name || "Doctor", specialty: professional.specialty });
                setCalendarInfo(calendarInfo);
            } catch (e) {
                // Error loading doctor info
            }
        })();
    }, [orgID, userId]);

    // Cargar usuario y patientID
    useEffect(() => {
        onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u && u.email && orgID) {
                setLoadingPatient(true);
                try {
                    let pid = getPatientID(orgID, u.email);
                    
                    // Si no está en localStorage, buscar por email usando getAll
                    if (!pid) {
                        pid = await findPatientByEmail(orgID, u.email);
                    }
                    
                    if (!pid) {
                        const displayName = u.displayName || "";
                        const [names = "", surnames = ""] = displayName.split(" ");
                        try {
                            const result = await apiCreatePatient({
                                orgID,
                                names: names || "Usuario",
                                surnames: surnames || "Nuevo",
                                mail: u.email,
                            });
                            pid = result.patient_id;
                            savePatientID(orgID, pid);
                        } catch (e: any) {
                            setToast({ message: "Error al crear tu perfil de paciente", type: "error" });
                        }
                    }
                    setPatientID(pid);
                } catch (e: any) {
                    setToast({ message: "Error al cargar tu perfil", type: "error" });
                } finally {
                    setLoadingPatient(false);
                }
            } else {
                setLoadingPatient(false);
            }
        });
    }, [orgID]);

    const dayKey = useMemo(() => {
        const d = selectedDate;
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    }, [selectedDate]);

    const formattedDate = useMemo(() => {
        return format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy");
    }, [selectedDate]);

    const timezone = calendarInfo.timezone || DEFAULT_TIME_ZONE;

    async function confirmBooking() {
        if (!selectedSlot || !patientID) return;
        if (!motive.trim()) {
            setToast({ message: "Por favor describe el motivo de tu consulta", type: "error" });
            return;
        }
        
        setLoading(true);
        try {
            let body: any;
            
            if (isRescheduling && quoteId) {
                body = {
                    action: "update",
                    orgID,
                    quoteID: quoteId,
                    dayKey,
                    oldDayKey: dayKey,
                    scheduledStart: selectedSlot.startISO,
                    scheduledEnd: selectedSlot.endISO,
                    patient: patientID,
                    userId,
                    type: "Consulta",
                    motive: motive.trim(),
                    status: "pendiente",
                    version: "v2",
                };
            } else {
                body = {
                    action: "create",
                    orgID,
                    dayKey,
                    scheduledStart: selectedSlot.startISO,
                    scheduledEnd: selectedSlot.endISO,
                    patient: patientID,
                    userId,
                    type: "Consulta",
                    typeId: "",
                    motive: motive.trim(),
                    status: "pendiente",
                    version: "v2",
                    locationId: "",
                    recipeID: "",
                    category: "cita",
                    personaEjecutante: "Paciente",
                };
            }
            
            // Imprimir en consola toda la información que se envía a la API
            if (process.env.NODE_ENV !== "production") {
                // eslint-disable-next-line no-console
                console.log("=== INFORMACIÓN ENVIADA A LA API PARA AGENDAR CITA ===");
                // eslint-disable-next-line no-console
                console.log("Endpoint:", "/manageQuotesAPIV2");
                // eslint-disable-next-line no-console
                console.log("Método:", "POST");
                // eslint-disable-next-line no-console
                console.log("Body completo:", JSON.stringify(body, null, 2));
                // eslint-disable-next-line no-console
                console.log("========================================================");
            }
            
            const res = await doctocFetch<any>({ path: "/manageQuotesAPIV2", body });
            if (res.status === "success") {
                savePatientID(orgID, patientID);
                setShowSuccessModal(true);
                setTimeout(() => {
                    router.push(`/clinic/${orgID}/patient`);
                }, 2000);
            } else {
                setToast({ message: isRescheduling ? "Error al reagendar cita" : "Error al crear cita", type: "error" });
            }
        } catch (e: any) {
            setToast({ message: `Error: ${e.message || (isRescheduling ? "Error al reagendar cita" : "Error al crear cita")}`, type: "error" });
        } finally {
            setLoading(false);
        }
    }

    // Validar que hay parámetros necesarios
    if (!dateParam || !startParam || !endParam) {
        return (
            <main className="mx-auto max-w-4xl px-4 py-8">
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                    <h2 className="mb-4 text-2xl font-bold text-gray-900">Información incompleta</h2>
                    <p className="mb-6 text-gray-600">Por favor selecciona fecha y hora antes de continuar</p>
                    <Button onClick={() => router.push(`/clinic/${orgID}/doctor/${userId}`)}>
                        Volver a seleccionar
                    </Button>
                </div>
            </main>
        );
    }

    // Mostrar loading si está cargando el paciente
    if (loadingPatient) {
        return (
            <main className="mx-auto max-w-4xl px-4 py-8">
                <div className="flex justify-center py-20">
                    <Loading size="lg" />
                </div>
            </main>
        );
    }

    // Si no está autenticado, mostrar mensaje
    if (!user) {
        return (
            <main className="mx-auto max-w-4xl px-4 py-8">
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                    <h2 className="mb-4 text-2xl font-bold text-gray-900">Necesitas iniciar sesión</h2>
                    <p className="mb-6 text-gray-600">Para confirmar tu cita, primero debes crear una cuenta</p>
                           <div className="flex gap-4 justify-center">
                               <Button onClick={() => router.push(`/clinic/${orgID}/register?redirect=${encodeURIComponent(window.location.href)}`)}>
                                   Crear cuenta
                               </Button>
                               <Button variant="secondary" onClick={() => router.push(`/clinic/${orgID}/login?redirect=${encodeURIComponent(window.location.href)}`)}>
                                   Iniciar sesión
                               </Button>
                           </div>
                </div>
            </main>
        );
    }

    const startTime = selectedSlot ? new Date(selectedSlot.startISO).toLocaleTimeString("es-PE", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }) : "";
    const endTime = selectedSlot ? new Date(selectedSlot.endISO).toLocaleTimeString("es-PE", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }) : "";

    return (
        <main className="mx-auto max-w-4xl px-4 py-8">
            <h1 className="mb-6 text-3xl font-bold">
                {isRescheduling ? "Reagendar cita" : "Confirmar cita"}
            </h1>
            
            {isRescheduling && (
                <div className="mb-4 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                    ⚠ Estás reagendando una cita existente.
                </div>
            )}

            {/* Resumen de la cita */}
            <div className="mb-8 rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
                <h2 className="mb-4 text-xl font-bold text-gray-900">Resumen de tu cita</h2>
                <div className="space-y-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-700">Médico</p>
                        <p className="text-lg font-bold text-gray-900">{doctorInfo.name || "Doctor"}</p>
                        {doctorInfo.specialty && (
                            <p className="text-sm text-blue-600">{doctorInfo.specialty}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-700">Fecha</p>
                        <p className="text-gray-900">{formattedDate}</p>
                        <p className="text-sm text-gray-600">{dayKey}</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-700">Hora</p>
                        <p className="text-gray-900">{startTime} - {endTime}</p>
                    </div>
                </div>
            </div>

            {/* Motivo de la consulta */}
            <div className="mb-8 rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Motivo de la consulta</h2>
                <p className="mb-4 text-sm text-gray-600">
                    Describe brevemente el motivo de tu consulta. Esto ayudará al médico a prepararse para tu cita.
                </p>
                <Textarea
                    label="Motivo de la consulta *"
                    placeholder="Ej: Dolor de cabeza desde hace 3 días, necesito revisión general, seguimiento de tratamiento..."
                    value={motive}
                    onChange={(e) => setMotive(e.target.value)}
                    required
                    rows={4}
                    className="mb-3"
                />
                <Textarea
                    label="Síntomas adicionales (opcional)"
                    placeholder="Ej: Fiebre, náuseas, mareos..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    rows={3}
                />
            </div>

            {/* Botones de acción */}
            <div className="flex gap-4">
                <Button onClick={confirmBooking} disabled={loading || !motive.trim()} className="flex-1">
                    {loading ? <Loading size="sm" /> : (isRescheduling ? "Confirmar reagendamiento" : "Confirmar cita")}
                </Button>
                <Button variant="ghost" onClick={() => router.push(`/clinic/${orgID}/doctor/${userId}`)}>
                    Volver
                </Button>
            </div>

            {/* Modal de éxito */}
            <Modal isOpen={showSuccessModal} onClose={() => {}} title={isRescheduling ? "Cita reagendada exitosamente" : "Cita agendada exitosamente"}>
                <div className="text-center">
                    <div className="mb-4 text-6xl">✅</div>
                    <p className="text-lg font-semibold text-green-600">
                        ¡{isRescheduling ? "Cita reagendada" : "Cita creada"} exitosamente!
                    </p>
                    <p className="mt-2 text-sm text-gray-600">Redirigiendo a tu dashboard...</p>
                </div>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </main>
    );
}

export default function ConfirmPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loading size="lg" /></div>}>
            <ConfirmForm />
        </Suspense>
    );
}

