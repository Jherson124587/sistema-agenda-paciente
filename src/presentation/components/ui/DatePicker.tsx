import React from "react";
import { Input } from "./Input";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label?: string };

export function DatePicker({ label, className = "", ...props }: Props) {
    return <Input type="date" label={label} className={className} {...props} />;
}


