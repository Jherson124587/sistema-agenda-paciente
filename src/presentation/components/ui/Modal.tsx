"use client";
import React from "react";
import { Button } from "./Button";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
};

export function Modal({ isOpen, onClose, title, children, footer }: Props) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="w-full max-w-md rounded bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
                {title ? <h2 className="mb-4 text-xl font-semibold">{title}</h2> : null}
                <div>{children}</div>
                {footer || (
                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
                    </div>
                )}
            </div>
        </div>
    );
}


