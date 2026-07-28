"use client";

import { Upload } from "lucide-react";

interface UploadDropzoneProps {
  onFilesSelected: (files: FileList | null) => void;
  accept?: string;
  multiple?: boolean;
}

export function UploadDropzone({ onFilesSelected, accept, multiple = false }: UploadDropzoneProps) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground hover:bg-muted/40">
      <Upload className="size-5" />
      <span>Drop files here or click to browse</span>
      <input
        className="hidden"
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={(event) => onFilesSelected(event.target.files)}
      />
    </label>
  );
}
