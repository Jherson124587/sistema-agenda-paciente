import { apiGetOrgInfo } from "@/infrastructure/api/doctoc-api";
import Link from "next/link";
import { Header } from "@/presentation/components/layout/Header";
import { Footer } from "@/presentation/components/layout/Footer";
import { Button } from "@/presentation/components/ui/Button";
import { AlliancesCarousel } from "@/presentation/components/AlliancesCarousel";
import { LandingPageClient } from "./LandingPageClient";
import { ScrollAnimation } from "@/presentation/components/ScrollAnimation";

type Props = { params: Promise<{ orgId: string }> };

export default async function ClinicLandingPage({ params }: Props) {
    const { orgId: orgID } = await params;
    const data = await apiGetOrgInfo(orgID, ["basic", "sedes", "specialties", "users"]);
    const basic = (data as any).basic || data;
    const orgName = basic.org_name || "HealthCare";
    const orgWeb = basic.org_web || "";
    const orgImage = basic.org_image || "";
    const social = basic.socialMedia || {};
    const sedes = (data as any).sedes || [];
    const specialties = (data as any).specialties || [];
    const users = (data as any).users || [];
    const doctors = users.filter((u: any) => !u.disabled).slice(0, 3); // Primeros 3 doctores para el team

    return (
        <LandingPageClient orgID={orgID}>
            <div className="min-h-screen bg-white">
                <Header orgID={orgID} orgName={orgName} orgImage={orgImage} />

            <main>
                {/* Hero Section */}
                <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-cyan-50 py-20 md:py-32">
                    <div className="mx-auto max-w-7xl px-4 md:px-6">
                        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
                            {/* Left Content */}
                            <div className="text-center md:text-left">
                                <h1 className="mb-6 text-5xl font-bold leading-tight text-gray-900 md:text-6xl">
                                    Atención Excepcional, <span className="text-teal-600">Siempre</span>
                                </h1>
                                <p className="mb-8 text-lg text-gray-600 md:text-xl">
                                    Encuentra al doctor perfecto para ti y agenda tu cita médica de forma rápida y sencilla. 
                                    Nuestro equipo de profesionales está listo para cuidar de tu salud.
                                </p>
                                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center md:justify-start">
                                    <Link href={`/clinic/${orgID}/search`}>
                                        <Button className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all">
                                            Agendar Cita
                                        </Button>
                                    </Link>
                                    <Link href={`/clinic/${orgID}/search`}>
                                        <Button variant="secondary" className="bg-white border-2 border-teal-500 text-teal-600 hover:bg-teal-50 px-8 py-4 text-lg font-semibold rounded-lg">
                                            Buscar Doctor
                                        </Button>
                                    </Link>
                                </div>
                                <div className="mt-8 flex items-center justify-center gap-4 md:justify-start">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div key={i} className="h-10 w-10 rounded-full bg-teal-200 border-2 border-white"></div>
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-semibold text-teal-600">500+</span> Pacientes nos eligen
                                    </p>
                                </div>
                            </div>

                            {/* Right Image */}
                            <div className="relative">
                                <div className="relative z-10">
                                    <div className="aspect-square rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 p-8">
                                        <div className="h-full w-full rounded-xl bg-teal-200 flex items-center justify-center">
                                            <span className="text-6xl">👨‍⚕️</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Floating Elements */}
                                <div className="absolute -top-4 -right-4 z-20 rounded-lg bg-white p-4 shadow-xl">
                                    <p className="text-xs font-semibold text-gray-700">Próximas Citas</p>
                                    <div className="mt-2 space-y-1 text-xs text-gray-600">
                                        <p>Dr. García - Hoy 10:00 AM</p>
                                        <p>Dr. López - Mañana 2:00 PM</p>
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-4 z-20 rounded-full bg-teal-500 p-4 text-white shadow-xl">
                                    <span className="text-2xl">💬</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Easily Book Your Doctor Section */}
                <section className="py-16 bg-white">
                    <div className="mx-auto max-w-7xl px-4 md:px-6">
                        <ScrollAnimation direction="up">
                            <h2 className="mb-12 text-center text-4xl font-bold text-gray-900">
                                <span className="text-teal-600">Agenda</span> tu Doctor Fácilmente
                            </h2>
                        </ScrollAnimation>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {[
                                { icon: "📋", title: "Prescripción", desc: "Gestiona tus recetas médicas de forma digital y sencilla." },
                                { icon: "🚑", title: "Urgencias", desc: "Atención médica de emergencia disponible las 24 horas." },
                                { icon: "🏥", title: "Centro Médico", desc: "Instalaciones modernas con equipamiento de última generación." },
                                { icon: "👨‍⚕️", title: "Especialistas", desc: "Equipo de doctores especializados en diversas áreas médicas." },
                            ].map((service, idx) => (
                                <ScrollAnimation key={idx} direction="up" delay={idx * 100}>
                                    <div className="group rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-teal-300 hover:bg-gradient-to-br hover:from-teal-50 hover:to-cyan-50">
                                        <div className="mb-4 text-5xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">{service.icon}</div>
                                        <h3 className="mb-3 text-xl font-bold text-gray-900 group-hover:text-teal-600 transition-colors">{service.title}</h3>
                                        <p className="text-sm text-gray-600">{service.desc}</p>
                                    </div>
                                </ScrollAnimation>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Facilities and Services Section */}
                {specialties.length > 0 && (
                    <section className="py-16 bg-gray-50">
                        <div className="mx-auto max-w-7xl px-4 md:px-6">
                            <h2 className="mb-12 text-center text-4xl font-bold text-gray-900">
                                Instalaciones y <span className="text-teal-600">Servicios</span>
                            </h2>
                            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                {/* Left - Tabs */}
                                <div className="space-y-2">
                                    {specialties.slice(0, 5).map((spec: any, idx: number) => (
                                        <div 
                                            key={idx}
                                            className={`rounded-lg p-4 cursor-pointer transition-all ${
                                                idx === 0 
                                                    ? "bg-teal-500 text-white shadow-lg" 
                                                    : "bg-white text-gray-700 hover:bg-teal-50 hover:shadow-md"
                                            }`}
                                        >
                                            <h3 className="font-semibold">{spec.name}</h3>
                                            {spec.description && (
                                                <p className={`mt-1 text-sm ${idx === 0 ? "text-teal-50" : "text-gray-600"}`}>
                                                    {spec.description}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Right - Content */}
                                <div className="rounded-xl bg-white p-8 shadow-lg">
                                    <div className="mb-6 aspect-video rounded-lg bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center">
                                        <span className="text-6xl">🏥</span>
                                    </div>
                                    <h3 className="mb-4 text-2xl font-bold text-gray-900">
                                        {specialties[0]?.name || "Consulta Médica"}
                                    </h3>
                                    <p className="mb-6 text-gray-600">
                                        {specialties[0]?.description || "Ofrecemos servicios médicos de calidad con atención personalizada y profesional."}
                                    </p>
                                    <Link href={`/clinic/${orgID}/search`}>
                                        <Button className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-lg font-medium">
                                            Conocer Más
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* 24/7 Online Consultations Banner */}
                <section className="relative py-16 bg-gradient-to-r from-teal-500 to-cyan-500 overflow-hidden">
                    {/* Animated background elements */}
                    <div className="absolute inset-0">
                        <div className="absolute top-10 left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl animate-pulse"></div>
                        <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl animate-pulse delay-1000"></div>
                    </div>
                    <div className="relative mx-auto max-w-7xl px-4 md:px-6">
                        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
                            <ScrollAnimation direction="right" className="text-white">
                                <h2 className="mb-4 text-4xl font-bold">Consultas Online 24/7</h2>
                                <p className="mb-6 text-lg text-teal-50">
                                    Accede a consultas médicas desde la comodidad de tu hogar. 
                                    Disponible las 24 horas del día, los 7 días de la semana.
                                </p>
                                <Link href={`/clinic/${orgID}/search`}>
                                    <button className="bg-white text-teal-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-lg border-2 border-white shadow-lg hover:shadow-xl transition-all hover:scale-105 transform">
                                        Conocer Más
                                    </button>
                                </Link>
                            </ScrollAnimation>
                            <ScrollAnimation direction="left" className="relative">
                                <div className="aspect-square rounded-2xl bg-teal-400/20 p-8 flex items-center justify-center backdrop-blur-sm">
                                    <span className="text-8xl animate-bounce">👨‍⚕️👩‍⚕️</span>
                                </div>
                            </ScrollAnimation>
                        </div>
                    </div>
                </section>

                {/* Health Insurance Section */}
                {sedes.length > 0 && (
                    <section className="py-16 bg-white">
                        <div className="mx-auto max-w-7xl px-4 md:px-6">
                            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
                                <div className="aspect-video rounded-xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center">
                                    <span className="text-8xl">🏥</span>
                                </div>
                                <div>
                                    <h2 className="mb-6 text-4xl font-bold text-gray-900">
                                        Información de <span className="text-teal-600">Seguros</span>
                                    </h2>
                                    <ul className="space-y-4">
                                        {[
                                            "Cobertura de seguros médicos principales",
                                            "Procesamiento rápido de reclamos",
                                            "Atención personalizada para cada paciente",
                                            "Planes de pago flexibles disponibles",
                                            "Asesoría en seguros y beneficios",
                                        ].map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                <span className="mt-1 text-teal-600">✓</span>
                                                <span className="text-gray-700">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Link href={`/clinic/${orgID}/search`} className="mt-6 inline-block">
                                        <Button className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-lg font-medium">
                                            Conocer Más
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Meet Our Team Section */}
                {doctors.length > 0 && (
                    <section className="py-16 bg-gray-50">
                        <div className="mx-auto max-w-7xl px-4 md:px-6">
                            <h2 className="mb-12 text-center text-4xl font-bold text-gray-900">
                                Conoce a <span className="text-teal-600">Nuestro Equipo</span>
                            </h2>
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                                {doctors.map((doctor: any) => (
                                    <div key={doctor.uid} className="group rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-1">
                                        <div className="mb-4 flex justify-center">
                                            {doctor.photo ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img 
                                                    src={doctor.photo} 
                                                    alt={doctor.name} 
                                                    className="h-24 w-24 rounded-full border-4 border-white object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-white/20 text-3xl">
                                                    👨‍⚕️
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="mb-2 text-center text-xl font-bold">{doctor.name || "Dr. Doctor"}</h3>
                                        <p className="mb-4 text-center text-sm text-teal-50">{doctor.specialty || "Especialista"}</p>
                                        <Link href={`/clinic/${orgID}/doctor/${doctor.uid}`} className="block text-center">
                                            <Button variant="secondary" className="w-full bg-white text-teal-600 hover:bg-gray-100">
                                                Ver Perfil
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Alliances Carousel */}
                <AlliancesCarousel />

                {/* CTA Section */}
                <section className="py-16 bg-gradient-to-r from-teal-600 to-cyan-600">
                    <div className="mx-auto max-w-4xl px-4 text-center md:px-6">
                        <h2 className="mb-4 text-4xl font-bold text-white">¿Listo para Comenzar?</h2>
                        <p className="mb-8 text-lg text-teal-50">
                            Únete a miles de pacientes que ya confían en nosotros para su cuidado médico
                        </p>
                        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                            <Link href={`/clinic/${orgID}/search`}>
                                <button className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all">
                                    Buscar Doctores
                                </button>
                            </Link>
                            <Link href={`/clinic/${orgID}/register`}>
                                <button className="bg-white border-2 border-teal-500 text-teal-600 hover:bg-teal-50 px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all">
                                    Registrarse Ahora
                                </button>
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer orgID={orgID} orgName={orgName} orgImage={orgImage} social={social} />
            </div>
        </LandingPageClient>
    );
}
