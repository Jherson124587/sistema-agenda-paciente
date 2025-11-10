"use client";
import { useEffect, useMemo, useState } from "react";
import { doctocFetch } from "@/infrastructure/api/api-client";
import { useParams } from "next/navigation";
import { Input } from "@/presentation/components/ui/Input";
import { Select } from "@/presentation/components/ui/Select";
import { DoctorCard } from "@/presentation/components/DoctorCard";
import { Loading } from "@/presentation/components/ui/Loading";

export default function DoctorSearchPage() {
    const params = useParams<{ orgId: string }>();
    const orgID = params.orgId;
    const [specialties, setSpecialties] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [term, setTerm] = useState("");
    const [spec, setSpec] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const org = await doctocFetch<any>({ path: "/getOrgInfoAPIV2", body: { orgID, sections: ["specialties", "users"] } });
                setSpecialties(org.specialties || []);
                setUsers(org.users || []);
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
            <main className="mx-auto max-w-6xl px-4 py-8">
                <div className="flex justify-center">
                    <Loading size="lg" />
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-6xl px-4 py-8">
            <h1 className="text-2xl font-semibold">Buscar doctores</h1>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Input placeholder="Buscar por nombre" value={term} onChange={(e) => setTerm(e.target.value)} />
                <Select value={spec} onChange={(e) => setSpec(e.target.value)}>
                    <option value="">Todas las especialidades</option>
                    {specialties.map((s: any, i: number) => (
                        <option key={i} value={s.name}>{s.name}</option>
                    ))}
                </Select>
            </div>
            <div className="mt-6">
                {filtered.length === 0 ? (
                    <div className="text-center text-gray-500">No se encontraron doctores</div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {filtered.map((u) => (
                            <DoctorCard key={u.uid} doctor={u} href={`/clinic/${orgID}/doctor/${u.uid}`} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}



