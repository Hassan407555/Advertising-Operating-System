"use client";

import type { FieldValues, Path, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";

interface FormFieldTextProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  error?: string;
  placeholder?: string;
  type?: "text" | "email" | "password";
}

export function FormFieldText<T extends FieldValues>({
  label,
  name,
  register,
  error,
  placeholder,
  type = "text",
}: FormFieldTextProps<T>) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor={name}>
        {label}
      </label>
      <Input id={name} type={type} placeholder={placeholder} {...register(name)} />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
