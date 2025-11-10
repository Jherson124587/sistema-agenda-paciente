import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string };

export function Input({ label, className = "", ...props }: Props) {
    return (
        <label className="flex w-full flex-col gap-1 text-sm">
            {label ? <span className="text-gray-700">{label}</span> : null}
            <input {...props} className={`rounded border px-3 py-2 ${className}`} />
        </label>
    );
}




