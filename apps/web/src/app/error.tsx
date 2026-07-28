"use client";

import { PageError } from "@/components/shared/states/page-error";

interface ErrorPageProps {
  error: Error & { digest?: string };
}

export default function ErrorPage({ error }: ErrorPageProps) {
  return <PageError message={error.message || "Unexpected application error."} />;
}
