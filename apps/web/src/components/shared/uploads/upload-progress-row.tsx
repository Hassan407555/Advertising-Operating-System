interface UploadProgressRowProps {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "failed";
}

export function UploadProgressRow({ fileName, progress, status }: UploadProgressRowProps) {
  return (
    <div className="space-y-1 rounded-md border border-border p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate">{fileName}</span>
        <span className="text-muted-foreground">{status}</span>
      </div>
      <div className="h-1.5 rounded bg-muted">
        <div className="h-1.5 rounded bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
