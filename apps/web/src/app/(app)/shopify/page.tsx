import { Suspense } from "react";
import { PageLoading } from "@/components/shared/states/page-loading";
import { ShopifyProductsSyncPageContent } from "@/features/shopify/products/components/shopify-products-sync-page";

export default function ShopifyPage() {
  return (
    <Suspense fallback={<PageLoading cards={2} />}>
      <ShopifyProductsSyncPageContent />
    </Suspense>
  );
}
