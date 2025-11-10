import React from "react";
import Link from "next/link";

type Props = { doctor: { uid: string; name: string; specialty?: string; photo?: string; role?: string }; href: string };

export function DoctorCard({ doctor, href }: Props) {
    return (
        <Link href={href} className="group block">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-xl hover:-translate-y-1">
                {doctor.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                        src={doctor.photo} 
                        alt={doctor.name} 
                        className="mx-auto mb-4 h-32 w-32 rounded-full object-cover border-4 border-teal-100 group-hover:border-teal-300 transition-colors" 
                    />
                ) : (
                    <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 border-4 border-teal-100 group-hover:border-teal-300 transition-colors">
                        <span className="text-5xl">👨‍⚕️</span>
                    </div>
                )}
                <div className="text-center">
                    <h3 className="mb-2 text-lg font-bold text-gray-900">{doctor.name}</h3>
                    {doctor.specialty && (
                        <p className="mb-3 text-sm font-medium text-teal-600">{doctor.specialty}</p>
                    )}
                    {doctor.role && (
                        <p className="text-xs text-gray-500">{doctor.role}</p>
                    )}
                    <div className="mt-4 inline-block rounded-full bg-teal-50 px-4 py-2 text-xs font-medium text-teal-700 group-hover:bg-teal-100 transition-colors">
                        Ver Perfil →
                    </div>
                </div>
            </div>
        </Link>
    );
}
