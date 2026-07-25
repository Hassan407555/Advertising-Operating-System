/**
 * Default quality settings used throughout image processing.
 */
export const IMAGE_QUALITY = {
  JPEG: 85,
  WEBP: 85,
  AVIF: 75,
  PNG_COMPRESSION_LEVEL: 9,
} as const;

/**
 * Quality limits.
 */
export const IMAGE_QUALITY_LIMITS = {
  MIN: 1,
  MAX: 100,
  DEFAULT: 85,
} as const;