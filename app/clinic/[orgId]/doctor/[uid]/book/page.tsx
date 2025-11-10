"use client";
import { useMemo, useState, useEffect, useRef, Suspense, memo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ScheduleGrid } from "@/presentation/components/ScheduleGrid";
import { DoctorCalendar } from "@/presentation/components/DoctorCalendar";
import { Input } from "@/presentation/components/ui/Input";
import { Textarea } from "@/presentation/components/ui/Textarea";
import { Button } from "@/presentation/components/ui/Button";
import { Modal } from "@/presentation/components/ui/Modal";
import { Loading } from "@/presentation/components/ui/Loading";
import { Toast } from "@/presentation/components/ui/Toast";
import { AuthRequired } from "@/presentation/components/AuthRequired";
import { doctocFetch } from "@/infrastructure/api/api-client";
import { apiGetUserInfo, apiCreatePatient } from "@/infrastructure/api/doctoc-api";
import { DEFAULT_TIME_ZONE } from "@/config/constants";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/auth/firebase";
import { getPatientID, findPatientByEmail, savePatientID } from "@/application/services/patient-auth.service";
import { addDays } from "date-fns";

function BookForm() {
    const params = useParams<{ orgId: string; uid: string }>();
    const searchParams = useSearchParams();
    const orgID = params.orgId; const userId = params.uid;
    
    // Obtener parámetros de la URL para reagendamiento
    const quoteId = searchParams.get("quoteId");
    const dateParam = searchParams.get("date");
    const motiveParam = searchParams.get("motive");
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    
    const [date, setDate] = useState(() => dateParam ? new Date(dateParam) : new Date());
    const [motive, setMotive] = useState(motiveParam || "");
    const [symptoms, setSymptoms] = useState("");
    const [isRescheduling, setIsRescheduling] = useState(!!quoteId);
    const [loading, setLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ startISO: string; endISO: string } | null>(
        startParam && endParam ? { startISO: startParam, endISO: endParam } : null
    );
    const [calendarInfo, setCalendarInfo] = useState<any>({});
    const [doctorInfo, setDoctorInfo] = useState<any>(null);
    // No inicializar patientID desde localStorage aquí porque necesitamos el email del usuario
    // Se inicializará después de verificar autenticación
    const [patientID, setPatientID] = useState<string | null>(null);
    // No necesitamos mostrar loading, la carga es silenciosa
    const [loadingPatient, setLoadingPatient] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
    const [quotes, setQuotes] = useState<any[]>([]);
    const router = useRouter();
    const previousUserEmailRef = useRef<string | null>(null);

    // Verificar autenticación y detectar cambios de usuario
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            const currentEmail = u?.email || null;
            const previousEmail = previousUserEmailRef.current;
            
            // Si cambió el usuario, limpiar completamente el estado
            if (previousEmail && previousEmail !== currentEmail) {
                setPatientID(null);
                setLoadingPatient(false);
            }
            
            previousUserEmailRef.current = currentEmail;
            setUser(u);
            setCheckingAuth(false);
            
            if (!u) {
                // Usuario no autenticado, limpiar estado y redirigir
                setPatientID(null);
                router.push(`/clinic/${orgID}/doctor/${userId}`);
                return;
            }
        });

        return () => unsubscribe();
    }, [orgID, userId, router]);

    // Cargar patientID cuando el usuario cambia (separado del useEffect anterior)
    useEffect(() => {
        if (!user || !user.email || !orgID) {
            setLoadingPatient(false);
            return;
        }

        // Inicializar loadingPatient como false desde el inicio (carga silenciosa)
        setLoadingPatient(false);

        const loadPatientID = async () => {
            try {
                // 1. Verificar localStorage primero (con email del usuario)
                let pid = getPatientID(orgID, user.email);
                
                if (pid) {
                    // Si ya tenemos el patientID, usarlo inmediatamente
                    setPatientID(pid);
                    return;
                }
                
                // 2. Si no está en localStorage, buscar por email usando getAll
                if (!pid) {
                    pid = await findPatientByEmail(orgID, user.email);
                }
                
                // 3. Si no existe, crear paciente automáticamente
                if (!pid) {
                    const displayName = user.displayName || "";
                    const [names = "", surnames = ""] = displayName.split(" ");
                    
                    const result = await apiCreatePatient({
                        orgID,
                        names: names || "Usuario",
                        surnames: surnames || "Nuevo",
                        mail: user.email,
                    });
                    pid = result.patient_id;
                }
                
                // Guardar en localStorage y actualizar estado (con email del usuario)
                if (pid) {
                    savePatientID(orgID, pid, user.email);
                    setPatientID(pid);
                }
            } catch (e: any) {
                setToast({ message: "Error al cargar tu perfil. Por favor recarga la página.", type: "error" });
            }
        };

        loadPatientID();
    }, [user?.email, orgID]); // Solo ejecutar cuando cambia el email del usuario o orgID

    useEffect(() => {
        (async () => {
            try {
                const info = await apiGetUserInfo(orgID, userId, ["basic", "calendarInfo"]);
                const basic = (info as any).basic || {};
                setDoctorInfo(basic);
                setCalendarInfo((info as any).calendarInfo || {});
            } catch (e) {
                // Error loading doctor info
            }
        })();
    }, [orgID, userId]);

    const dayKey = useMemo(() => {
        const d = date; const dd = String(d.getDate()).padStart(2, "0"); const mm = String(d.getMonth()+1).padStart(2,"0"); const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    }, [date]);

    async function onSelectSlot(slot: { startISO: string; endISO: string }) {
        // Seleccionar el slot siempre (el modal se abrirá automáticamente cuando el patientID esté disponible)
        setSelectedSlot(slot);
        
        // Si no tiene patientID, intentar cargarlo en segundo plano
        if (!patientID && user && user.email) {
            try {
                let pid = getPatientID(orgID, user.email);
                
                // Si no está en localStorage, buscar por email usando getAll
                if (!pid) {
                    pid = await findPatientByEmail(orgID, user.email);
                }
                
                if (!pid) {
                    const displayName = user.displayName || "";
                    const [names = "", surnames = ""] = displayName.split(" ");
                    const result = await apiCreatePatient({
                        orgID,
                        names: names || "Usuario",
                        surnames: surnames || "Nuevo",
                        mail: user.email,
                    });
                    pid = result.patient_id;
                }
                
                if (pid) {
                    savePatientID(orgID, pid, user.email);
                    setPatientID(pid);
                }
            } catch (e: any) {
                setToast({ message: "Error al cargar tu perfil. Por favor intenta de nuevo.", type: "error" });
            }
            // No retornar aquí, dejar que el useEffect maneje la apertura del modal
        }
        
        // Si ya tiene patientID y motivo, abrir el modal inmediatamente
        if (patientID && motive.trim()) {
            setShowConfirmModal(true);
        }
        
        // Si no tiene motivo, mostrar mensaje
        if (!motive.trim()) {
            setToast({ message: "Por favor describe el motivo de tu consulta", type: "error" });
        }
    }

    // Si hay parámetros de hora pre-seleccionados, pre-seleccionar el slot
    useEffect(() => {
        if (startParam && endParam) {
            setSelectedSlot({ startISO: startParam, endISO: endParam });
        }
    }, [startParam, endParam]);

    // Abrir el modal automáticamente si hay slot seleccionado y está todo listo
    useEffect(() => {
        if (selectedSlot && patientID && motive.trim() && !loadingPatient) {
            setShowConfirmModal(true);
        }
    }, [selectedSlot, patientID, motive, loadingPatient]);

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
                // Reagendamiento: actualizar cita existente
                const selectedQuote = quotes?.find((q: any) => q.id === quoteId);
                body = {
                    action: "update",
                    orgID,
                    quoteID: quoteId,
                    dayKey,
                    oldDayKey: selectedQuote?.date || dayKey,
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
                // Nueva cita: crear
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
                // Guardar orgID en localStorage para el dashboard (con email del usuario)
                if (user?.email) {
                    savePatientID(orgID, patientID, user.email);
                }
                
                setShowConfirmModal(false);
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

    const timezone = calendarInfo.timezone || DEFAULT_TIME_ZONE;
    
    // Memoizar las fechas para evitar recálculos innecesarios
    const minDate = useMemo(() => new Date(), []);
    const maxDate = useMemo(() => addDays(new Date(), 60), []);

    // Solo mostrar loading mientras se verifica autenticación
    if (checkingAuth) {
        return (
            <main className="mx-auto max-w-4xl px-4 py-8">
                <div className="flex justify-center py-20">
                    <Loading size="lg" />
                </div>
            </main>
        );
    }

    // Si no está autenticado (no debería llegar aquí por el redirect, pero por seguridad)
    if (!user) {
        const doctorName = doctorInfo?.name || "";
        return <AuthRequired orgId={orgID} doctorId={userId} doctorName={doctorName} />;
    }

    // La página se muestra aunque el patientID aún no esté cargado (se carga en segundo plano)

    return (
        <main className="mx-auto max-w-4xl px-4 py-8">
            <h1 className="mb-6 text-3xl font-bold">
                {isRescheduling ? "Reagendar cita" : "Agendar cita"}
            </h1>
            {isRescheduling && (
                <div className="mb-4 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                    ⚠ Estás reagendando una cita existente. Puedes cambiar la fecha, hora y motivo.
                </div>
            )}
            
            {/* Información del paciente - solo mostrar si hay patientID, no mostrar mensaje de carga */}

            {/* Sección 1: Motivo de la consulta */}
            <div className="mb-8 rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">1. Motivo de la consulta</h2>
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

            {/* Sección 2: Seleccionar fecha */}
            <div className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">2. Seleccionar fecha</h2>
                <p className="mb-4 text-sm text-gray-600">
                    Elige un día disponible del calendario. Los días con disponibilidad están marcados en verde.
                </p>
                <DoctorCalendar
                    orgID={orgID}
                    userId={userId}
                    selectedDate={date}
                    onDateSelect={(newDate) => setDate(newDate)}
                    minDate={minDate}
                    maxDate={maxDate}
                />
            </div>

            {/* Sección 3: Seleccionar horario */}
            <div className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">3. Seleccionar horario</h2>
                <p className="mb-4 text-sm text-gray-600">
                    Elige un horario disponible para el día seleccionado.
                </p>
                <ScheduleGrid 
                    orgID={orgID} 
                    userId={userId} 
                    dayKey={dayKey} 
                    onSelect={onSelectSlot}
                />
            </div>

            <div className="flex gap-4">
                <Button className="mt-4" variant="ghost" onClick={()=>router.back()}>Volver</Button>
            </div>

            {/* Modal de confirmación */}
            <Modal isOpen={showConfirmModal} onClose={() => { setShowConfirmModal(false); }} title="Confirmar cita">
                <div className="space-y-4">
                    <div className="rounded-lg bg-blue-50 p-4">
                        <h3 className="mb-3 font-semibold text-gray-900">Resumen de tu cita</h3>
                        <div className="space-y-2 text-sm">
                            <p><strong>Fecha:</strong> {dayKey}</p>
                            {selectedSlot && (
                                <p><strong>Hora:</strong> {new Date(selectedSlot.startISO).toLocaleTimeString("es-PE", { timeZone: timezone, hour: "2-digit", minute: "2-digit" })} - {new Date(selectedSlot.endISO).toLocaleTimeString("es-PE", { timeZone: timezone, hour: "2-digit", minute: "2-digit" })}</p>
                            )}
                            <p><strong>Motivo:</strong> {motive}</p>
                            {symptoms && (
                                <p><strong>Síntomas:</strong> {symptoms}</p>
                            )}
                            {user?.email && (
                                <p className="mt-2 text-gray-600"><strong>Paciente:</strong> {user.email}</p>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        Al confirmar, recibirás una confirmación por email y podrás ver tu cita en tu dashboard.
                    </p>
                </div>
                <div className="mt-6 flex gap-2">
                    <Button onClick={confirmBooking} disabled={loading} className="flex-1">
                        {loading ? <Loading size="sm" /> : "Confirmar cita"}
                    </Button>
                    <Button variant="ghost" onClick={() => { setShowConfirmModal(false); }}>Cancelar</Button>
                </div>
            </Modal>

            {/* Modal de éxito */}
            <Modal isOpen={showSuccessModal} onClose={() => {}} title="Cita agendada exitosamente">
                <div className="text-center">
                    <div className="mb-4 text-6xl">✅</div>
                    <p className="text-lg font-semibold text-green-600">¡Cita creada exitosamente!</p>
                    <p className="mt-2 text-sm text-gray-600">Redirigiendo a tu dashboard...</p>
                </div>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </main>
    );
}

export default function BookPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loading size="lg" /></div>}>
            <BookForm />
        </Suspense>
    );
}
