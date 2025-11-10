import React from "react";

type Props = {
    label?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    required?: boolean;
    rows?: number;
    className?: string;
};

export function Textarea({ label, placeholder, value, onChange, required, rows = 4, className = "" }: Props) {
    return (
        <div className={`space-y-1 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <textarea
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                rows={rows}
            />
        </div>
    );
}


