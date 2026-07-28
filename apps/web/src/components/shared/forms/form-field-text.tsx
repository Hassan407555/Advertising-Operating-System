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
  const errorId = `${String(name)}-error`;

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor={name}>
        {label}
      </label>
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...register(name)}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
