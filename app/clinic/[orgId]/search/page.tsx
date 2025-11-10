"use client";
import { useEffect, useMemo, useState, Suspense } from "react";
import { doctocFetch } from "@/infrastructure/api/api-client";
import { useParams } from "next/navigation";
import { Input } from "@/presentation/components/ui/Input";
import { Select } from "@/presentation/components/ui/Select";
import { DoctorCard } from "@/presentation/components/DoctorCard";
import { Loading } from "@/presentation/components/ui/Loading";
import { Header } from "@/presentation/components/layout/Header";
import { Footer } from "@/presentation/components/layout/Footer";
import { Button } from "@/presentation/components/ui/Button";

function SearchContent() {
    const params = useParams<{ orgId: string }>();
    const orgID = params.orgId;
    const [specialties, setSpecialties] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [term, setTerm] = useState("");
    const [spec, setSpec] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [orgInfo, setOrgInfo] = useState<any>(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const org = await doctocFetch<any>({ path: "/getOrgInfoAPIV2", body: { orgID, sections: ["basic", "specialties", "users"] } });
                setSpecialties(org.specialties || []);
                setUsers(org.users || []);
                setOrgInfo(org.basic || org);
            } catch (e) {
                console.error("Error loading org info", e);
            } finally {
                setLoading(false);
            }
        })();
    }, [orgID]);

    const filtered = useMemo(() => {
        return users.filter((u) => {
            const okSpec = spec ? (u.specialty || "").toLowerCase().includes(spec.toLowerCase()) : true;
            const okTerm = term ? (u.name || "").toLowerCase().includes(term.toLowerCase()) : true;
            return okSpec && okTerm && !u.disabled;
        });
    }, [users, term, spec]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <Header orgID={orgID} orgName={orgInfo?.org_name} orgImage={orgInfo?.org_image} />
                <main className="mx-auto max-w-7xl px-4 py-20">
                    <div className="flex justify-center">
                        <Loading size="lg" />
                    </div>
                </main>
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
                        Buscar <span className="text-teal-600">Doctores</span>
                    </h1>
                    <p className="mx-auto max-w-2xl text-lg text-gray-600">
                        Encuentra al especialista que necesitas y agenda tu cita médica de forma rápida y sencilla
                    </p>
                </div>

                {/* Enhanced Search Filters */}
                <div className="mb-8 rounded-2xl bg-gradient-to-br from-teal-500 via-teal-400 to-cyan-500 p-8 shadow-xl">
                    <div className="relative">
                        {/* Search Icon */}
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                            {/* Search Input */}
                            <div className="md:col-span-5 relative">
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre del doctor..."
                                    value={term}
                                    onChange={(e) => setTerm(e.target.value)}
                                    className="w-full rounded-xl border-0 bg-white/95 backdrop-blur-sm px-12 py-4 text-gray-900 placeholder-gray-500 shadow-lg focus:bg-white focus:ring-2 focus:ring-white/50 focus:outline-none transition-all"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>
                            {/* Specialty Select */}
                            <div className="md:col-span-5 relative">
                                <select
                                    value={spec}
                                    onChange={(e) => setSpec(e.target.value)}
                                    className="w-full rounded-xl border-0 bg-white/95 backdrop-blur-sm px-4 py-4 text-gray-900 shadow-lg focus:bg-white focus:ring-2 focus:ring-white/50 focus:outline-none appearance-none transition-all cursor-pointer"
                                >
                                    <option value="">Todas las especialidades</option>
                                    {specialties.map((s: any, i: number) => (
                                        <option key={i} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            {/* Clear Button */}
                            <div className="md:col-span-2">
                                <button
                                    onClick={() => {
                                        setTerm("");
                                        setSpec("");
                                    }}
                                    className="w-full rounded-xl bg-white/20 backdrop-blur-sm border-2 border-white/30 px-6 py-4 text-white font-semibold shadow-lg hover:bg-white/30 hover:border-white/50 transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
                                >
                                    Limpiar
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Trust indicators */}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-white/90 text-sm">
                        <div className="flex items-center gap-2">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Doctores verificados</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Citas seguras</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Confidencialidad garantizada</span>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="mb-8">
                    {filtered.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                            <div className="mb-4 text-6xl">🔍</div>
                            <p className="text-lg font-semibold text-gray-900">No se encontraron doctores</p>
                            <p className="mt-2 text-sm text-gray-600">
                                Intenta ajustar tus filtros de búsqueda
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6 flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    Se encontraron <span className="font-semibold text-teal-600">{filtered.length}</span> doctor{filtered.length !== 1 ? "es" : ""}
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {filtered.map((u) => (
                                    <DoctorCard key={u.uid} doctor={u} href={`/clinic/${orgID}/doctor/${u.uid}`} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>
            <Footer orgID={orgID} orgName={orgName} orgImage={orgImage} social={social} />
        </div>
    );
}

export default function DoctorSearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loading size="lg" />
            </div>
        }>
            <SearchContent />
        </Suspense>
    );
}
