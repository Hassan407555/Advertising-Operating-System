"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";

export function GlobalLoadingIndicator() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isVisible = isFetching > 0 || isMutating > 0;

  if (!isVisible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-1 bg-primary/80" />
  );
}
