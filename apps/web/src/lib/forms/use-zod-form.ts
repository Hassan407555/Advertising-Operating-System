"use client";

import { useForm, type DefaultValues, type FieldValues, type UseFormReturn } from "react-hook-form";
import type { ZodTypeAny } from "zod";

export function useZodForm<TValues extends FieldValues>(defaultValues?: DefaultValues<TValues>): UseFormReturn<TValues> {
  return useForm<TValues>({
    defaultValues,
    mode: "onSubmit",
  });
}

export function validateWithSchema<TSchema extends ZodTypeAny>(schema: TSchema, values: unknown) {
  return schema.safeParse(values);
}
