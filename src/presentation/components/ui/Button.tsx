import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className = "", variant = "primary", ...props }: Props) {
    const base = "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 transition-all duration-200";
    const variants: Record<string, string> = {
        primary: "bg-teal-500 text-white hover:bg-teal-600 hover:shadow-lg",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
        ghost: "bg-transparent text-teal-600 hover:bg-teal-50",
    };
    return <button {...props} className={`${base} ${variants[variant]} ${className}`} />;
}



