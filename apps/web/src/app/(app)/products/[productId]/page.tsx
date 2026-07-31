import { ProductDetailsPage } from "@/features/products/components/product-details-page";

interface ProductDetailsRouteProps {
  params: Promise<{ productId: string }>;
}

export default async function ProductDetailsRoute({
  params,
}: ProductDetailsRouteProps) {
  const { productId } = await params;
  return <ProductDetailsPage productId={productId} />;
}
