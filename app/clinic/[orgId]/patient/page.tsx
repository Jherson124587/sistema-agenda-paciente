"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/auth/firebase";
import { doctocFetch } from "@/infrastructure/api/api-client";
import { apiGetUserInfo, apiGetOrgInfo } from "@/infrastructure/api/doctoc-api";
import { Button } from "@/presentation/components/ui/Button";
import { Modal } from "@/presentation/components/ui/Modal";
import { Input } from "@/presentation/components/ui/Input";
import { Loading } from "@/presentation/components/ui/Loading";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getPatientID, findPatientByEmail, getPatientOrgIDs } from "@/application/services/patient-auth.service";
import { Header } from "@/presentation/components/layout/Header";
import { Footer } from "@/presentation/components/layout/Footer";

export default function PatientDashboard() {
    const params = useParams<{ orgId: string }>();
    const orgID = params.orgId;
    const [user, setUser] = useState<any>(null);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [orgInfo, setOrgInfo] = useState<any>(null);
    const [loadingOrg, setLoadingOrg] = useState(true);
    const [sedesMap, setSedesMap] = useState<Map<string, { name: string; address: string }>>(new Map());
    const router = useRouter();

    // Cargar información de la clínica
    useEffect(() => {
        if (orgID) {
            (async () => {
                try {
                    const data = await doctocFetch<any>({ 
                        path: "/getOrgInfoAPIV2", 
                        body: { orgID, sections: ["basic"] } 
                    });
                    setOrgInfo(data.basic || data);
                } catch (e) {
                    // Error loading org info
                } finally {
                    setLoadingOrg(false);
                }
            })();
        }
    }, [orgID]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u && u.email) {
                // Cargar citas automáticamente
                await loadAllQuotes(u);
            }
        });
        return () => unsubscribe();
    }, [orgID]);

    async function loadAllQuotes(user: any) {
        if (!user?.email) {
            return;
        }
        
        setLoading(true);
        try {
            // Obtener todas las organizaciones donde el paciente tiene perfil
            const orgIDs = getPatientOrgIDs(user.email);

            // Si no hay orgIDs, pero hay un orgID en la URL, usar ese
            if (orgIDs.length === 0 && orgID) {
                orgIDs.push(orgID);
            }
            
            const allQuotes: any[] = [];
            const sedesMapTemp = new Map<string, { name: string; address: string }>();

            // Para cada orgID, obtener las citas y sedes
            for (const orgIDItem of orgIDs) {
                try {
                    let patientID = getPatientID(orgIDItem, user.email);
                    
                    // Si no está en localStorage, buscar por email usando getAll
                    if (!patientID && user.email) {
                        patientID = await findPatientByEmail(orgIDItem, user.email);
                    }
                    
                    if (!patientID) {
                        // Si no hay patientID, continuar con la siguiente organización
                        continue;
                    }
                    
                    // Si tenemos patientID, cargar las citas
                    if (patientID) {
                        // Cargar sedes y citas en paralelo
                        const [orgInfoData, result] = await Promise.all([
                            apiGetOrgInfo(orgIDItem, ["sedes"]).catch(() => null),
                            doctocFetch<any>({ 
                                path: "/getPatientQuoteAPIV2", 
                                body: { orgID: orgIDItem, patientID } 
                            })
                        ]);
                        
                        // Guardar sedes en el mapa
                        if (orgInfoData) {
                            const sedes = (orgInfoData as any).sedes || [];
                            sedes.forEach((sede: any, index: number) => {
                                const locationId = sede.locationId || sede.id || sede.sedeID || "";
                                const sedeInfo = {
                                    name: sede.nombre || sede.name || sede.direccion || `Sede ${index + 1}`,
                                    address: sede.direccion || sede.address || sede.ubicacion || "",
                                };
                                
                                // Guardar con múltiples claves para facilitar la búsqueda
                                if (locationId) {
                                    sedesMapTemp.set(`${orgIDItem}_${locationId}`, sedeInfo);
                                    sedesMapTemp.set(locationId, sedeInfo);
                                    const cleanLocationId = locationId.replace(/[_-]/g, "");
                                    if (cleanLocationId) {
                                        sedesMapTemp.set(`${orgIDItem}_${cleanLocationId}`, sedeInfo);
                                        sedesMapTemp.set(cleanLocationId, sedeInfo);
                                    }
                                }
                                
                                // Si hay solo una sede o es la primera, guardarla como default
                                if (sedes.length === 1 || index === 0) {
                                    sedesMapTemp.set(`${orgIDItem}_default`, sedeInfo);
                                    sedesMapTemp.set(`${orgIDItem}_0`, sedeInfo);
                                }
                            });
                        }
                        
                        // Agregar orgID a cada cita para identificación y cargar información del doctor
                        const quotesWithOrg = await Promise.all((result.quotes || []).map(async (q: any) => {
                            let doctorName = "Doctor";
                            let doctorSpecialty = "";
                            try {
                                if (q.userId) {
                                    const doctorInfo = await apiGetUserInfo(orgIDItem, q.userId, ["basic", "professional"]);
                                    const basic = (doctorInfo as any).basic || {};
                                    doctorName = basic.profile_name && basic.profile_lastname 
                                        ? `${basic.profile_name} ${basic.profile_lastname}`
                                        : basic.profile_name || basic.name || "Doctor";
                                    const professional = (doctorInfo as any).professional || {};
                                    doctorSpecialty = professional.specialty || "";
                                }
                            } catch (e) {
                                // Error loading doctor info
                            }
                            return {
                                ...q,
                                orgID: orgIDItem,
                                doctorName,
                                doctorSpecialty,
                            };
                        }));
                        allQuotes.push(...quotesWithOrg);
                    }
                } catch (e: any) {
                    // Error loading quotes for orgID - continuar con las demás organizaciones
                }
            }

            // Filtrar citas canceladas o eliminadas
            const activeQuotes = allQuotes.filter((q: any) => {
                const status = (q.status || "").toLowerCase();
                // Excluir citas canceladas o eliminadas
                return status !== "cancelada" && status !== "cancelado" && status !== "cancel" && status !== "eliminada" && status !== "eliminado";
            });

            // Ordenar por fecha (más recientes primero)
            activeQuotes.sort((a, b) => {
                const dateA = new Date(a.startDate || a.scheduledStart || 0);
                const dateB = new Date(b.startDate || b.scheduledStart || 0);
                return dateB.getTime() - dateA.getTime();
            });

            setQuotes(activeQuotes);
            setSedesMap(sedesMapTemp);
        } catch (e: any) {
            // Error loading quotes
        } finally {
            setLoading(false);
        }
    }

    function getLocationInfo(quote: any): { name: string; address: string } | null {
        if (!quote.orgID) return null;
        
        const locationId = quote.locationId || "";
        
        // Intentar múltiples formatos de clave
        if (locationId) {
            const keysToTry = [
                `${quote.orgID}_${locationId}`,
                locationId,
                `${quote.orgID}_${locationId.replace(/[_-]/g, "")}`,
                locationId.replace(/[_-]/g, ""),
            ];
            
            for (const key of keysToTry) {
                const location = sedesMap.get(key);
                if (location) return location;
            }
        }
        
        // Si no hay locationId específico, intentar con la sede por defecto
        const defaultKeys = [
            `${quote.orgID}_default`,
            `${quote.orgID}_0`,
        ];
        
        for (const key of defaultKeys) {
            const location = sedesMap.get(key);
            if (location) return location;
        }
        
        // Si hay sedes pero no se encontró una específica, usar la primera disponible
        if (sedesMap.size > 0) {
            return Array.from(sedesMap.values())[0];
        }
        
        return null;
    }

    async function cancelQuote() {
        if (!selectedQuote) return;
        
        setLoading(true);
        try {
            // Calcular dayKey desde la fecha de la cita (formato DD-MM-YYYY)
            const startDate = new Date(selectedQuote.startDate || selectedQuote.scheduledStart);
            const dd = String(startDate.getDate()).padStart(2, "0");
            const mm = String(startDate.getMonth() + 1).padStart(2, "0");
            const yyyy = startDate.getFullYear();
            const dayKey = `${dd}-${mm}-${yyyy}`;
            
            const body = {
                action: "cancel",
                orgID: selectedQuote.orgID,
                quoteID: selectedQuote.id,
                dayKey: dayKey,
                patient: selectedQuote.patient,
                userId: selectedQuote.userId,
                reason: cancelReason.trim() || "Cancelación por el paciente",
                version: "v2",
            };
            
            await doctocFetch<any>({ 
                path: "/manageQuotesAPIV2", 
                body 
            });
            
            // Esperar un poco para que el backend procese el cambio
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Recargar citas
            if (user) {
                await loadAllQuotes(user);
            }
            
            setShowCancelModal(false);
            setCancelReason("");
            setSelectedQuote(null);
        } catch (e: any) {
            alert(`Error al cancelar: ${e.message || "Error desconocido"}`);
        } finally {
            setLoading(false);
        }
    }

    function openCancelModal(q: any) {
        setSelectedQuote(q);
        setShowCancelModal(true);
    }

    function openRescheduleModal(q: any) {
        // Redirigir a la página del doctor para reagendar (seleccionar nueva fecha/hora)
        router.push(`/clinic/${q.orgID}/doctor/${q.userId}?quoteId=${q.id}`);
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-white">
                <Header orgID={orgID} orgName={orgInfo?.org_name} orgImage={orgInfo?.org_image} />
                <main className="mx-auto max-w-4xl px-4 py-8">
                    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                        <h2 className="mb-4 text-2xl font-bold text-gray-900">Necesitas iniciar sesión</h2>
                        <p className="mb-6 text-gray-600">Para ver tus citas, primero debes iniciar sesión</p>
                        <Link href={`/clinic/${orgID}/login`}>
                            <Button>Iniciar sesión</Button>
                        </Link>
                    </div>
                </main>
                <Footer orgID={orgID} orgName={orgInfo?.org_name} orgImage={orgInfo?.org_image} social={orgInfo?.socialMedia || {}} />
            </div>
        );
    }

    const orgName = orgInfo?.org_name || "Clínica";
    const orgImage = orgInfo?.org_image || "";
    const social = orgInfo?.socialMedia || {};

    return (
        <div className="min-h-screen bg-white">
            <Header orgID={orgID} orgName={orgName} orgImage={orgImage} />
            <main className="mx-auto max-w-7xl px-4 py-12 md:px-6">
                {/* Hero Section */}
                <div className="mb-12 text-center">
                    <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
                        Mis <span className="text-teal-600">Citas</span>
                    </h1>
                    <p className="mx-auto max-w-2xl text-lg text-gray-600">
                        Gestiona tus citas médicas agendadas, reagenda o cancela según sea necesario
                    </p>
                </div>
            
            {loading && quotes.length === 0 ? (
                <div className="mt-6 text-center">
                    <Loading size="lg" />
                    <p className="mt-4 text-sm text-gray-600">Cargando tus citas...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {quotes.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                            <div className="mb-4 text-6xl">📅</div>
                            <p className="text-lg font-semibold text-gray-900">No tienes citas agendadas</p>
                            <p className="mt-2 text-sm text-gray-600">
                                Cuando agendes una cita, aparecerá aquí automáticamente.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {quotes.map((q, index) => {
                                const location = getLocationInfo(q);
                                return (
                                <div 
                                    key={`${q.orgID}-${q.id}`} 
                                    className="group relative rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                                    style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both` }}
                                >
                                    {/* Decorative gradient background */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-100/30 to-cyan-100/30 rounded-full blur-3xl -z-0"></div>
                                    
                                    <div className="relative z-10 flex flex-col gap-5">
                                        {/* Header con tipo y estado */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-bold text-gray-900 mb-1 group-hover:text-teal-600 transition-colors">{q.type || "Consulta"}</h3>
                                                        {q.doctorName && (
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <div className="flex items-center gap-1.5">
                                                                    <svg className="h-4 w-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                    </svg>
                                                                    <span className="text-sm font-semibold text-gray-700">{q.doctorName}</span>
                                                                </div>
                                                                {q.doctorSpecialty && (
                                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">• {q.doctorSpecialty}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap shadow-sm transition-all duration-200 ${
                                                (q.status || "").toLowerCase() === "pendiente" 
                                                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" 
                                                    : (q.status || "").toLowerCase() === "cancelada" || (q.status || "").toLowerCase() === "cancelado"
                                                    ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                                                    : "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
                                            }`}>
                                                {q.status || "N/A"}
                                            </span>
                                        </div>

                                        {/* Información de fecha y hora con diseño mejorado */}
                                        <div className="bg-gradient-to-br from-teal-50 via-white to-cyan-50 rounded-xl p-4 border border-teal-100 shadow-sm">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                                                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</p>
                                                        <p className="text-sm font-bold text-gray-900 mt-0.5">{q.date}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                                                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hora</p>
                                                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                                                            {new Date(q.startDate || q.scheduledStart).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })} - {new Date(q.endDate || q.scheduledEnd).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Información de la sede */}
                                        {location && (
                                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200 shadow-sm group-hover:border-purple-300 transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                                                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-purple-900 mb-1.5 uppercase tracking-wide">Sede / Ubicación</p>
                                                        <p className="text-sm font-semibold text-purple-800 mb-1">{location.name}</p>
                                                        {location.address && (
                                                            <p className="text-xs text-purple-700 leading-relaxed">{location.address}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Motivo/Síntomas con diseño mejorado */}
                                        {q.motive && (
                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 shadow-sm group-hover:border-blue-300 transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
                                                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-blue-900 mb-1.5 uppercase tracking-wide">Motivo de consulta</p>
                                                        <p className="text-sm text-blue-800 leading-relaxed">{q.motive}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Documentos necesarios con diseño mejorado */}
                                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 shadow-sm group-hover:border-amber-300 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-amber-900 mb-2 uppercase tracking-wide">Documentos necesarios</p>
                                                    <ul className="text-xs text-amber-800 space-y-1.5">
                                                        <li className="flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                            DNI o documento de identidad
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                            Tarjeta de seguro (si aplica)
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                            Exámenes previos relacionados
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Botones de acción mejorados */}
                                        {(q.status || "").toLowerCase() !== "cancelada" && (q.status || "").toLowerCase() !== "cancelado" && (
                                            <div className="flex gap-3 pt-3 border-t border-gray-200">
                                                <Button 
                                                    variant="secondary" 
                                                    onClick={() => openRescheduleModal(q)}
                                                    className="flex-1 text-sm font-semibold py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                                                >
                                                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    Reagendar
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    onClick={() => openCancelModal(q)}
                                                    className="flex-1 text-sm font-semibold py-2.5 rounded-lg text-red-600 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 border border-red-300 hover:border-red-600 transition-all duration-200 hover:scale-105"
                                                >
                                                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    Cancelar
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Modal de cancelación */}
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
            <Footer orgID={orgID} orgName={orgName} orgImage={orgImage} social={social} />
        </div>
    );
}

