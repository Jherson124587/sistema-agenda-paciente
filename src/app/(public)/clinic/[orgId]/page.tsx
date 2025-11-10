import { apiGetOrgInfo } from "@/infrastructure/api/doctoc-api";
import Link from "next/link";

type Props = { params: { orgId: string } };

export default async function ClinicLandingPage({ params }: Props) {
    const orgID = params.orgId;
    const data = await apiGetOrgInfo(orgID, ["basic", "sedes", "specialties", "users"]);
    const basic = (data as any).basic || data;
    const orgName = basic.org_name || "Clínica";
    const orgWeb = basic.org_web || "";
    const orgImage = basic.org_image || "";
    const social = basic.socialMedia || {};
    const sedes = (data as any).sedes || [];
    const specialties = (data as any).specialties || [];

    return (
        <main className="mx-auto max-w-6xl px-4 py-8">
            <section className="flex items-center gap-4">
                {orgImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={orgImage} alt={orgName} className="h-16 w-16 rounded" />
                ) : null}
                <div>
                    <h1 className="text-2xl font-semibold">{orgName}</h1>
                    {orgWeb ? (
                        <a className="text-sm text-blue-600" href={`https://${orgWeb}`} target="_blank" rel="noreferrer">
                            {orgWeb}
                        </a>
                    ) : null}
                    <div className="mt-2 flex gap-3 text-sm">
                        {Object.entries(social).map(([k, v]) => (
                            <span key={k}>{v || orgName}</span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mt-8">
                <h2 className="mb-2 text-xl font-medium">Especialidades</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {specialties.map((s: any, idx: number) => (
                        <div key={idx} className="rounded border p-3 text-sm">
                            {s.name}
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-8">
                <h2 className="mb-2 text-xl font-medium">Sedes</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {sedes.map((s: any) => (
                        <div key={s.id} className="rounded border p-3">
                            <div className="font-medium">{s.nombre}</div>
                            <div className="text-sm text-gray-600">{s.direccion}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-10 flex justify-center">
                <Link href={`/clinic/${orgID}/search`} className="rounded bg-blue-600 px-6 py-3 text-white">
                    Buscar doctores
                </Link>
            </section>
        </main>
    );
}




