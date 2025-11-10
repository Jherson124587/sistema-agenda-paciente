"use client";
import { useEffect, useRef } from "react";

// Datos de las alianzas (puedes reemplazar con datos reales de la API)
const alliances = [
    { name: "VineTrust", icon: "🍇" },
    { name: "Health One", icon: "❤️" },
    { name: "MediScience", icon: "🔬" },
    { name: "Care Plus", icon: "➕" },
    { name: "MedTech", icon: "💊" },
    { name: "Global Health", icon: "🌍" },
    { name: "Wichay UC", icon: "🏛️" },
    { name: "Emprende UP", icon: "🚀" },
];

export function AlliancesCarousel() {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const scrollContainer = scrollRef.current;
        if (!scrollContainer) return;

        let scrollPosition = 0;
        const scrollSpeed = 1; // Píxeles por frame

        const animate = () => {
            scrollPosition += scrollSpeed;
            
            // Reset cuando llega al final (considerando el duplicado)
            const maxScroll = scrollContainer.scrollWidth / 2;
            if (scrollPosition >= maxScroll) {
                scrollPosition = 0;
            }
            
            scrollContainer.scrollLeft = scrollPosition;
            requestAnimationFrame(animate);
        };

        // Iniciar animación
        const animationId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, []);

    // Duplicar las alianzas para crear un efecto infinito
    const duplicatedAlliances = [...alliances, ...alliances];

    return (
        <section className="relative overflow-hidden bg-gray-50 py-16">
            <div className="mx-auto max-w-7xl px-4 md:px-6">
                <h2 className="mb-12 text-center text-4xl font-bold text-gray-900">
                    Instituciones que <span className="text-teal-600">Confían en Nosotros</span>
                </h2>
                
                {/* Contenedor con fade gradients */}
                <div className="relative">
                    {/* Fade izquierdo */}
                    <div className="absolute left-0 top-0 z-10 h-full w-32 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none"></div>
                    
                    {/* Fade derecho */}
                    <div className="absolute right-0 top-0 z-10 h-full w-32 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none"></div>
                    
                    {/* Carrusel infinito */}
                    <div 
                        ref={scrollRef}
                        className="flex gap-6 overflow-x-hidden"
                        style={{ scrollBehavior: 'auto' }}
                    >
                        {duplicatedAlliances.map((alliance, idx) => (
                            <div
                                key={idx}
                                className="group flex-shrink-0 w-48 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-teal-300"
                            >
                                <div className="text-center">
                                    <div className="mb-3 text-5xl transition-transform duration-300 group-hover:scale-110">
                                        {alliance.icon}
                                    </div>
                                    <p className="text-sm font-semibold text-gray-700 group-hover:text-teal-600 transition-colors">
                                        {alliance.name}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
