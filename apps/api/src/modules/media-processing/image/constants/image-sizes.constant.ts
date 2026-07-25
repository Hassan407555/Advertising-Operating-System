/**
 * Standard image variants.
 */
export const IMAGE_VARIANTS = {
  ORIGINAL: 'original',
  THUMBNAIL: 'thumbnail',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
} as const;

/**
 * Default variant dimensions.
 */
export const IMAGE_SIZES = {
  THUMBNAIL: 150,
  SMALL: 400,
  MEDIUM: 800,
  LARGE: 1600,
} as const;