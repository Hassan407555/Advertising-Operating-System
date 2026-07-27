export const SHOPIFY_PRODUCTS_QUERY = `
query GetProducts($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }

    edges {
      node {
        id
        title
        handle
        vendor
        productType
        descriptionHtml
        status
        tags

        featuredImage {
          url
        }

        images(first: 50) {
          edges {
            node {
              id
              url
              altText
              width
              height
            }
          }
        }

        variants(first: 100) {
          edges {
            node {
              id
              title
              sku
              barcode
              price
              compareAtPrice
              inventoryQuantity

              inventoryItem {
                id

                measurement {
                  weight {
                    value
                    unit
                  }
                }
              }

              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
  }
}
`;