import Link from "next/link";

export default function HomePage() {
    return (
        <main className="mx-auto max-w-4xl px-4 py-16 text-center">
            <h1 className="mb-4 text-4xl font-bold">Doctoc Clinic Portal</h1>
            <p className="mb-8 text-gray-600">Sistema de gestión de citas médicas online</p>
            <div className="space-y-4">
                <p className="text-sm text-gray-500">
                    Ingresa a una clínica usando: <code className="rounded bg-gray-100 px-2 py-1">/clinic/[orgId]</code>
                </p>
                <div className="flex justify-center gap-4">
                    <Link href="/login" className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">
                        Iniciar sesión
                    </Link>
                    <Link href="/register" className="rounded bg-gray-100 px-6 py-2 text-gray-900 hover:bg-gray-200">
                        Registrarse
                    </Link>
                </div>
            </div>
        </main>
    );
}


