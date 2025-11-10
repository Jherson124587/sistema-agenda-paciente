"use client";
import Link from "next/link";
import { Button } from "../ui/Button";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/auth/firebase";
import { UserProfileDropdown } from "../ui/UserProfileDropdown";

type Props = {
    orgID?: string;
    orgName?: string;
    orgImage?: string;
};

export function Header({ orgID, orgName, orgImage }: Props) {
    const pathname = usePathname();
    const isClinicPage = pathname?.includes("/clinic/");
    const displayName = orgName || "Doctoc";
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
                {/* Logo */}
                <Link href={isClinicPage && orgID ? `/clinic/${orgID}` : "/"} className="flex items-center gap-3">
                    {orgImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                            src={orgImage} 
                            alt={displayName} 
                            className="h-10 w-10 rounded-lg object-cover"
                        />
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500 text-white">
                            <span className="text-xl">❤️</span>
                        </div>
                    )}
                    <div>
                        <div className="text-lg font-bold text-gray-900">
                            {displayName.split(" ").map((word, idx, arr) => (
                                <span key={idx}>
                                    {idx === arr.length - 1 ? (
                                        <span className="text-teal-600">{word}</span>
                                    ) : (
                                        <span>{word} </span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>
                </Link>

                {/* Navigation Links */}
                {isClinicPage && orgID && (
                    <div className="hidden items-center gap-6 md:flex">
                        <Link 
                            href={`/clinic/${orgID}`} 
                            className={`text-sm font-medium transition-colors ${
                                pathname === `/clinic/${orgID}` 
                                    ? "text-teal-600" 
                                    : "text-gray-700 hover:text-teal-600"
                            }`}
                        >
                            Inicio
                        </Link>
                        <Link 
                            href={`/clinic/${orgID}/search`} 
                            className={`text-sm font-medium transition-colors ${
                                pathname?.includes("/search") 
                                    ? "text-teal-600" 
                                    : "text-gray-700 hover:text-teal-600"
                            }`}
                        >
                            Doctores
                        </Link>
                        {user && (
                            <Link 
                                href={`/clinic/${orgID}/patient`} 
                                className={`text-sm font-medium transition-colors ${
                                    pathname?.includes("/patient") 
                                        ? "text-teal-600" 
                                        : "text-gray-700 hover:text-teal-600"
                                }`}
                            >
                                Mis Citas
                            </Link>
                        )}
                    </div>
                )}

                {/* CTA Button / User Profile */}
                <div className="flex items-center gap-3">
                    {loading ? (
                        <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200"></div>
                    ) : user ? (
                        <UserProfileDropdown user={user} orgID={orgID} />
                    ) : isClinicPage && orgID ? (
                        <>
                            <Link href={`/clinic/${orgID}/login`}>
                                <Button variant="ghost" className="text-gray-700 hover:text-teal-600 border border-teal-500 text-teal-600 px-6 py-2 rounded-lg font-medium">
                                    Iniciar Sesión
                                </Button>
                            </Link>
                            <Link href={`/clinic/${orgID}/register`}>
                                <Button className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg font-medium transition-all hover:shadow-lg">
                                    Registrarse
                                </Button>
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost" className="text-gray-700 hover:text-teal-600 border border-teal-500 text-teal-600 px-6 py-2 rounded-lg font-medium">
                                    Iniciar Sesión
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg font-medium transition-all hover:shadow-lg">
                                    Registrarse
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
}
