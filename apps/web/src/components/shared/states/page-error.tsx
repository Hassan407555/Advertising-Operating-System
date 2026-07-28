interface PageErrorProps {
  title?: string;
  message: string;
}

export function PageError({ title = "Something went wrong", message }: PageErrorProps) {
  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4">
      <h2 className="text-sm font-semibold text-red-200">{title}</h2>
      <p className="mt-1 text-sm text-red-200/90">{message}</p>
    </div>
  );
}
