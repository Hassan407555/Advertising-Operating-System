import type { PropsWithChildren } from "react";

export default function OrganizationLayout({ children }: PropsWithChildren) {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Organization</h1>
        <p className="text-sm text-muted-foreground">Organization-scoped management surface.</p>
      </header>
      {children}
    </section>
  );
}
