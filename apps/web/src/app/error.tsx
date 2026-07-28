"use client";

import { PageError } from "@/components/shared/states/page-error";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return <PageError message={error.message || "Unexpected application error."} onRetry={reset} />;
}
