export interface ShopifyProductsResponse {
  products: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };

    edges: ShopifyProductEdge[];
  };
}

export interface ShopifyProductEdge {
  node: ShopifyGraphQLProduct;
}

export interface ShopifyGraphQLProduct {
  id: string;
  title: string;
  handle: string;
  vendor?: string;
  productType?: string;
  descriptionHtml?: string;
  status: string;
  tags: string[];

  featuredImage?: {
    url: string;
  };

  images: {
    edges: ShopifyImageEdge[];
  };

  variants: {
    edges: ShopifyVariantEdge[];
  };
}

export interface ShopifyImageEdge {
  node: {
    id: string;
    url: string;
    altText?: string;
    width?: number;
    height?: number;
  };
}

export interface ShopifyVariantEdge {
  node: {
    id: string;
    title: string;
    sku?: string;
    barcode?: string;
    price?: string;
    compareAtPrice?: string;
    inventoryQuantity?: number;
    weight?: number;
    selectedOptions: {
      name: string;
      value: string;
    }[];
  };
}