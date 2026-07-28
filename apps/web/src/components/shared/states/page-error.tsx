interface PageErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function PageError({ title = "Something went wrong", message, onRetry }: PageErrorProps) {
  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4" role="alert">
      <h2 className="text-sm font-semibold text-red-200">{title}</h2>
      <p className="mt-1 text-sm text-red-200/90">{message}</p>
      {onRetry ? (
        <button
          type="button"
          className="mt-3 rounded-md border border-red-400/40 px-3 py-1.5 text-sm text-red-100 hover:bg-red-500/20"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
