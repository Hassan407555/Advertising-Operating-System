interface PageEmptyProps {
  title: string;
  description: string;
}

export function PageEmpty({ title, description }: PageEmptyProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
