"use client";
import { useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/auth/firebase";
import { clearPatientCache } from "@/application/services/patient-auth.service";

export default function LogoutPage() {
    useEffect(() => {
        const email = auth.currentUser?.email ?? undefined;
        signOut(auth)
            .catch(() => {
                // ignore signOut errors, still continue cleanup
            })
            .finally(() => {
                if (email) {
                    clearPatientCache(email);
                }
                window.location.href = "/";
            });
    }, []);
    return <div className="p-8">Cerrando sesión...</div>;
}

