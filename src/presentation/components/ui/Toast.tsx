"use client";
import React, { useEffect, useState } from "react";

type ToastProps = {
    message: string;
    type?: "success" | "error" | "info";
    duration?: number;
    onClose?: () => void;
};

export function Toast({ message, type = "info", duration = 3000, onClose }: ToastProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            onClose?.();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!visible) return null;

    const colors = {
        success: "bg-green-500",
        error: "bg-red-500",
        info: "bg-blue-500",
    };

    return (
        <div className={`fixed bottom-4 right-4 z-50 rounded px-4 py-2 text-white shadow-lg ${colors[type]}`}>
            {message}
        </div>
    );
}


