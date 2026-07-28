import type { PropsWithChildren } from "react";
import { PublicOnlyGuard } from "@/components/shared/auth/public-only-guard";

export default function PublicLayout({ children }: PropsWithChildren) {
  return (
    <PublicOnlyGuard>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </PublicOnlyGuard>
  );
}
