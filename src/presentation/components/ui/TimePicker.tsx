import React from "react";
import { Input } from "./Input";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label?: string };

export function TimePicker({ label, className = "", ...props }: Props) {
    return <Input type="time" label={label} className={className} {...props} />;
}


