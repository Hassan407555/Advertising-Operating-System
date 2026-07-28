import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface FormActionsProps extends PropsWithChildren {
  className?: string;
}

export function FormActions({ className, children }: FormActionsProps) {
  return <div className={cn("flex items-center justify-end gap-2 pt-2", className)}>{children}</div>;
}
