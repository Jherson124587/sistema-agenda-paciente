"use client";
import { useRouter } from "next/navigation";
import { Button } from "./ui/Button";

type Props = {
    orgId: string;
    doctorId?: string;
    doctorName?: string;
};

export function AuthRequired({ orgId, doctorId, doctorName }: Props) {
    const router = useRouter();

    const redirectPath = doctorId 
        ? `/clinic/${orgId}/doctor/${doctorId}`
        : `/clinic/${orgId}/search`;

    return (
        <main className="mx-auto max-w-4xl px-4 py-12">
            <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-blue-50 via-white to-teal-50 p-12 text-center shadow-lg">
                {/* Icono decorativo */}
                <div className="mb-6 flex justify-center">
                    <div className="rounded-full bg-gradient-to-br from-blue-500 to-teal-500 p-6">
                        <svg 
                            className="h-16 w-16 text-white" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                            />
                        </svg>
                    </div>
                </div>

                <h1 className="mb-4 text-3xl font-bold text-gray-900">
                    Inicia sesión para agendar tu cita
                </h1>
                
                {doctorName && (
                    <p className="mb-2 text-lg text-gray-700">
                        Estás a un paso de agendar una cita con <span className="font-semibold text-teal-600">{doctorName}</span>
                    </p>
                )}
                
                <p className="mb-8 text-gray-600">
                    Necesitas una cuenta para agendar citas médicas. Es rápido y fácil, ¡toma menos de un minuto!
                </p>

                {/* Beneficios */}
                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="mb-2 text-2xl">📅</div>
                        <h3 className="mb-1 font-semibold text-gray-900">Agenda fácilmente</h3>
                        <p className="text-sm text-gray-600">Selecciona fecha y hora con solo unos clics</p>
                    </div>
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="mb-2 text-2xl">📋</div>
                        <h3 className="mb-1 font-semibold text-gray-900">Gestiona tus citas</h3>
                        <p className="text-sm text-gray-600">Reagenda o cancela cuando lo necesites</p>
                    </div>
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="mb-2 text-2xl">🔔</div>
                        <h3 className="mb-1 font-semibold text-gray-900">Recibe recordatorios</h3>
                        <p className="text-sm text-gray-600">Nunca olvides tu próxima cita médica</p>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                    <Button 
                        onClick={() => router.push(`/clinic/${orgId}/register?redirect=${encodeURIComponent(redirectPath)}`)}
                        className="px-8 py-3 text-lg"
                    >
                        Crear cuenta gratis
                    </Button>
                    <Button 
                        variant="secondary"
                        onClick={() => router.push(`/clinic/${orgId}/login?redirect=${encodeURIComponent(redirectPath)}`)}
                        className="px-8 py-3 text-lg"
                    >
                        Ya tengo cuenta
                    </Button>
                </div>

                <p className="mt-6 text-sm text-gray-500">
                    Al crear una cuenta, aceptas nuestros términos de servicio y política de privacidad
                </p>
            </div>
        </main>
    );
}
