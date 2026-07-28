"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function usePaginationState(defaultPage = 1, defaultLimit = 20) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const page = Number(params.get("page") ?? defaultPage);
  const limit = Number(params.get("limit") ?? defaultLimit);

  const setPagination = (nextPage: number, nextLimit: number) => {
    const nextParams = new URLSearchParams(params.toString());
    nextParams.set("page", String(nextPage));
    nextParams.set("limit", String(nextLimit));
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  return { page, limit, setPagination };
}
