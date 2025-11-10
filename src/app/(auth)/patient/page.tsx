"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/auth/firebase";
import { doctocFetch } from "@/infrastructure/api/api-client";
import { apiGetOrgInfo, apiGetUserInfo } from "@/infrastructure/api/doctoc-api";
import { Button } from "@/presentation/components/ui/Button";
import { Modal } from "@/presentation/components/ui/Modal";
import { Input } from "@/presentation/components/ui/Input";
import { Loading } from "@/presentation/components/ui/Loading";
import { getPatientID, findPatientByEmail, getPatientOrgIDs } from "@/application/services/patient-auth.service";

export default function PatientDashboard() {
    const [user, setUser] = useState<any>(null);
    const [orgIDs, setOrgIDs] = useState<string[]>([]);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [sedesMap, setSedesMap] = useState<Map<string, { name: string; address: string }>>(new Map());
    const [doctorsMap, setDoctorsMap] = useState<Map<string, { name: string; specialty?: string }>>(new Map());

    useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

    // Cargar orgIDs y patientID automáticamente cuando el usuario cambia
    useEffect(() => {
        if (user?.email) {
            const orgIDsList = getPatientOrgIDs(user.email);
            setOrgIDs(orgIDsList);
        }
    }, [user?.email]);

    async function loadQuotes() {
        if (!user?.email || orgIDs.length === 0) return;
        setLoading(true);
        try {
            // Cargar citas de todas las organizaciones
            const allQuotes: any[] = [];
            const sedesMapTemp = new Map<string, { name: string; address: string }>();
            const doctorsMapTemp = new Map<string, { name: string; specialty?: string }>();

            for (const orgID of orgIDs) {
                let patientID = getPatientID(orgID, user.email);
                
                // Si no está en localStorage, buscar por email usando getAll
                if (!patientID && user.email) {
                    patientID = await findPatientByEmail(orgID, user.email);
                }
                
                if (!patientID) continue;

                // Cargar citas de esta organización
                const data = await doctocFetch<any>({ 
                    path: "/getPatientQuoteAPIV2", 
                    body: { orgID, patientID } 
                });
                
                const orgQuotes = (data.quotes || []).map((q: any) => ({
                    ...q,
                    orgID, // Agregar orgID a cada cita
                }));
                allQuotes.push(...orgQuotes);

                // Cargar información de sedes y doctores en paralelo
                const [orgInfo, doctorPromises] = await Promise.all([
                    apiGetOrgInfo(orgID, ["sedes"]).catch(() => null),
                    Promise.all(
                        orgQuotes.map(async (q: any) => {
                            try {
                                const doctorInfo = await apiGetUserInfo(orgID, q.userId, ["basic", "professional"]);
                                const basic = (doctorInfo as any).basic || {};
                                const professional = (doctorInfo as any).professional || {};
                                return {
                                    userId: q.userId,
                                    name: basic.name || "Doctor",
                                    specialty: professional.specialty || "",
                                };
                            } catch {
                                return null;
                            }
                        })
                    ),
                ]);

                // Guardar sedes en el mapa
                if (orgInfo) {
                    const sedes = (orgInfo as any).sedes || [];
                    console.log(`Sedes encontradas para orgID ${orgID}:`, sedes);
                    
                    sedes.forEach((sede: any, index: number) => {
                        // El locationId puede venir en diferentes formatos
                        const locationId = sede.locationId || sede.id || sede.sedeID || "";
                        // También intentar extraer de un formato "sede_xxx_yyy"
                        const locationIdFromFormat = sede.id?.includes("sede_") ? sede.id : null;
                        const finalLocationId = locationId || locationIdFromFormat || "";
                        
                        const sedeInfo = {
                            name: sede.nombre || sede.name || sede.direccion || `Sede ${index + 1}`,
                            address: sede.direccion || sede.address || sede.ubicacion || "",
                        };
                        
                        // Guardar con múltiples claves posibles para asegurar que se encuentre
                        if (finalLocationId) {
                            // Clave con orgID + locationId
                            sedesMapTemp.set(`${orgID}_${finalLocationId}`, sedeInfo);
                            // Clave solo con locationId
                            sedesMapTemp.set(finalLocationId, sedeInfo);
                            // Clave sin guiones bajos
                            const cleanLocationId = finalLocationId.replace(/[_-]/g, "");
                            if (cleanLocationId) {
                                sedesMapTemp.set(`${orgID}_${cleanLocationId}`, sedeInfo);
                                sedesMapTemp.set(cleanLocationId, sedeInfo);
                            }
                        }
                        
                        // Si hay solo una sede y no tiene locationId, guardarla como default
                        if (sedes.length === 1 && !finalLocationId) {
                            sedesMapTemp.set(`${orgID}_default`, sedeInfo);
                            sedesMapTemp.set(`default_${orgID}`, sedeInfo);
                        }
                        
                        // Guardar también por índice si es la primera sede
                        if (index === 0) {
                            sedesMapTemp.set(`${orgID}_0`, sedeInfo);
                            sedesMapTemp.set(`${orgID}_first`, sedeInfo);
                        }
                    });
                }

                // Guardar doctores en el mapa
                doctorPromises.forEach((doc) => {
                    if (doc) {
                        doctorsMapTemp.set(doc.userId, {
                            name: doc.name,
                            specialty: doc.specialty,
                        });
                    }
                });
            }

            // Filtrar citas canceladas/eliminadas y ordenar por fecha
            const activeQuotes = allQuotes
                .filter((q) => {
                    const status = (q.status || "").toLowerCase();
                    return status !== "cancelada" && status !== "cancelado" && status !== "cancel" && 
                           status !== "eliminada" && status !== "eliminado";
                })
                .sort((a, b) => {
                    const dateA = new Date(a.startDate || a.scheduledStart || 0).getTime();
                    const dateB = new Date(b.startDate || b.scheduledStart || 0).getTime();
                    return dateA - dateB;
                });

            setQuotes(activeQuotes);
            setSedesMap(sedesMapTemp);
            setDoctorsMap(doctorsMapTemp);
            
            // Debug: log para verificar qué sedes se cargaron y qué locationIds tienen las citas
            console.log("Sedes cargadas:", Array.from(sedesMapTemp.entries()));
            console.log("Citas con locationId:", activeQuotes.map(q => ({ id: q.id, locationId: q.locationId, orgID: q.orgID })));
        } catch (e: any) {
            console.error("Error loading quotes:", e);
            alert(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }

    // Cargar citas automáticamente cuando hay orgIDs
    useEffect(() => {
        if (user?.email && orgIDs.length > 0) {
            loadQuotes();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.email, orgIDs.join(",")]);

    async function cancelQuote() {
        if (!selectedQuote || !selectedQuote.orgID) return;
        setLoading(true);
        try {
            await doctocFetch<any>({ 
                path: "/manageQuotesAPIV2", 
                body: { 
                    action: "cancel", 
                    orgID: selectedQuote.orgID, 
                    dayKey: selectedQuote.date, 
                    userId: selectedQuote.userId, 
                    quoteID: selectedQuote.id, 
                    cancelReason: cancelReason || "Cancelado por paciente" 
                } 
            });
            await loadQuotes();
            setShowCancelModal(false);
            setCancelReason("");
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }

    function openCancelModal(q: any) {
        setSelectedQuote(q);
        setShowCancelModal(true);
    }

    function openRescheduleModal(q: any) {
        // Redirigir a la página de agendamiento con el quoteId como parámetro
        window.location.href = `/clinic/${q.orgID}/doctor/${q.userId}/book?quoteId=${q.id}`;
    }

    function getLocationInfo(quote: any): { name: string; address: string } | null {
        if (!quote.orgID) return null;
        
        const locationId = quote.locationId || "";
        console.log(`Buscando sede para cita ${quote.id}: locationId="${locationId}", orgID="${quote.orgID}"`);
        
        // Intentar múltiples formatos de clave
        if (locationId) {
            // Claves a intentar con locationId
            const keysToTry = [
                `${quote.orgID}_${locationId}`,
                locationId,
                `${quote.orgID}_${locationId.replace(/[_-]/g, "")}`,
                locationId.replace(/[_-]/g, ""),
            ];
            
            for (const key of keysToTry) {
                const location = sedesMap.get(key);
                if (location) {
                    console.log(`Sede encontrada con clave: ${key}`, location);
                    return location;
                }
            }
        }
        
        // Si no hay locationId específico, intentar con la sede por defecto de la organización
        const defaultKeys = [
            `${quote.orgID}_default`,
            `default_${quote.orgID}`,
            `${quote.orgID}_0`,
            `${quote.orgID}_first`,
        ];
        
        for (const key of defaultKeys) {
            const location = sedesMap.get(key);
            if (location) {
                console.log(`Sede por defecto encontrada con clave: ${key}`, location);
                return location;
            }
        }
        
        console.log(`No se encontró sede. Sedes disponibles:`, Array.from(sedesMap.keys()));
        return null;
    }

    function getDoctorInfo(quote: any): { name: string; specialty?: string } | null {
        return doctorsMap.get(quote.userId) || null;
    }

    if (!user) return <div className="p-8">Necesitas iniciar sesión. <a href="/login" className="text-blue-600">Ir a login</a></div>;

    return (
        <main className="mx-auto max-w-md px-4 py-6 w-full">
            <h1 className="mb-4 text-xl font-semibold">Mis citas</h1>
            
            {loading && quotes.length === 0 ? (
                <div className="mt-6 text-center"><Loading /></div>
            ) : (
                <div className="space-y-3">
                    {quotes.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                            No hay citas registradas
                        </div>
                    ) : (
                        quotes.map(q => {
                            const location = getLocationInfo(q);
                            const doctor = getDoctorInfo(q);
                            const startDate = new Date(q.startDate || q.scheduledStart);
                            const endDate = new Date(q.endDate || q.scheduledEnd);
                            const dateStr = startDate.toLocaleDateString("es-PE", { 
                                weekday: "long", 
                                year: "numeric", 
                                month: "long", 
                                day: "numeric" 
                            });
                            const timeStr = `${startDate.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`;
                            
                            return (
                                <div key={q.id} className="rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md w-full">
                                    <div className="flex flex-col">
                                        {/* Header con tipo y estado */}
                                        <div className="border-b border-gray-100 bg-gray-50 px-3 py-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-semibold text-gray-900 truncate">{q.type}</h3>
                                                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                                        q.status === "pendiente" ? "bg-yellow-100 text-yellow-800" :
                                                        q.status === "confirmada" ? "bg-green-100 text-green-800" :
                                                        "bg-gray-100 text-gray-800"
                                                    }`}>
                                                        {q.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contenido principal */}
                                        <div className="p-3 space-y-2.5">
                                            {/* Información del doctor */}
                                            {doctor && (
                                                <div className="flex items-start gap-2">
                                                    <span className="text-base">👨‍⚕️</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-900">{doctor.name}</p>
                                                        {doctor.specialty && (
                                                            <p className="text-xs text-gray-600">{doctor.specialty}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Fecha y hora */}
                                            <div className="flex items-start gap-2">
                                                <span className="text-base">📅</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-500 uppercase">Fecha</p>
                                                    <p className="text-xs font-medium text-gray-900 mt-0.5">{dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-start gap-2">
                                                <span className="text-base">🕐</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-500 uppercase">Hora</p>
                                                    <p className="text-xs font-medium text-gray-900 mt-0.5">{timeStr}</p>
                                                </div>
                                            </div>

                                            {/* Información de la sede - SIEMPRE mostrar */}
                                            {(() => {
                                                const sedeToShow = location || (sedesMap.size > 0 ? Array.from(sedesMap.values())[0] : null);
                                                return sedeToShow ? (
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-base">📍</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-gray-500 uppercase">Sede</p>
                                                            <p className="text-xs font-medium text-gray-900 mt-0.5">{sedeToShow.name}</p>
                                                            {sedeToShow.address && (
                                                                <p className="text-xs text-gray-600 mt-0.5">{sedeToShow.address}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : null;
                                            })()}

                                            {/* Motivo de consulta */}
                                            {q.motive && (
                                                <div className="flex items-start gap-2">
                                                    <span className="text-base">📋</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-500 uppercase">Motivo de consulta</p>
                                                        <p className="text-xs text-gray-700 mt-0.5">{q.motive}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Botones de acción */}
                                        <div className="flex gap-2 border-t border-gray-100 bg-gray-50 px-3 py-2">
                                            <Button 
                                                variant="secondary" 
                                                onClick={() => openRescheduleModal(q)}
                                                className="flex-1 text-xs h-8 px-2"
                                            >
                                                Reagendar
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                onClick={() => openCancelModal(q)}
                                                className="flex-1 text-xs text-red-600 hover:bg-red-50 h-8 px-2"
                                            >
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            <Modal 
                isOpen={showCancelModal} 
                onClose={() => { setShowCancelModal(false); setCancelReason(""); }} 
                title="Cancelar cita"
                footer={
                    <div className="flex gap-2">
                        <Button onClick={cancelQuote} disabled={loading}>
                            {loading ? <Loading size="sm" /> : "Confirmar cancelación"}
                        </Button>
                        <Button variant="ghost" onClick={() => { setShowCancelModal(false); setCancelReason(""); }}>Cerrar</Button>
                    </div>
                }
            >
                <div className="space-y-3">
                    <p>¿Estás seguro de cancelar esta cita?</p>
                    <Input 
                        label="Motivo de cancelación (opcional)" 
                        placeholder="Ej: Cambio de planes" 
                        value={cancelReason} 
                        onChange={(e) => setCancelReason(e.target.value)} 
                    />
                </div>
            </Modal>
        </main>
    );
}



