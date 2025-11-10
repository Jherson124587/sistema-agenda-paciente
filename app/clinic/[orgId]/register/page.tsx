"use client";
import { useState, useEffect, Suspense } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/auth/firebase";
import { Input } from "@/presentation/components/ui/Input";
import { Button } from "@/presentation/components/ui/Button";
import { Toast } from "@/presentation/components/ui/Toast";
import { Loading } from "@/presentation/components/ui/Loading";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { doctocFetch } from "@/infrastructure/api/api-client";
import { apiCreatePatient } from "@/infrastructure/api/doctoc-api";
import { Header } from "@/presentation/components/layout/Header";
import { Footer } from "@/presentation/components/layout/Footer";

function RegisterForm() {
    const params = useParams<{ orgId: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();
    const orgID = params.orgId;
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [names, setNames] = useState("");
    const [surnames, setSurnames] = useState("");
    const [dni, setDni] = useState("");
    const [phone, setPhone] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [gender, setGender] = useState("");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
    const [clinicName, setClinicName] = useState("Clínica");
    const [clinicImage, setClinicImage] = useState("");
    const [social, setSocial] = useState<Record<string, string>>({});
    const [loadingClinic, setLoadingClinic] = useState(true);
    
    const redirectPath = searchParams.get("redirect") || `/clinic/${orgID}`;
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Verificar si el usuario ya está autenticado
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Usuario ya está autenticado, redirigir
                // Si hay un redirect path válido, usarlo; si no, ir a búsqueda
                if (redirectPath && redirectPath.includes("/clinic/")) {
                    router.push(redirectPath);
                } else {
                    router.push(`/clinic/${orgID}/search`);
                }
            } else {
                setCheckingAuth(false);
            }
        });

        return () => unsubscribe();
    }, [router, orgID, redirectPath]);

    // Cargar información de la clínica
    useEffect(() => {
        if (orgID) {
            (async () => {
                try {
                    const data = await doctocFetch<any>({ 
                        path: "/getOrgInfoAPIV2", 
                        body: { orgID, sections: ["basic"] } 
                    });
                    const basic = (data as any).basic || data;
                    setClinicName(basic.org_name || "Clínica");
                    setClinicImage(basic.org_image || "");
                    setSocial(basic.socialMedia || {});
                } catch (e) {
                    // Error loading clinic name
                } finally {
                    setLoadingClinic(false);
                }
            })();
        }
    }, [orgID]);

    // Función para obtener mensaje de error amigable
    function getErrorMessage(error: any): string {
        const errorCode = error?.code || "";
        const errorMessage = error?.message || "";

        switch (errorCode) {
            case "auth/email-already-in-use":
                return "Este email ya está registrado. Por favor, inicia sesión o usa otro email.";
            case "auth/weak-password":
                return "La contraseña es muy débil. Debe tener al menos 6 caracteres.";
            case "auth/invalid-email":
                return "El email no es válido. Por favor, ingresa un email correcto.";
            case "auth/operation-not-allowed":
                return "Esta operación no está permitida. Por favor, contacta al soporte.";
            case "auth/network-request-failed":
                return "Error de conexión. Por favor, verifica tu conexión a internet.";
            case "auth/too-many-requests":
                return "Demasiados intentos. Por favor, espera unos minutos e intenta de nuevo.";
            default:
                if (errorMessage.includes("email-already-in-use") || errorMessage.includes("email already in use")) {
                    return "Este email ya está registrado. Por favor, inicia sesión o usa otro email.";
                }
                if (errorMessage.includes("weak-password") || errorMessage.includes("weak password")) {
                    return "La contraseña es muy débil. Debe tener al menos 6 caracteres.";
                }
                if (errorMessage.includes("invalid-email") || errorMessage.includes("invalid email")) {
                    return "El email no es válido. Por favor, ingresa un email correcto.";
                }
                return errorMessage || "Error al registrar. Por favor, intenta de nuevo.";
        }
    }

    async function onRegister(e: React.FormEvent) {
        e.preventDefault();
        if (!names || !surnames || !email || !password || !dni || !birthDate || !gender) {
            setToast({ message: "Por favor completa todos los campos obligatorios", type: "error" });
            return;
        }

        if (password !== confirmPassword) {
            setToast({ message: "Las contraseñas no coinciden", type: "error" });
            return;
        }

        if (password.length < 6) {
            setToast({ message: "La contraseña debe tener al menos 6 caracteres", type: "error" });
            return;
        }

        if (!orgID) {
            setToast({ message: "Error: No se pudo identificar la organización", type: "error" });
            return;
        }

        setLoading(true);
        setToast(null);
        try {
            // Crear usuario en Firebase
            await createUserWithEmailAndPassword(auth, email, password);
            
            // Crear paciente en la API de Doctoc
            try {
                // Preparar payload exactamente como requiere la API
                const patientPayload = {
                    orgID,
                    names: names.trim(),
                    surnames: surnames.trim(),
                    mail: email.trim(),
                    dni: dni.trim() || undefined,
                    birth_date: birthDate || undefined,
                    gender: gender.trim() || undefined,
                    phone: phone.trim() || undefined,
                };

                // Eliminar campos undefined para no enviarlos
                Object.keys(patientPayload).forEach(key => {
                    if (patientPayload[key as keyof typeof patientPayload] === undefined) {
                        delete patientPayload[key as keyof typeof patientPayload];
                    }
                });

                await apiCreatePatient(patientPayload);
            } catch (apiError: any) {
                // Error creating patient in API
                // No lanzamos el error aquí, solo lo registramos
                // El usuario ya fue creado en Firebase, así que podemos continuar
                setToast({ message: "Cuenta creada, pero hubo un problema al registrar tu perfil de paciente. Puedes actualizarlo más tarde.", type: "info" });
            }
            
            setToast({ message: "¡Cuenta creada exitosamente! Redirigiendo...", type: "success" });
            
            setTimeout(() => {
                // Si hay un redirect path, usarlo (por ejemplo, desde el agendamiento)
                if (redirectPath && redirectPath.includes("/clinic/")) {
                    router.push(redirectPath);
                } else if (redirectPath && !redirectPath.includes("/clinic/")) {
                    router.push(`/clinic/${orgID}/patient`);
                } else {
                    // Por defecto, ir a búsqueda de doctores
                    router.push(`/clinic/${orgID}/search`);
                }
            }, 1500);
        } catch (e: any) {
            const errorMessage = getErrorMessage(e);
            setToast({ message: errorMessage, type: "error" });
        } finally {
            setLoading(false);
        }
    }

    // Mostrar loading mientras se verifica la autenticación
    if (checkingAuth || loadingClinic) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loading size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <Header orgID={orgID} orgName={clinicName} orgImage={clinicImage} />
            <div className="flex min-h-[calc(100vh-80px)]">
                {/* Left Section - Promotional */}
                <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-teal-500 to-cyan-500 relative overflow-hidden">
                    <div className="absolute top-10 right-10 w-64 h-64 bg-teal-400/30 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 left-10 w-48 h-48 bg-cyan-400/30 rounded-full blur-3xl"></div>
                    
                    <div className="relative z-10 flex flex-col justify-center items-center px-12 text-white">
                        <div className="mb-8 bg-white/20 backdrop-blur-sm rounded-2xl p-8">
                            <div className="text-6xl mb-4">👤➕</div>
                        </div>
                        <h1 className="text-4xl font-bold mb-4 text-center">Únete a {clinicName}</h1>
                        <p className="text-xl mb-8 text-center text-teal-50">
                            Crea tu cuenta y accede a los mejores servicios médicos. Tu salud es nuestra prioridad.
                        </p>
                        <div className="space-y-4 text-left">
                            {[
                                "Agenda citas con los mejores especialistas",
                                "Gestiona tu historial médico en un solo lugar",
                                "Recibe recordatorios de tus consultas",
                            ].map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-teal-400 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-sm">✓</span>
                                    </div>
                                    <span className="text-teal-50">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Section - Registration Form */}
                <div className="flex-1 flex items-center justify-center bg-gray-50 p-6 overflow-y-auto">
                    <div className="w-full max-w-2xl">
                        <div className="bg-white rounded-2xl shadow-xl p-8">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Crear Cuenta</h2>
                            <p className="text-gray-600 mb-6">
                                Completa tus datos para comenzar a agendar tus citas médicas
                            </p>

                            <form onSubmit={onRegister} className="space-y-6">
                                {/* Información Personal */}
                                <div className="bg-purple-50 rounded-lg p-4 mb-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-2xl">👤</span>
                                        <h3 className="text-lg font-semibold text-purple-900">Información Personal</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input 
                                            label="Nombres *" 
                                            placeholder="Juan" 
                                            value={names} 
                                            onChange={(e) => setNames(e.target.value)} 
                                            required
                                            className="bg-white"
                                        />
                                        <Input 
                                            label="Apellidos *" 
                                            placeholder="Pérez" 
                                            value={surnames} 
                                            onChange={(e) => setSurnames(e.target.value)} 
                                            required
                                            className="bg-white"
                                        />
                                        <Input 
                                            label="DNI *" 
                                            placeholder="12345678" 
                                            value={dni} 
                                            onChange={(e) => setDni(e.target.value)} 
                                            required
                                            className="bg-white"
                                        />
                                        <div className="relative">
                                            <Input 
                                                type="date" 
                                                label="Fecha de Nacimiento *" 
                                                value={birthDate} 
                                                onChange={(e) => setBirthDate(e.target.value)} 
                                                required
                                                className="bg-white pr-10"
                                            />
                                            <span className="absolute right-3 top-9 text-gray-400">📅</span>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm text-gray-700">Género *</label>
                                            <select 
                                                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm" 
                                                value={gender} 
                                                onChange={(e) => setGender(e.target.value)}
                                                required
                                            >
                                                <option value="">Seleccionar...</option>
                                                <option value="Masculino">Masculino</option>
                                                <option value="Femenino">Femenino</option>
                                                <option value="Otro">Otro</option>
                                            </select>
                                        </div>
                                        <Input 
                                            label="Teléfono (opcional)" 
                                            placeholder="+51 999 888 777" 
                                            value={phone} 
                                            onChange={(e) => setPhone(e.target.value)} 
                                            className="bg-white"
                                        />
                                    </div>
                                </div>

                                {/* Datos de Acceso */}
                                <div className="bg-purple-50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-2xl">🔒</span>
                                        <h3 className="text-lg font-semibold text-purple-900">Datos de Acceso</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <Input 
                                            type="email" 
                                            label="Email *" 
                                            placeholder="tu@email.com" 
                                            value={email} 
                                            onChange={(e) => setEmail(e.target.value)} 
                                            required
                                            className="bg-white"
                                        />
                                        <Input 
                                            type="password" 
                                            label="Contraseña *" 
                                            placeholder="********" 
                                            value={password} 
                                            onChange={(e) => setPassword(e.target.value)} 
                                            required
                                            minLength={6}
                                            className="bg-white"
                                        />
                                        <Input 
                                            type="password" 
                                            label="Confirmar Contraseña *" 
                                            placeholder="********" 
                                            value={confirmPassword} 
                                            onChange={(e) => setConfirmPassword(e.target.value)} 
                                            required
                                            minLength={6}
                                            className="bg-white"
                                        />
                                    </div>
                                </div>

                                <Button 
                                    disabled={loading || loadingClinic} 
                                    className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 text-lg font-semibold rounded-lg"
                                >
                                    {loading ? "Creando cuenta..." : "Crear Cuenta"}
                                </Button>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-gray-600">
                                    ¿Ya tienes una cuenta?{" "}
                                    <Link href={`/clinic/${orgID}/login?redirect=${encodeURIComponent(redirectPath)}`} className="text-teal-600 hover:text-teal-700 font-semibold">
                                        Inicia sesión
                                    </Link>
                                </p>
                            </div>

                            <div className="mt-6 text-center">
                                <Link href={`/clinic/${orgID}`} className="text-sm text-gray-500 hover:text-gray-700">
                                    ← Volver al inicio
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer orgID={orgID} orgName={clinicName} orgImage={clinicImage} social={social} />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}

export default function ClinicRegisterPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
            <RegisterForm />
        </Suspense>
    );
}

