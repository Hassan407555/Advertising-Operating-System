"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequireActiveStore } from "@/components/shared/stores/require-active-store";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import {
  useStartAdvertisingEntryMutation,
  useStoreProductsQuery,
} from "@/features/products/hooks/use-products";
import type { StoreProduct } from "@/features/products/types/product.types";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";
import { usePermission } from "@/hooks/use-permission";
import { useSession } from "@/providers/session-provider";
import { getErrorMessage } from "@/utils/errors";

function ProductRow({
  product,
  canAct,
  entryPending,
  onEntry,
}: {
  product: StoreProduct;
  canAct: boolean;
  entryPending: boolean;
  onEntry: (product: StoreProduct) => void;
}) {
  const hasActiveSession = Boolean(product.activeSessionId);
  const label = hasActiveSession ? "Resume Interview" : "Generate AI Campaign";
  const disabled = !canAct || !product.canAdvertise || entryPending;

  return (
    <tr className="border-b border-border/60">
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          {product.featuredImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.featuredImageUrl}
              alt=""
              className="size-10 rounded object-cover"
            />
          ) : (
            <div className="size-10 rounded bg-muted" aria-hidden />
          )}
          <div>
            <div className="font-medium">{product.title}</div>
            <div className="text-xs text-muted-foreground">{product.handle}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-muted-foreground">{product.vendor ?? "—"}</td>
      <td className="px-3 py-3">
        <StatusBadge status={product.status} />
      </td>
      <td className="px-3 py-3 text-right">
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          title={
            !product.canAdvertise
              ? "Store is not advertising-ready, or this product cannot be advertised."
              : undefined
          }
          onClick={() => onEntry(product)}
        >
          {entryPending ? "Starting…" : label}
        </Button>
      </td>
    </tr>
  );
}

function ProductsList() {
  const router = useRouter();
  const { activeStore } = useActiveStore();
  const canView = usePermission("view");
  const { membership } = useSession();
  const canStartEntry =
    membership?.role === "OWNER" ||
    membership?.role === "ADMIN" ||
    membership?.role === "MEMBER";
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  const productsQuery = useStoreProductsQuery({
    limit: 50,
    search: submittedSearch || undefined,
  });
  const entryMutation = useStartAdvertisingEntryMutation();

  const eligibility = productsQuery.data?.advertisingEligibility;
  const rows = productsQuery.data?.data ?? [];

  const handleEntry = async (product: StoreProduct) => {
    if (!product.canAdvertise) {
      toast.error("This store is not ready for AI advertising yet.");
      return;
    }

    setPendingProductId(product.id);
    try {
      const session = await entryMutation.mutateAsync({ productId: product.id });
      toast.success(
        session.reusedExisting
          ? "Resumed AI campaign session."
          : "Interview started.",
      );
      router.push(ROUTES.AI_SESSION_DETAILS(session.id));
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to start AI campaign entry."));
    } finally {
      setPendingProductId(null);
    }
  };

  if (!canView) {
    return (
      <PageEmpty
        title="Access restricted"
        description="Your role cannot view products."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        description={`Advertise products for store ${activeStore?.name ?? ""} through Interview → Generate Campaign → Review.`}
        actions={
          <Link href={ROUTES.SHOPIFY}>
            <Button type="button" variant="secondary">
              Sync Products
            </Button>
          </Link>
        }
      />

      {eligibility && !eligibility.eligible ? (
        <Card className="space-y-2 border-amber-500/40">
          <h2 className="text-base font-semibold">Advertising not ready</h2>
          <p className="text-sm text-muted-foreground">
            Generate AI Campaign stays visible but is disabled until this store is advertising-ready.
          </p>
          {eligibility.reasons.length > 0 ? (
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {eligibility.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          <Link
            href={ROUTES.ADVERTISING_CONFIGURATION}
            className="inline-flex text-sm font-medium underline-offset-4 hover:underline"
          >
            Open Advertising Configuration
          </Link>
        </Card>
      ) : null}

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmittedSearch(search.trim());
        }}
      >
        <label className="sr-only" htmlFor="product-search">
          Search products
        </label>
        <input
          id="product-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products"
          className="h-9 min-w-[220px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {productsQuery.isLoading ? (
        <Card className="space-y-3 p-4" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      {productsQuery.isError ? (
        <PageError
          title="Unable to load products"
          message={getErrorMessage(productsQuery.error, "Products could not be loaded.")}
          onRetry={() => productsQuery.refetch()}
        />
      ) : null}

      {productsQuery.isSuccess && rows.length === 0 ? (
        <PageEmpty
          title="No products"
          description="Sync Shopify products for this store, then return here to generate an AI campaign."
          action={
            <Link href={ROUTES.SHOPIFY}>
              <Button>Sync Products</Button>
            </Link>
          }
        />
      ) : null}

      {rows.length > 0 ? (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Products for the active store</caption>
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Vendor</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  canAct={canStartEntry}
                  entryPending={
                    entryMutation.isPending && pendingProductId === product.id
                  }
                  onEntry={handleEntry}
                />
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}

export function ProductsPage() {
  return (
    <RequireActiveStore>
      <ProductsList />
    </RequireActiveStore>
  );
}
