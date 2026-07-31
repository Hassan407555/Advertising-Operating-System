"use client";

import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Package,
  RefreshCw,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import { PageGrid } from "@/components/shared/layout/page-grid";
import { RequireActiveStore } from "@/components/shared/stores/require-active-store";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/utils/errors";

const PAGE_SIZE = 20;

type StatusFilter = "ALL" | "ACTIVE" | "DRAFT" | "ARCHIVED" | "OTHER";
type SortKey = "title-asc" | "title-desc" | "updated-desc" | "status";

function ProductCard({
  product,
  canAct,
  entryPending,
  anyEntryPending,
  onEntry,
}: {
  product: StoreProduct;
  canAct: boolean;
  entryPending: boolean;
  anyEntryPending: boolean;
  onEntry: (product: StoreProduct) => void;
}) {
  const router = useRouter();
  const hasActiveSession = Boolean(product.activeSessionId);
  const label = hasActiveSession ? "Resume Interview" : "Generate Campaign";
  const disabled = !canAct || !product.canAdvertise || anyEntryPending;

  const openDetails = () => {
    void router.push(ROUTES.PRODUCT_DETAILS(product.id));
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetails();
    }
  };

  const handleEntryClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onEntry(product);
  };

  return (
    <Card
      variant="default"
      padding="none"
      className={cn(
        "flex h-full cursor-pointer flex-col overflow-hidden transition-surface",
        "hover:shadow-[var(--shadow-elevated)]",
        "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
      )}
      as="article"
      role="link"
      tabIndex={0}
      aria-label={`Open ${product.title}`}
      onClick={openDetails}
      onKeyDown={handleCardKeyDown}
    >
      <div className="relative aspect-[4/3] bg-muted/40">
        {product.featuredImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.featuredImageUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Package className="size-8 opacity-40" aria-hidden />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <StatusBadge status={product.status} />
          {product.canAdvertise ? (
            <Badge variant="ai" className="gap-1">
              <Sparkles className="size-3" aria-hidden />
              AI Ready
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-subheading">{product.title}</h3>
          <p className="mt-0.5 truncate text-caption">{product.handle}</p>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-caption">Brand</dt>
            <dd className="mt-0.5 truncate font-medium">
              {product.brand ?? product.vendor ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-caption">Category</dt>
            <dd className="mt-0.5 truncate font-medium">
              {product.productType ?? "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-auto pt-1">
          <Button
            type="button"
            size="sm"
            className="w-full gap-1.5"
            variant={product.canAdvertise ? "default" : "secondary"}
            disabled={disabled}
            title={
              !product.canAdvertise
                ? product.status.toUpperCase() !== "ACTIVE"
                  ? "Only ACTIVE products can start an AI campaign."
                  : "Connect Shopify and sync products before generating a campaign."
                : undefined
            }
            onClick={handleEntryClick}
          >
            <Zap className="size-3.5" aria-hidden />
            {entryPending ? "Starting…" : label}
          </Button>
        </div>
      </div>
    </Card>
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
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("updated-desc");
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  const productsQuery = useStoreProductsQuery({
    page,
    limit: PAGE_SIZE,
    search: submittedSearch || undefined,
  });
  const entryMutation = useStartAdvertisingEntryMutation();

  const eligibility = productsQuery.data?.advertisingEligibility;
  const rows = useMemo(
    () => productsQuery.data?.data ?? [],
    [productsQuery.data?.data],
  );
  const meta = productsQuery.data?.meta;
  const anyEntryPending = entryMutation.isPending || pendingProductId !== null;

  const visibleRows = useMemo(() => {
    let next = [...rows];

    if (statusFilter !== "ALL") {
      next = next.filter((product) => {
        const status = product.status.toUpperCase();
        if (statusFilter === "OTHER") {
          return !["ACTIVE", "DRAFT", "ARCHIVED"].includes(status);
        }
        return status === statusFilter;
      });
    }

    next.sort((a, b) => {
      switch (sortKey) {
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        case "status":
          return a.status.localeCompare(b.status);
        case "updated-desc":
        default:
          return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      }
    });

    return next;
  }, [rows, sortKey, statusFilter]);

  const handleEntry = async (product: StoreProduct) => {
    if (!product.canAdvertise) {
      if (product.status.toUpperCase() !== "ACTIVE") {
        toast.error("Only ACTIVE products can be advertised.");
      } else if (eligibility && !eligibility.eligible) {
        toast.error(
          eligibility.reasons[0] ??
            "Connect Shopify and sync products before generating a campaign.",
        );
      } else {
        toast.error("This product cannot start an AI campaign right now.");
      }
      return;
    }

    setPendingProductId(product.id);
    try {
      const session = await entryMutation.mutateAsync({ productId: product.id });
      if (!session?.id) {
        toast.error("Advertising entry succeeded but no session was returned.");
        return;
      }
      toast.success(
        session.reusedExisting ? "Resumed AI campaign session." : "Interview started.",
      );
      await router.push(ROUTES.AI_SESSION_DETAILS(session.id));
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to start AI campaign entry."));
    } finally {
      setPendingProductId(null);
    }
  };

  const clearSearch = () => {
    setSearch("");
    setSubmittedSearch("");
    setPage(1);
  };

  if (!canView) {
    return (
      <PageEmpty title="Access restricted" description="Your role cannot view products." />
    );
  }

  return (
    <div className="page-stack animate-fade-in-up">
      <PageHeader
        eyebrow="Commerce"
        title="Products"
        description={`Advertise products for ${activeStore?.name ?? "this store"} through Interview → Generate → Review.`}
        actions={
          <Link href={ROUTES.SHOPIFY}>
            <Button type="button" variant="secondary" className="gap-1.5">
              <RefreshCw className="size-3.5" aria-hidden />
              Sync Products
            </Button>
          </Link>
        }
      />

      {eligibility && !eligibility.eligible ? (
        <Card className="space-y-2 bg-warning-muted/30" padding="default">
          <h2 className="text-subheading">Products not ready</h2>
          <p className="text-body-sm">
            Connect Shopify and sync products to generate AI campaigns. Meta is
            only required later when you publish.
          </p>
          {eligibility.reasons.length > 0 ? (
            <ul className="list-inside list-disc text-body-sm">
              {eligibility.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          <Link
            href={ROUTES.SHOPIFY}
            className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Open Shopify Sync
          </Link>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form
          className="flex flex-1 flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmittedSearch(search.trim());
            setPage(1);
          }}
        >
          <label className="sr-only" htmlFor="product-search">
            Search products
          </label>
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="product-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products"
              maxLength={255}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {submittedSearch ? (
            <Button type="button" variant="outline" onClick={clearSearch}>
              Clear
            </Button>
          ) : null}
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="product-status-filter">
            Filter by status
          </label>
          <select
            id="product-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className={cn(
              "h-9 rounded-[var(--radius-md)] border border-border/60 bg-input/40 px-3 text-sm",
              "shadow-[var(--shadow-xs)] outline-none transition-surface",
              "focus-visible:border-primary/50 focus-visible:shadow-[var(--shadow-focus)]",
            )}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
            <option value="OTHER">Other</option>
          </select>

          <label className="sr-only" htmlFor="product-sort">
            Sort products
          </label>
          <div className="relative">
            <ArrowUpDown
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <select
              id="product-sort"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className={cn(
                "h-9 rounded-[var(--radius-md)] border border-border/60 py-1 pl-9 pr-3 text-sm",
                "shadow-[var(--shadow-xs)] outline-none transition-surface",
                "focus-visible:border-primary/50 focus-visible:shadow-[var(--shadow-focus)]",
              )}
            >
              <option value="updated-desc">Recently updated</option>
              <option value="title-asc">Title A–Z</option>
              <option value="title-desc">Title Z–A</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {productsQuery.isLoading ? (
        <PageGrid cols={3} aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} padding="none" className="overflow-hidden">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-9 w-full" />
              </div>
            </Card>
          ))}
        </PageGrid>
      ) : null}

      {productsQuery.isError ? (
        <PageError
          title="Unable to load products"
          message={getErrorMessage(productsQuery.error, "Products could not be loaded.")}
          onRetry={() => productsQuery.refetch()}
        />
      ) : null}

      {productsQuery.isSuccess && rows.length === 0 && submittedSearch ? (
        <PageEmpty
          title="No matching products"
          description={`No products matched “${submittedSearch}”. Try a different search or clear the filter.`}
          icon={<Package className="size-5" aria-hidden />}
          action={
            <Button type="button" variant="secondary" onClick={clearSearch}>
              Clear search
            </Button>
          }
        />
      ) : null}

      {productsQuery.isSuccess && rows.length === 0 && !submittedSearch ? (
        <PageEmpty
          title="No synced products"
          description="Sync Shopify products for this store, then return here to generate Meta campaigns."
          icon={<Package className="size-5" aria-hidden />}
          action={
            <Link href={ROUTES.SHOPIFY}>
              <Button className="gap-1.5">
                <RefreshCw className="size-3.5" aria-hidden />
                Sync Products
              </Button>
            </Link>
          }
        />
      ) : null}

      {productsQuery.isSuccess && rows.length > 0 && visibleRows.length === 0 ? (
        <PageEmpty
          title="No products match filters"
          description="Try another status filter or sort to see products on this page."
          icon={<Package className="size-5" aria-hidden />}
          action={
            <Button type="button" variant="secondary" onClick={() => setStatusFilter("ALL")}>
              Reset filters
            </Button>
          }
        />
      ) : null}

      {visibleRows.length > 0 ? (
        <div className="space-y-4">
          <PageGrid cols={3}>
            {visibleRows.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                canAct={canStartEntry}
                entryPending={
                  entryMutation.isPending && pendingProductId === product.id
                }
                anyEntryPending={anyEntryPending}
                onEntry={handleEntry}
              />
            ))}
          </PageGrid>
          {meta ? (
            <DataTablePagination
              page={meta.page}
              limit={meta.limit}
              total={meta.total}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ProductsPage() {
  return (
    <RequireActiveStore
      emptyTitle="No synced products"
      emptyDescription="Connect a store under Commerce, sync the catalog, then return here to advertise products."
    >
      <ProductsListHost />
    </RequireActiveStore>
  );
}

/** Remount list state when the active store changes so search/page never leak. */
function ProductsListHost() {
  const { activeStore } = useActiveStore();
  return <ProductsList key={activeStore!.id} />;
}
