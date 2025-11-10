"use client";
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/auth/firebase";
import { Input } from "@/presentation/components/ui/Input";
import { Button } from "@/presentation/components/ui/Button";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [redirect, setRedirect] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Leer el parámetro redirect de la URL
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            setRedirect(params.get("redirect"));
        }
    }, []);

    async function onLogin(e: React.FormEvent) {
        e.preventDefault(); setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Redirigir a la URL especificada o a la página principal
            router.push(redirect || "/");
        } catch (e) {
            alert("Error de autenticación");
        } finally { setLoading(false); }
    }

    return (
        <main className="mx-auto grid min-h-screen max-w-md place-items-center p-6">
            <form onSubmit={onLogin} className="w-full rounded border bg-white p-6 shadow">
                <h1 className="mb-4 text-xl font-semibold">Iniciar sesión</h1>
                <div className="space-y-3">
                    <Input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
                    <Input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
                    <Button disabled={loading}>{loading?"Ingresando...":"Ingresar"}</Button>
                </div>
            </form>
        </main>
    );
}




