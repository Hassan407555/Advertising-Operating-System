import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface ContentContainerProps extends PropsWithChildren {
  className?: string;
}

export function ContentContainer({ className, children }: ContentContainerProps) {
  return <main className={cn("flex-1 space-y-4 p-4 md:p-6", className)}>{children}</main>;
}
