"use client";
import { useState, useMemo, Suspense, useEffect } from "react";
import { DoctorCalendar } from "@/presentation/components/DoctorCalendar";
import { ScheduleGrid } from "@/presentation/components/ScheduleGrid";
import { Button } from "@/presentation/components/ui/Button";
import { Modal } from "@/presentation/components/ui/Modal";
import { Textarea } from "@/presentation/components/ui/Textarea";
import { Select } from "@/presentation/components/ui/Select";
import { Loading } from "@/presentation/components/ui/Loading";
import { Toast } from "@/presentation/components/ui/Toast";
import { addDays } from "date-fns";
import { DEFAULT_TIME_ZONE } from "@/config/constants";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { doctocFetch } from "@/infrastructure/api/api-client";
import { apiGetUserInfo, apiCreatePatient, apiGetOrgInfo } from "@/infrastructure/api/doctoc-api";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/auth/firebase";
import { getPatientID, findPatientByEmail, savePatientID, getPatientOrgIDs } from "@/application/services/patient-auth.service";

type Props = {
    orgID: string;
    userId: string;
    calendarInfo: any;
    doctorName: string;
    doctorSpecialty?: string;
};

function DoctorDetailClientContent({ orgID, userId, calendarInfo, doctorName, doctorSpecialty }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const quoteId = searchParams.get("quoteId");
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedSlot, setSelectedSlot] = useState<{ startISO: string; endISO: string; startLocal: string; endLocal: string } | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [motive, setMotive] = useState("");
    const [appointmentType, setAppointmentType] = useState("");
    const [appointmentTypeId, setAppointmentTypeId] = useState("");
    const [locationId, setLocationId] = useState("");
    const [appointmentTypes, setAppointmentTypes] = useState<Array<{ id: string; name: string }>>([]);
    const [locations, setLocations] = useState<Array<{ id: string; name: string; address: string; phone: string; email: string }>>([]);
    const [loadingAppointmentData, setLoadingAppointmentData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [patientID, setPatientID] = useState<string | null>(null);
    const [loadingPatient, setLoadingPatient] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
    const [actualDoctorName, setActualDoctorName] = useState(doctorName);
    const [originalQuote, setOriginalQuote] = useState<any>(null);
    const [patientQuotes, setPatientQuotes] = useState<any[]>([]);
    const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);
    
    // Cargar información real del doctor
    useEffect(() => {
        (async () => {
            try {
                const info = await apiGetUserInfo(orgID, userId, ["basic", "professional"]);
                const basic = (info as any).basic || {};
                const professional = (info as any).professional || {};
                
                // Extraer nombre del doctor: la API devuelve profile_name y profile_lastname
                const fullName = basic.profile_name && basic.profile_lastname 
                    ? `${basic.profile_name} ${basic.profile_lastname}` 
                    : basic.profile_name || basic.name || doctorName;
                
                setActualDoctorName(fullName);
            } catch (e) {
                // Error loading doctor info
            }
        })();
    }, [orgID, userId, doctorName]);

    // Si hay quoteId, cargar la información de la cita original para reagendamiento
    useEffect(() => {
        if (quoteId && user?.email) {
            (async () => {
                try {
                    // Buscar la cita en todas las organizaciones
                    const orgIDs = getPatientOrgIDs(user.email);
                    for (const orgIDCheck of orgIDs) {
                        try {
                            let patientID = getPatientID(orgIDCheck, user.email);
                            if (!patientID && user.email) {
                                patientID = await findPatientByEmail(orgIDCheck, user.email);
                            }
                            if (patientID) {
                                const result = await doctocFetch<any>({ 
                                    path: "/getPatientQuoteAPIV2", 
                                    body: { orgID: orgIDCheck, patientID } 
                                });
                                const quote = (result.quotes || []).find((q: any) => q.id === quoteId);
                                if (quote) {
                                    setOriginalQuote(quote);
                                    // Prellenar la fecha y hora de la cita original
                                    const startDate = new Date(quote.startDate || quote.scheduledStart);
                                    setSelectedDate(startDate);
                                    break;
                                }
                            }
                        } catch (e) {
                            // Error loading quote for orgID
                        }
                    }
                } catch (e) {
                    // Error loading original quote
                }
            })();
        }
    }, [quoteId, user, orgID]);

    // Cargar usuario y patientID
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u && u.email && orgID) {
                setLoadingPatient(true);
                try {
                    let pid = getPatientID(orgID, u.email);
                    
                    // Si no está en localStorage, buscar por email usando getAll
                    if (!pid) {
                        pid = await findPatientByEmail(orgID, u.email);
                    }
                    
                    // Si no existe el paciente, crearlo automáticamente
                    if (!pid) {
                        const displayName = u.displayName || "";
                        const [names = "", surnames = ""] = displayName.split(" ");
                        
                        const result = await apiCreatePatient({
                            orgID,
                            names: names || "Usuario",
                            surnames: surnames || "Nuevo",
                            mail: u.email,
                        });
                        pid = result.patient_id;
                    }
                    
                    // Guardar en localStorage y actualizar estado
                    if (pid) {
                        savePatientID(orgID, pid, u.email);
                        setPatientID(pid);
                    }
                    
                    // Cargar citas del paciente para bloquear fechas
                    if (pid) {
                        try {
                            const orgIDs = getPatientOrgIDs(u.email);
                            const allQuotes: any[] = [];
                            for (const orgIDItem of orgIDs) {
                                try {
                                    let patientIDItem = getPatientID(orgIDItem, u.email);
                                    if (!patientIDItem && u.email) {
                                        patientIDItem = await findPatientByEmail(orgIDItem, u.email);
                                    }
                                    if (!patientIDItem) continue;
                                    const result = await doctocFetch<any>({ 
                                        path: "/getPatientQuoteAPIV2", 
                                        body: { orgID: orgIDItem, patientID: patientIDItem } 
                                    });
                                    const quotesWithOrg = (result.quotes || []).map((q: any) => ({
                                        ...q,
                                        orgID: orgIDItem,
                                    }));
                                    allQuotes.push(...quotesWithOrg);
                                } catch (e) {
                                    // Error loading quotes for orgID
                                }
                            }
                            // Filtrar citas canceladas
                            const activeQuotes = allQuotes.filter((q: any) => {
                                const status = (q.status || "").toLowerCase();
                                return status !== "cancelada" && status !== "cancelado" && status !== "cancel" && status !== "eliminada" && status !== "eliminado";
                            });
                            setPatientQuotes(activeQuotes);
                        } catch (e) {
                            // Error loading patient quotes
                        }
                    }
                } catch (e: any) {
                    // Error loading patient
                } finally {
                    setLoadingPatient(false);
                }
            } else {
                setLoadingPatient(false);
            }
        });
        
        return () => unsubscribe();
    }, [orgID]);

    // Restaurar estado de cita pendiente después de login/register
    useEffect(() => {
        if (user && patientID && !loadingPatient) {
            const pendingBookingStr = localStorage.getItem("pendingBooking");
            if (pendingBookingStr) {
                try {
                    const pendingBooking = JSON.parse(pendingBookingStr);
                    // Verificar que el booking es para este doctor y orgID
                    if (pendingBooking.orgID === orgID && pendingBooking.userId === userId) {
                        // Verificar que no sea muy antiguo (menos de 1 hora)
                        const bookingAge = Date.now() - pendingBooking.timestamp;
                        if (bookingAge < 3600000) { // 1 hora
                            // Restaurar el estado
                            setSelectedDate(new Date(pendingBooking.selectedDate));
                            setSelectedSlot(pendingBooking.selectedSlot);
                            // Limpiar el localStorage
                            localStorage.removeItem("pendingBooking");
                            // Abrir el modal de confirmación después de un breve delay
                            // Esperar a que el componente esté completamente cargado
                            setTimeout(() => {
                                setShowConfirmModal(true);
                            }, 800);
                        } else {
                            // El booking es muy antiguo, limpiarlo
                            localStorage.removeItem("pendingBooking");
                        }
                    } else {
                        // El booking es para otro doctor, limpiarlo
                        localStorage.removeItem("pendingBooking");
                    }
                } catch (e) {
                    localStorage.removeItem("pendingBooking");
                }
            }
        }
    }, [user, patientID, orgID, userId, loadingPatient]);
    
    const dayKey = useMemo(() => {
        const d = selectedDate;
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    }, [selectedDate]);

    const tz = calendarInfo.timezone || DEFAULT_TIME_ZONE;
    const minDate = new Date();
    const maxDate = addDays(new Date(), 60);

    // Formatear fecha para mostrar
    const formattedDate = useMemo(() => {
        return format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: undefined });
    }, [selectedDate]);

    const handleSlotSelect = (slot: { startISO: string; endISO: string; startLocal: string; endLocal: string }) => {
        setSelectedSlot(slot);
    };

    async function loadAppointmentData() {
        if (loadingAppointmentData) return;
        setLoadingAppointmentData(true);
        try {
            // Cargar tipos de cita y sedes en paralelo desde la API
            const [tiposData, sedesData] = await Promise.all([
                doctocFetch<any>({
                    path: "/manageUserInfoAPIV2",
                    body: { action: "get", orgID, sections: ["tipos"] }
                }).catch(() => ({ tipos: [] })),
                apiGetOrgInfo(orgID, ["sedes"]).catch(() => ({ sedes: [] })),
            ]);

            // Procesar tipos de cita: filtrar solo los visibles externamente y mapear correctamente
            const tipos = (tiposData as any).tipos || [];
            
            const availableTypes = tipos
                .filter((tipo: any) => {
                    const isVisible = tipo.externalVisibility === true;
                    return isVisible;
                })
                .map((tipo: any) => ({
                    id: tipo.id || "",
                    name: tipo.name || "",
                }));

                        // Si no hay tipos disponibles o la lista está vacía, usar tipos por defecto como fallback
            const finalTypes = availableTypes.length > 0 ? availableTypes : [
                { id: "", name: "Consulta General" },
                { id: "", name: "Consulta Especializada" },
                { id: "", name: "Control/Follow-up" },
            ];
            setAppointmentTypes(finalTypes);

            // Cargar sedes
            const orgData = sedesData;

            // Procesar sedes con información completa
            const sedes = (orgData as any).sedes || [];
            const locationsList = sedes.map((sede: any) => {
                // El locationId puede venir en formato "sede_xxx_yyy" o como un campo id
                const locationId = sede.locationId || sede.id || sede.sedeID || "";
                return {
                    id: locationId,
                    name: sede.name || sede.nombre || "Sede principal",
                    address: sede.direccion || sede.address || "",
                    phone: sede.phone || sede.telefono || sede.tel || "",
                    email: sede.email || sede.correo || "",
                };
            });
            
            // Si no hay sedes, agregar una por defecto vacía
            if (locationsList.length === 0) {
                locationsList.push({ 
                    id: "", 
                    name: "Sede principal",
                    address: "",
                    phone: "",
                    email: "",
                });
            }
            
            setLocations(locationsList);

            // Si es una cita de reagendamiento, cargar los valores originales
            if (originalQuote) {
                // Buscar el tipo original en la lista de tipos disponibles (de la API o fallback)
                const originalTypeName = originalQuote.type || "";
                const originalTypeId = originalQuote.typeId || "";
                const typeExists = finalTypes.some((t: { id: string; name: string }) => t.id === originalTypeId || t.name === originalTypeName);
                
                if (typeExists) {
                    const foundType = finalTypes.find((t: { id: string; name: string }) => t.id === originalTypeId || t.name === originalTypeName);
                    setAppointmentType(foundType?.name || originalTypeName);
                    setAppointmentTypeId(foundType?.id || originalTypeId);
                } else {
                    // Si no se encuentra, usar el primero disponible o el nombre original
                    setAppointmentType(finalTypes[0]?.name || originalTypeName);
                    setAppointmentTypeId(finalTypes[0]?.id || originalTypeId);
                }
                setLocationId(originalQuote.locationId || locationsList[0]?.id || "");
                setMotive(originalQuote.motive || "");
            } else {
                // Valores por defecto: usar el tipo marcado como default o el primero de la lista
                const defaultType = finalTypes.find((t: { id: string; name: string }) => 
                    tipos.find((tipo: any) => tipo.id === t.id && tipo.isDefault) !== undefined
                ) || finalTypes[0];
                setAppointmentType(defaultType?.name || "Consulta General");
                setAppointmentTypeId(defaultType?.id || "");
                setLocationId(locationsList[0]?.id || "");
            }
                  } catch (e) {
              // Error loading appointment data
              // Valores por defecto en caso de error - tipos estándar
              const fallbackTypes = [
                  { id: "", name: "Consulta General" },
                  { id: "", name: "Consulta Especializada" },
                  { id: "", name: "Control/Follow-up" },
              ];
              setAppointmentTypes(fallbackTypes);
              setLocations([{ 
                  id: "", 
                  name: "Sede principal",
                  address: "",
                  phone: "",
                  email: "",
              }]);
              setAppointmentType(fallbackTypes[0]?.name || "Consulta General");
              setAppointmentTypeId("");
              setLocationId("");
          } finally {
              setLoadingAppointmentData(false);
          }
      }

    const handleContinue = async () => {
        if (!selectedSlot) {
            return;
        }
        
        // Si no está autenticado, guardar el estado de la cita y redirigir a registro
        if (!user) {
            // Guardar el estado de la cita en localStorage
            const bookingState = {
                orgID,
                userId,
                selectedDate: selectedDate.toISOString(),
                selectedSlot: {
                    startISO: selectedSlot.startISO,
                    endISO: selectedSlot.endISO,
                    startLocal: selectedSlot.startLocal,
                    endLocal: selectedSlot.endLocal,
                },
                timestamp: Date.now(),
            };
            localStorage.setItem("pendingBooking", JSON.stringify(bookingState));
            
            // Redirigir a registro con el redirect
            const redirectPath = `/clinic/${orgID}/doctor/${userId}`;
            router.push(`/clinic/${orgID}/register?redirect=${encodeURIComponent(redirectPath)}`);
            return;
        }
        
        // Si no tiene patientID, intentar cargarlo o crearlo
        if (!patientID && user && user.email) {
            setLoadingPatient(true);
            setToast({ message: "Cargando tu perfil...", type: "info" });
            
            try {
                let pid = getPatientID(orgID, user.email);
                
                // Si no está en localStorage, buscar por email usando getAll
                if (!pid) {
                    pid = await findPatientByEmail(orgID, user.email);
                }
                
                // Si no existe, crearlo
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
                    setLoadingPatient(false);
                    setToast(null);
                    // Abrir el modal después de cargar
                    setShowConfirmModal(true);
                    return;
                } else {
                    setToast({ message: "Error al cargar tu perfil. Por favor recarga la página.", type: "error" });
                }
            } catch (e: any) {
                setToast({ message: "Error al cargar tu perfil. Por favor intenta de nuevo.", type: "error" });
            } finally {
                setLoadingPatient(false);
            }
            return;
        }
        
        // Si aún no tiene patientID después del intento, mostrar mensaje
        if (!patientID) {
            setToast({ message: "Por favor espera mientras se carga tu perfil...", type: "info" });
            return;
        }
        // Cargar tipos de cita y sedes antes de abrir el modal
        await loadAppointmentData();
        // Abrir modal de confirmación
        setShowConfirmModal(true);
    };

    async function confirmBooking() {
        if (!selectedSlot || !patientID) return;
        if (!motive.trim()) {
            setToast({ message: "Por favor describe el motivo de tu consulta", type: "error" });
            return;
        }
        
        setLoading(true);
        try {
            let body: any;
            
            if (quoteId && originalQuote) {
                // Reagendamiento: actualizar cita existente
                // Necesitamos el oldDayKey de la cita original
                const originalDate = new Date(originalQuote.startDate || originalQuote.scheduledStart);
                const originalDD = String(originalDate.getDate()).padStart(2, "0");
                const originalMM = String(originalDate.getMonth() + 1).padStart(2, "0");
                const originalYYYY = originalDate.getFullYear();
                const oldDayKey = `${originalDD}-${originalMM}-${originalYYYY}`;
                
                // Usar el orgID de la cita original, no el del doctor actual
                const quoteOrgID = originalQuote.orgID || orgID;
                
                body = {
                    action: "update",
                    orgID: quoteOrgID,
                    quoteID: quoteId,
                    dayKey,
                    oldDayKey: oldDayKey,
                    scheduledStart: selectedSlot.startISO,
                    scheduledEnd: selectedSlot.endISO,
                    patient: patientID,
                    userId,
                    type: appointmentType || originalQuote.type || "Consulta General",
                    typeId: appointmentTypeId || originalQuote.typeId || "",
                    locationId: locationId || originalQuote.locationId || "",
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
                    type: appointmentType || "Consulta General",
                    typeId: appointmentTypeId || "",
                    motive: motive.trim(),
                    status: "pendiente",
                    version: "v2",
                    locationId: locationId || "",
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
                if (user?.email) {
                    savePatientID(orgID, patientID, user.email);
                }
                // Forzar recarga del ScheduleGrid para actualizar los busyRanges
                setScheduleRefreshKey(prev => prev + 1);
                // Recargar las citas del paciente para actualizar la lista
                if (user?.email) {
                    try {
                        const quotesData = await doctocFetch<any>({ 
                            path: "/getPatientQuoteAPIV2", 
                            body: { orgID, patientID } 
                        });
                        setPatientQuotes(quotesData.quotes || []);
                    } catch (e) {
                        // Error al recargar citas del paciente
                    }
                }
                setShowConfirmModal(false);
                setShowSuccessModal(true);
                setTimeout(() => {
                    router.push(`/clinic/${orgID}/patient`);
                }, 2000);
            } else {
                setToast({ message: quoteId ? "Error al reagendar cita" : "Error al crear cita", type: "error" });
            }
        } catch (e: any) {
            setToast({ message: `Error: ${e.message || (quoteId ? "Error al reagendar cita" : "Error al crear cita")}`, type: "error" });
        } finally {
            setLoading(false);
        }
    }

    const timezone = calendarInfo.timezone || DEFAULT_TIME_ZONE;
    const startTime = selectedSlot ? new Date(selectedSlot.startISO).toLocaleTimeString("es-PE", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }) : "";
    const endTime = selectedSlot ? new Date(selectedSlot.endISO).toLocaleTimeString("es-PE", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }) : "";

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Contenido principal - Izquierda */}
            <div className="lg:col-span-2">
                <section className="rounded-lg bg-white p-6 shadow-md">
                    <h2 className="mb-4 text-xl font-bold text-gray-900">Disponibilidad</h2>
                    
                    {/* Calendario para seleccionar fecha */}
                    <div className="mb-6">
                        <p className="mb-4 text-sm text-gray-600">
                            Selecciona una fecha para ver los horarios disponibles. Los días marcados en verde tienen disponibilidad.
                        </p>
                        <DoctorCalendar
                            orgID={orgID}
                            userId={userId}
                            selectedDate={selectedDate}
                            onDateSelect={(date) => {
                                setSelectedDate(date);
                                setSelectedSlot(null); // Resetear horario al cambiar fecha
                            }}
                            minDate={minDate}
                            maxDate={maxDate}
                            patientQuotes={patientQuotes}
                        />
                    </div>

                    {/* Horarios disponibles para la fecha seleccionada */}
                    <div className="mt-6">
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">
                            Horarios disponibles para el {dayKey}
                        </h3>
                        <ScheduleGrid 
                            orgID={orgID} 
                            userId={userId} 
                            dayKey={dayKey} 
                            onSelect={handleSlotSelect}
                            patientQuotes={patientQuotes}
                            refreshKey={scheduleRefreshKey}
                        />
                    </div>
                </section>
            </div>

            {/* Panel de resumen - Derecha */}
            <div className="lg:col-span-1">
                <div className="sticky top-4 rounded-lg border-2 border-blue-200 bg-white p-6 shadow-lg">
                    <h2 className="mb-4 text-xl font-bold text-gray-900">Resumen de la cita</h2>
                    
                    {/* Información del doctor */}
                    <div className="mb-6 rounded-lg bg-blue-50 p-4">
                        <h3 className="mb-2 text-sm font-semibold text-gray-700">Médico que te atenderá</h3>
                        <p className="text-lg font-bold text-gray-900">{actualDoctorName}</p>
                        {doctorSpecialty && (
                            <p className="mt-1 text-sm text-blue-600">{doctorSpecialty}</p>
                        )}
                    </div>

                    {/* Fecha seleccionada */}
                    <div className="mb-4">
                        <h3 className="mb-2 text-sm font-semibold text-gray-700">Fecha</h3>
                        {selectedDate ? (
                            <div className="rounded-lg bg-gray-50 p-3">
                                <p className="font-medium text-gray-900">{formattedDate}</p>
                                <p className="text-sm text-gray-600">{dayKey}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">Selecciona una fecha</p>
                        )}
                    </div>

                    {/* Hora seleccionada */}
                    <div className="mb-6">
                        <h3 className="mb-2 text-sm font-semibold text-gray-700">Hora</h3>
                        {selectedSlot ? (
                            <div className="rounded-lg bg-gray-50 p-3">
                                <p className="font-medium text-gray-900">
                                    {selectedSlot.startLocal} - {selectedSlot.endLocal}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">Selecciona un horario</p>
                        )}
                    </div>

                    {/* Botón de continuar */}
                    <Button 
                        onClick={handleContinue}
                        disabled={!selectedDate || !selectedSlot || loadingPatient}
                        className="w-full"
                    >
                        {loadingPatient ? <Loading size="sm" /> : "Agendar cita"}
                    </Button>

                    {(!selectedDate || !selectedSlot) && (
                        <p className="mt-2 text-xs text-gray-500 text-center">
                            Completa la fecha y hora para continuar
                        </p>
                    )}

                    {quoteId && (
                        <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800">
                            ⚠ Estás reagendando una cita existente
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de confirmación */}
            <Modal 
                isOpen={showConfirmModal} 
                onClose={() => { 
                    setShowConfirmModal(false); 
                    setMotive(""); 
                    setAppointmentType("");
                    setAppointmentTypeId("");
                    setLocationId("");
                }} 
                title={quoteId ? "Reagendar cita" : "Confirmar cita"}
                footer={
                    <div className="flex gap-2">
                        <Button onClick={confirmBooking} disabled={loading || !motive.trim() || !appointmentType || loadingAppointmentData || (locations.length > 1 && !locationId)} className="flex-1">
                            {loading ? <Loading size="sm" /> : (quoteId ? "Confirmar reagendamiento" : "Confirmar cita")}
                        </Button>
                        <Button variant="ghost" onClick={() => { 
                            setShowConfirmModal(false); 
                            setMotive(""); 
                            setAppointmentType("");
                            setAppointmentTypeId("");
                            setLocationId("");
                        }}>
                            Cancelar
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Resumen */}
                    <div className="rounded-lg bg-blue-50 p-4">
                        <h3 className="mb-3 font-semibold text-gray-900">Resumen de tu cita</h3>
                        <div className="space-y-2 text-sm">
                            <p><strong>Médico:</strong> {actualDoctorName}</p>
                            {doctorSpecialty && <p><strong>Especialidad:</strong> {doctorSpecialty}</p>}
                            <p><strong>Fecha:</strong> {formattedDate} ({dayKey})</p>
                            {selectedSlot && (
                                <p><strong>Hora:</strong> {startTime} - {endTime}</p>
                            )}
                        </div>
                    </div>

                    {/* Motivo de la consulta */}
                    <div>
                        <Select
                            label="Tipo de cita *"
                            value={appointmentType}
                            onChange={(e) => {
                                const selected = appointmentTypes.find(t => t.name === e.target.value);
                                setAppointmentType(e.target.value);
                                setAppointmentTypeId(selected?.id || "");
                            }}
                            required
                            className="mb-3"
                            disabled={loadingAppointmentData}
                        >
                            {loadingAppointmentData ? (
                                <option>Cargando...</option>
                            ) : (
                                appointmentTypes.map((type) => (
                                    <option key={type.id || type.name} value={type.name}>
                                        {type.name}
                                    </option>
                                ))
                            )}
                        </Select>
                        {/* Información de sedes */}
                        {loadingAppointmentData ? (
                            <div className="mb-3 rounded-lg border p-3">
                                <p className="text-sm text-gray-600">Cargando información de sedes...</p>
                            </div>
                        ) : locations.length > 0 && (
                            <div className="mb-3">
                                {locations.length === 1 ? (
                                    // Una sola sede: mostrar información completa directamente
                                    <div className="rounded-lg border-2 border-blue-100 bg-blue-50 p-4">
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            Sede de atención
                                        </label>
                                        <div className="space-y-1 text-sm">
                                            <p className="font-medium text-gray-900">{locations[0].name}</p>
                                            {locations[0].address && (
                                                <p className="text-gray-700">
                                                    <span className="font-medium">📍 Dirección:</span> {locations[0].address}
                                                </p>
                                            )}
                                            {locations[0].phone && (
                                                <p className="text-gray-700">
                                                    <span className="font-medium">📞 Teléfono:</span> {locations[0].phone}
                                                </p>
                                            )}
                                            {locations[0].email && (
                                                <p className="text-gray-700">
                                                    <span className="font-medium">✉️ Email:</span> {locations[0].email}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    // Múltiples sedes: mostrar selector con información detallada
                                    <div className="space-y-2">
                                        <Select
                                            label="Selecciona la sede *"
                                            value={locationId}
                                            onChange={(e) => setLocationId(e.target.value)}
                                            className="mb-2"
                                            disabled={loadingAppointmentData}
                                            required
                                        >
                                            <option value="">-- Selecciona una sede --</option>
                                            {locations.map((location) => (
                                                <option key={location.id || location.name} value={location.id}>
                                                    {location.name}
                                                </option>
                                            ))}
                                        </Select>
                                        {/* Mostrar información de la sede seleccionada */}
                                        {locationId && (() => {
                                            const selectedLocation = locations.find(loc => loc.id === locationId);
                                            return selectedLocation ? (
                                                <div className="rounded-lg border-2 border-green-100 bg-green-50 p-3">
                                                    <p className="mb-2 text-sm font-semibold text-gray-900">
                                                        {selectedLocation.name}
                                                    </p>
                                                    {selectedLocation.address && (
                                                        <p className="mb-1 text-xs text-gray-700">
                                                            <span className="font-medium">📍</span> {selectedLocation.address}
                                                        </p>
                                                    )}
                                                    {selectedLocation.phone && (
                                                        <p className="mb-1 text-xs text-gray-700">
                                                            <span className="font-medium">📞</span> {selectedLocation.phone}
                                                        </p>
                                                    )}
                                                    {selectedLocation.email && (
                                                        <p className="text-xs text-gray-700">
                                                            <span className="font-medium">✉️</span> {selectedLocation.email}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : null;
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}
                        <Textarea
                            label="Motivo de la consulta *"
                            placeholder="Ej: Control menstrual, revisión general, seguimiento de tratamiento, dolor de cabeza..."
                            value={motive}
                            onChange={(e) => setMotive(e.target.value)}
                            required
                            rows={4}
                            className="mb-3"
                        />
                    </div>
                </div>
            </Modal>

            {/* Modal de éxito */}
            <Modal isOpen={showSuccessModal} onClose={() => {}} title={quoteId ? "Cita reagendada exitosamente" : "Cita agendada exitosamente"}>
                <div className="text-center">
                    <div className="mb-4 text-6xl">✅</div>
                    <p className="text-lg font-semibold text-green-600">
                        ¡{quoteId ? "Cita reagendada" : "Cita creada"} exitosamente!
                    </p>
                    <p className="mt-2 text-sm text-gray-600">Redirigiendo a tu dashboard...</p>
                </div>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}

export function DoctorDetailClient(props: Props) {
    return (
        <Suspense fallback={<div className="flex justify-center py-8"><Loading size="lg" /></div>}>
            <DoctorDetailClientContent {...props} />
        </Suspense>
    );
}
