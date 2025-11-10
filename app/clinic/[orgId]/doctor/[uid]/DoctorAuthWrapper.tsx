"use client";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/auth/firebase";
import { AuthRequired } from "@/presentation/components/AuthRequired";
import { Loading } from "@/presentation/components/ui/Loading";

type Props = {
    orgId: string;
    doctorId: string;
    doctorName: string;
    children: React.ReactNode;
};

export function DoctorAuthWrapper({ orgId, doctorId, doctorName, children }: Props) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <main className="mx-auto max-w-4xl px-4 py-8">
                <div className="flex justify-center py-20">
                    <Loading size="lg" />
                </div>
            </main>
        );
    }

    if (!user) {
        return <AuthRequired orgId={orgId} doctorId={doctorId} doctorName={doctorName} />;
    }

    return <>{children}</>;
}
