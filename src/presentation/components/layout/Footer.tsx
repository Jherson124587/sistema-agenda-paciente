import Link from "next/link";

type Props = {
    orgID?: string;
    orgName?: string;
    orgImage?: string;
    social?: Record<string, string>;
};

export function Footer({ orgID, orgName, orgImage, social }: Props) {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-900 text-gray-300">
            <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                    {/* Brand Column */}
                    <div className="md:col-span-1">
                        <div className="mb-4 flex items-center gap-3">
                            {orgImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img 
                                    src={orgImage} 
                                    alt={orgName || "HealthCare"} 
                                    className="h-10 w-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500 text-white">
                                    <span className="text-xl font-bold">H</span>
                                </div>
                            )}
                            <div>
                                <div className="text-lg font-bold text-white">{orgName || "HealthCare"}</div>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400">
                            Tu salud es nuestra prioridad. Ofrecemos servicios médicos de calidad con atención personalizada.
                        </p>
                        {social && Object.keys(social).length > 0 && (
                            <div className="mt-4 flex gap-3">
                                {Object.entries(social).map(([platform, url]) => (
                                    url && (
                                        <a
                                            key={platform}
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="rounded-full bg-gray-800 p-2 text-gray-400 hover:bg-teal-600 hover:text-white transition-colors"
                                        >
                                            <span className="sr-only">{platform}</span>
                                            {platform === "facebook" && "📘"}
                                            {platform === "instagram" && "📷"}
                                            {platform === "twitter" && "🐦"}
                                            {platform === "linkedin" && "💼"}
                                        </a>
                                    )
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="mb-4 text-lg font-semibold text-white">Enlaces Rápidos</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href={orgID ? `/clinic/${orgID}` : "/"} className="hover:text-teal-400 transition-colors">
                                    Inicio
                                </Link>
                            </li>
                            <li>
                                <Link href={orgID ? `/clinic/${orgID}/search` : "/"} className="hover:text-teal-400 transition-colors">
                                    Doctores
                                </Link>
                            </li>
                            <li>
                                <Link href={orgID ? `/clinic/${orgID}` : "/"} className="hover:text-teal-400 transition-colors">
                                    Servicios
                                </Link>
                            </li>
                            <li>
                                <Link href={orgID ? `/clinic/${orgID}` : "/"} className="hover:text-teal-400 transition-colors">
                                    Sobre Nosotros
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Services */}
                    <div>
                        <h3 className="mb-4 text-lg font-semibold text-white">Servicios</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href={orgID ? `/clinic/${orgID}/search` : "/"} className="hover:text-teal-400 transition-colors">
                                    Consulta Médica
                                </Link>
                            </li>
                            <li>
                                <Link href={orgID ? `/clinic/${orgID}/search` : "/"} className="hover:text-teal-400 transition-colors">
                                    Especialidades
                                </Link>
                            </li>
                            <li>
                                <Link href={orgID ? `/clinic/${orgID}/search` : "/"} className="hover:text-teal-400 transition-colors">
                                    Urgencias
                                </Link>
                            </li>
                            <li>
                                <Link href={orgID ? `/clinic/${orgID}/search` : "/"} className="hover:text-teal-400 transition-colors">
                                    Laboratorio
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="mb-4 text-lg font-semibold text-white">Contacto</h3>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                                <span>📧</span>
                                <span>info@healthcare.com</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span>📞</span>
                                <span>+1 (555) 123-4567</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span>📍</span>
                                <span>Av. Principal 123, Lima, Perú</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
                    <p>&copy; {currentYear} {orgName || "HealthCare"}. Todos los derechos reservados.</p>
                </div>
            </div>
        </footer>
    );
}


