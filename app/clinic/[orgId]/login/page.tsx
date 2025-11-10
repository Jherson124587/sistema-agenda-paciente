"use client";
import { useState, Suspense, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/auth/firebase";
import { Input } from "@/presentation/components/ui/Input";
import { Button } from "@/presentation/components/ui/Button";
import { Toast } from "@/presentation/components/ui/Toast";
import { Loading } from "@/presentation/components/ui/Loading";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { doctocFetch } from "@/infrastructure/api/api-client";
import { Header } from "@/presentation/components/layout/Header";
import { Footer } from "@/presentation/components/layout/Footer";
import { getPatientID, findPatientByEmail } from "@/application/services/patient-auth.service";

function LoginForm() {
    const params = useParams<{ orgId: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();
    const orgID = params.orgId;
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
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
        let isMounted = true;
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                if (orgID && user.email) {
                    let patientID = getPatientID(orgID, user.email);
                    if (!patientID) {
                        patientID = await findPatientByEmail(orgID, user.email);
                    }
                    if (isMounted) {
                        console.log("[PatientAuth] login session", {
                            orgID,
                            email: user.email,
                            patientID: patientID ?? null,
                        });
                    }
                }
                // Usuario ya está autenticado, redirigir
                if (redirectPath && redirectPath.includes("/clinic/")) {
                    router.push(redirectPath);
                } else {
                    router.push(`/clinic/${orgID}/search`);
                }
            } else if (isMounted) {
                setCheckingAuth(false);
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
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
                    console.error("Error loading clinic name:", e);
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
            case "auth/user-not-found":
                return "No existe una cuenta con este email. Por favor, regístrate primero.";
            case "auth/wrong-password":
                return "La contraseña es incorrecta. Por favor, intenta de nuevo.";
            case "auth/invalid-email":
                return "El email no es válido. Por favor, ingresa un email correcto.";
            case "auth/invalid-credential":
                return "Las credenciales son incorrectas. Por favor, verifica tu email y contraseña.";
            case "auth/user-disabled":
                return "Esta cuenta ha sido deshabilitada. Por favor, contacta al soporte.";
            case "auth/too-many-requests":
                return "Demasiados intentos fallidos. Por favor, espera unos minutos e intenta de nuevo.";
            case "auth/network-request-failed":
                return "Error de conexión. Por favor, verifica tu conexión a internet.";
            case "auth/operation-not-allowed":
                return "Esta operación no está permitida. Por favor, contacta al soporte.";
            default:
                if (errorMessage.includes("user-not-found") || errorMessage.includes("user not found")) {
                    return "No existe una cuenta con este email. Por favor, regístrate primero.";
                }
                if (errorMessage.includes("wrong-password") || errorMessage.includes("wrong password") || errorMessage.includes("invalid-credential")) {
                    return "La contraseña es incorrecta. Por favor, intenta de nuevo.";
                }
                if (errorMessage.includes("invalid-email") || errorMessage.includes("invalid email")) {
                    return "El email no es válido. Por favor, ingresa un email correcto.";
                }
                return errorMessage || "Error al iniciar sesión. Por favor, intenta de nuevo.";
        }
    }

    async function onLogin(e: React.FormEvent) {
        e.preventDefault();
        if (!email || !password) {
            setToast({ message: "Por favor completa todos los campos", type: "error" });
            return;
        }

        setLoading(true);
        setToast(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setToast({ message: "¡Inicio de sesión exitoso! Redirigiendo...", type: "success" });
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
            }, 1000);
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
                            <div className="text-6xl mb-4">❤️</div>
                        </div>
                        <h1 className="text-4xl font-bold mb-4 text-center">Bienvenido a {clinicName}</h1>
                        <p className="text-xl mb-8 text-center text-teal-50">
                            Tu plataforma de confianza para gestionar tu salud y bienestar.
                        </p>
                        <div className="flex gap-4 mb-4">
                            {['A', 'B', 'C', 'D'].map((letter, idx) => (
                                <div key={idx} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold">
                                    {letter}
                                </div>
                            ))}
                        </div>
                        <p className="text-lg text-teal-50">+800 pacientes activos</p>
                    </div>
                </div>

                {/* Right Section - Login Form */}
                <div className="flex-1 flex items-center justify-center bg-gray-50 p-6">
                    <div className="w-full max-w-md">
                        <div className="bg-white rounded-2xl shadow-xl p-8">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Iniciar Sesión</h2>
                            <p className="text-gray-600 mb-6">
                                Accede a tu cuenta para gestionar tus citas médicas
                            </p>

                            <form onSubmit={onLogin} className="space-y-4">
                                <Input 
                                    type="email" 
                                    label="Email *" 
                                    placeholder="tu@email.com" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    required
                                    className="w-full"
                                />
                                <Input 
                                    type="password" 
                                    label="Contraseña *" 
                                    placeholder="********" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required
                                    className="w-full"
                                />
                                
                                <Button 
                                    disabled={loading || loadingClinic} 
                                    className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 text-lg font-semibold rounded-lg"
                                >
                                    {loading ? "Ingresando..." : "Iniciar Sesión"}
                                </Button>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-gray-600">
                                    ¿No tienes una cuenta?{" "}
                                    <Link href={`/clinic/${orgID}/register?redirect=${encodeURIComponent(redirectPath)}`} className="text-teal-600 hover:text-teal-700 font-semibold">
                                        Regístrate aquí
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

export default function ClinicLoginPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
            <LoginForm />
        </Suspense>
    );
}

