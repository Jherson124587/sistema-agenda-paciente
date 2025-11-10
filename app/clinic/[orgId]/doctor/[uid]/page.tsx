import { apiGetUserInfo, apiGetOrgInfo } from "@/infrastructure/api/doctoc-api";
import { DEFAULT_TIME_ZONE } from "@/config/constants";
import Link from "next/link";
import { Button } from "@/presentation/components/ui/Button";
import { DoctorDetailClient } from "./DoctorDetailClient";
import { DoctorAuthWrapper } from "./DoctorAuthWrapper";
import { Header } from "@/presentation/components/layout/Header";
import { Footer } from "@/presentation/components/layout/Footer";

type Props = { params: Promise<{ orgId: string; uid: string }> };

export default async function DoctorDetailPage({ params }: Props) {
    const { orgId, uid } = await params;
    const [userInfo, orgInfo] = await Promise.all([
        apiGetUserInfo(orgId, uid, ["basic", "professional", "calendarInfo"]),
        apiGetOrgInfo(orgId, ["basic"]),
    ]);

    const basic = (userInfo as any).basic || {};
    const professional = (userInfo as any).professional || {};
    const calendarInfo = (userInfo as any).calendarInfo || {};
    const orgBasic = (orgInfo as any).basic || orgInfo;
    
    // Extraer nombre del doctor: la API devuelve profile_name y profile_lastname
    const doctorName = basic.profile_name && basic.profile_lastname 
        ? `${basic.profile_name} ${basic.profile_lastname}` 
        : basic.profile_name || basic.name || "Doctor";
    const doctorSpecialty = professional.specialty;

    const orgName = orgBasic.org_name || "Clínica";
    const orgImage = orgBasic.org_image || "";
    const social = orgBasic.socialMedia || {};

    return (
        <div className="min-h-screen bg-white">
            <Header orgID={orgId} orgName={orgName} orgImage={orgImage} />
            <DoctorAuthWrapper orgId={orgId} doctorId={uid} doctorName={doctorName}>
                <main className="mx-auto max-w-7xl px-4 py-12 md:px-6">
                    {/* Header del Doctor */}
                    <div className="mb-8 rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 p-8 shadow-lg">
                        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                            {basic.photo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img 
                                    src={basic.photo} 
                                    alt={doctorName} 
                                    className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-xl"
                                />
                            ) : (
                                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 text-4xl font-bold text-white shadow-xl">
                                    {doctorName.charAt(0)?.toUpperCase() || "D"}
                                </div>
                            )}
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="mb-2 text-4xl font-bold text-gray-900">{doctorName}</h1>
                                {doctorSpecialty && (
                                    <p className="mb-4 text-xl font-semibold text-teal-600">{doctorSpecialty}</p>
                                )}
                                {professional.description && (
                                    <p className="mb-4 text-gray-600">{professional.description}</p>
                                )}
                                <div className="mt-4 flex flex-wrap justify-center gap-3 md:justify-start">
                                    <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-teal-700 shadow-sm">
                                        Zona horaria: {calendarInfo.timezone || DEFAULT_TIME_ZONE}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Disponibilidad con calendario interactivo */}
                    <DoctorDetailClient 
                        orgID={orgId} 
                        userId={uid} 
                        calendarInfo={calendarInfo}
                        doctorName={doctorName}
                        doctorSpecialty={doctorSpecialty}
                    />
                </main>
            </DoctorAuthWrapper>
            <Footer orgID={orgId} orgName={orgName} orgImage={orgImage} social={social} />
        </div>
    );
}
