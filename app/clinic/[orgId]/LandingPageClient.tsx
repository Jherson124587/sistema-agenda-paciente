"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/auth/firebase";
import { useRouter } from "next/navigation";
import { Loading } from "@/presentation/components/ui/Loading";

type Props = {
    orgID: string;
    children: React.ReactNode;
};

export function LandingPageClient({ orgID, children }: Props) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
            
            // Si el usuario está autenticado, redirigir a búsqueda de doctores
            if (u) {
                router.replace(`/clinic/${orgID}/search`);
            }
        });
        
        return () => unsubscribe();
    }, [orgID, router]);

    // Mostrar loading mientras se verifica la autenticación
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loading size="lg" />
            </div>
        );
    }

    // Si el usuario está autenticado, no mostrar el contenido (será redirigido)
    if (user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loading size="lg" />
                <p className="ml-4 text-gray-600">Redirigiendo...</p>
            </div>
        );
    }

    // Si no está autenticado, mostrar el landing page
    return <>{children}</>;
}


