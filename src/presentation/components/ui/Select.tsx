import React from "react";

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string };

export function Select({ label, className = "", children, ...props }: Props) {
    return (
        <label className="flex w-full flex-col gap-1 text-sm">
            {label ? <span className="text-gray-700">{label}</span> : null}
            <select {...props} className={`rounded border px-3 py-2 ${className}`}>{children}</select>
        </label>
    );
}




