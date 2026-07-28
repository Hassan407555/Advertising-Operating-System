"use client";

import { useEffect, useRef } from "react";

export function usePolling(callback: () => void, enabled: boolean, intervalMs: number) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = window.setInterval(() => {
      savedCallback.current();
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [enabled, intervalMs]);
}
