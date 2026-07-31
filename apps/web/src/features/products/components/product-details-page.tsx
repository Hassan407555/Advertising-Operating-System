"use client";

import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Package,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { RequireActiveStore } from "@/components/shared/stores/require-active-store";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/states/page-loading";
import { SectionHeader } from "@/components/shared/section-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import {
  useStartAdvertisingEntryMutation,
  useStoreProductQuery,
} from "@/features/products/hooks/use-products";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";
import { useRunShopifyProductSyncMutation } from "@/features/shopify/products/hooks/use-shopify-products-sync";
import { usePermission } from "@/hooks/use-permission";
import { useSession } from "@/providers/session-provider";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";

interface ProductDetailsPageProps {
  productId: string;
}

function shopifyAdminProductUrl(shopDomain: string, externalId: string): string | null {
  const domain = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!domain) {
    return null;
  }
  const numeric =
    externalId.match(/Product\/(\d+)/)?.[1] ??
    (/^\d+$/.test(externalId) ? externalId : null);
  if (!numeric) {
    return null;
  }
  return `https://${domain}/admin/products/${numeric}`;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-caption">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-foreground">
        {value ?? "—"}
      </dd>
    </div>
  );
}

function ProductDetailsContent({ productId }: ProductDetailsPageProps) {
  const router = useRouter();
  const { activeStore } = useActiveStore();
  const canView = usePermission("view");
  const { membership } = useSession();
  const canStartEntry =
    membership?.role === "OWNER" ||
    membership?.role === "ADMIN" ||
    membership?.role === "MEMBER";

  const productQuery = useStoreProductQuery(productId);
  const entryMutation = useStartAdvertisingEntryMutation();
  const syncMutation = useRunShopifyProductSyncMutation();
  const [starting, setStarting] = useState(false);

  const product = productQuery.data;
  const pending = starting || entryMutation.isPending;
  const shopifyUrl = useMemo(() => {
    if (!product || !activeStore?.shopDomain) {
      return null;
    }
    return shopifyAdminProductUrl(activeStore.shopDomain, product.externalId);
  }, [activeStore?.shopDomain, product]);

  const gallery = useMemo(() => {
    if (!product) {
      return [] as string[];
    }
    const urls = product.images.map((image) => image.url).filter(Boolean);
    if (product.featuredImageUrl && !urls.includes(product.featuredImageUrl)) {
      return [product.featuredImageUrl, ...urls];
    }
    return urls.length > 0
      ? urls
      : product.featuredImageUrl
        ? [product.featuredImageUrl]
        : [];
  }, [product]);

  const handleGenerate = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!product || pending) {
      return;
    }
    if (!canStartEntry) {
      toast.error("Your role cannot start an AI campaign session.");
      return;
    }
    if (!product.canAdvertise) {
      toast.error(
        product.status.toUpperCase() !== "ACTIVE"
          ? "Only ACTIVE products can be advertised."
          : "Connect Shopify and sync products before generating a campaign.",
      );
      return;
    }
    if (!activeStore?.id) {
      toast.error("Select an active store before generating a campaign.");
      return;
    }

    setStarting(true);
    try {
      const session = await entryMutation.mutateAsync({ productId: product.id });
      if (!session?.id) {
        toast.error("Advertising entry succeeded but no session was returned.");
        return;
      }
      toast.success(
        session.reusedExisting
          ? "Resumed AI campaign session."
          : "AI session started.",
      );
      await router.push(ROUTES.AI_SESSION_DETAILS(session.id));
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to start AI campaign session."));
    } finally {
      setStarting(false);
    }
  };

  const handleSync = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await syncMutation.mutateAsync();
      toast.success("Product sync started. Refreshing catalog…");
      await productQuery.refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to sync products from Shopify."));
    }
  };

  if (!canView) {
    return (
      <PageEmpty
        title="Access restricted"
        description="Your role cannot view product details."
      />
    );
  }

  if (productQuery.isLoading) {
    return (
      <div className="page-stack animate-fade-in-up">
        <PageLoading />
      </div>
    );
  }

  if (productQuery.isError) {
    return (
      <PageError
        title="Unable to load product"
        message={getErrorMessage(productQuery.error, "Product could not be loaded.")}
        onRetry={() => productQuery.refetch()}
      />
    );
  }

  if (!product) {
    return (
      <PageEmpty
        title="Product not found"
        description="This product is not available for the selected store."
        action={
          <Link href={ROUTES.PRODUCTS}>
            <Button variant="secondary" className="gap-1.5">
              <ArrowLeft className="size-3.5" aria-hidden />
              Back to Products
            </Button>
          </Link>
        }
      />
    );
  }

  const generateLabel = product.activeSessionId
    ? "Resume Interview"
    : "Generate Campaign";

  return (
    <div className="page-stack animate-fade-in-up">
      <PageHeader
        eyebrow="Commerce"
        title={product.title}
        description={product.handle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={ROUTES.PRODUCTS}>
              <Button type="button" variant="secondary" className="gap-1.5">
                <ArrowLeft className="size-3.5" aria-hidden />
                Back to Products
              </Button>
            </Link>
            {shopifyUrl ? (
              <a href={shopifyUrl} target="_blank" rel="noopener noreferrer">
                <Button type="button" variant="outline" className="gap-1.5">
                  <ExternalLink className="size-3.5" aria-hidden />
                  View in Shopify
                </Button>
              </a>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              className="gap-1.5"
              disabled={syncMutation.isPending}
              onClick={handleSync}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              {syncMutation.isPending ? "Syncing…" : "Sync Product"}
            </Button>
            <Button
              type="button"
              className="gap-1.5"
              disabled={!canStartEntry || pending || !product.canAdvertise}
              title={
                !product.canAdvertise
                  ? product.status.toUpperCase() !== "ACTIVE"
                    ? "Only ACTIVE products can start an AI campaign."
                    : "Connect Shopify and sync products first."
                  : undefined
              }
              onClick={handleGenerate}
            >
              <Zap className="size-3.5" aria-hidden />
              {pending ? "Starting…" : generateLabel}
            </Button>
          </div>
        }
      />

      {!product.canAdvertise ? (
        <Card className="space-y-2 bg-warning-muted/30" padding="default">
          <h2 className="text-subheading">Cannot advertise this product yet</h2>
          <p className="text-body-sm">
            {product.status.toUpperCase() !== "ACTIVE"
              ? "Only ACTIVE products can start an AI campaign session."
              : "Connect Shopify and sync products for this store, then try Generate Campaign again. Meta is only required when you publish."}
          </p>
          {product.status.toUpperCase() === "ACTIVE" ? (
            <Link
              href={ROUTES.SHOPIFY}
              className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Open Shopify Sync
            </Link>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card padding="none" className="overflow-hidden">
          {gallery.length > 0 ? (
            <div className="space-y-2 p-3">
              <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-muted/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gallery[0]}
                  alt={product.title}
                  className="size-full object-cover"
                />
              </div>
              {gallery.length > 1 ? (
                <div className="grid grid-cols-4 gap-2">
                  {gallery.slice(1, 5).map((url) => (
                    <div
                      key={url}
                      className="aspect-square overflow-hidden rounded-[var(--radius-sm)] bg-muted/40"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="size-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground">
              <Package className="size-10 opacity-40" aria-hidden />
            </div>
          )}
        </Card>

        <Card padding="lg" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={product.status} />
            {product.canAdvertise ? <Badge variant="ai">AI Ready</Badge> : null}
          </div>
          <dl className="space-y-3">
            <DetailRow label="Vendor" value={product.vendor} />
            <DetailRow label="Brand" value={product.brand ?? product.vendor} />
            <DetailRow label="Product Type" value={product.productType} />
            <DetailRow label="Price" value={product.price} />
            <DetailRow label="Compare-at Price" value={product.compareAtPrice} />
            <DetailRow
              label="Inventory"
              value={
                product.inventory === null || product.inventory === undefined
                  ? "—"
                  : String(product.inventory)
              }
            />
            <DetailRow label="Shopify Product ID" value={product.externalId} />
            <DetailRow
              label="Created At"
              value={formatDateTime(product.createdAt)}
            />
            <DetailRow
              label="Updated At"
              value={formatDateTime(product.updatedAt)}
            />
          </dl>
        </Card>
      </div>

      <Card padding="lg" className="space-y-3">
        <SectionHeader size="sm" title="Description" />
        {product.description ? (
          <div
            className="prose prose-sm max-w-none text-body-sm text-foreground [&_img]:max-w-full"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        ) : (
          <p className="text-body-sm text-muted-foreground">No description.</p>
        )}
      </Card>

      {product.collections.length > 0 ? (
        <Card padding="lg" className="space-y-3">
          <SectionHeader size="sm" title="Collections" />
          <div className="flex flex-wrap gap-2">
            {product.collections.map((collection) => (
              <Badge key={collection} variant="outline">
                {collection}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}

      <Card padding="lg" className="space-y-3">
        <SectionHeader
          size="sm"
          title="Variants"
          description={
            product.variants.length === 0
              ? "No variants synced for this product."
              : `${product.variants.length} variant${product.variants.length === 1 ? "" : "s"}`
          }
        />
        {product.variants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-border/60 text-caption">
                <tr>
                  <th className="px-2 py-2 font-medium">Title</th>
                  <th className="px-2 py-2 font-medium">SKU</th>
                  <th className="px-2 py-2 font-medium">Price</th>
                  <th className="px-2 py-2 font-medium">Compare-at</th>
                  <th className="px-2 py-2 font-medium">Inventory</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => (
                  <tr key={variant.id} className="border-b border-border/40">
                    <td className="px-2 py-2">
                      {variant.title ?? "—"}
                      {variant.isDefault ? (
                        <span className="ml-2 text-caption">(default)</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">{variant.sku ?? "—"}</td>
                    <td className="px-2 py-2">{variant.price ?? "—"}</td>
                    <td className="px-2 py-2">{variant.compareAtPrice ?? "—"}</td>
                    <td className="px-2 py-2">
                      {variant.inventoryQuantity ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export function ProductDetailsPage({ productId }: ProductDetailsPageProps) {
  return (
    <RequireActiveStore
      emptyTitle="No product selected"
      emptyDescription="Connect a store under Commerce, then open a product from the catalog."
    >
      <ProductDetailsContent key={productId} productId={productId} />
    </RequireActiveStore>
  );
}
