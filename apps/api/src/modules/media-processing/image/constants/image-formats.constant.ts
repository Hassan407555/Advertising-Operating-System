/**
 * Supported image formats.
 */
export const IMAGE_FORMATS = {
  JPEG: 'jpeg',
  JPG: 'jpg',
  PNG: 'png',
  WEBP: 'webp',
  AVIF: 'avif',
  GIF: 'gif',
  TIFF: 'tiff',
  HEIF: 'heif',
  SVG: 'svg',
} as const;

/**
 * Formats supported for uploads.
 */
export const SUPPORTED_IMAGE_FORMATS = [
  IMAGE_FORMATS.JPEG,
  IMAGE_FORMATS.JPG,
  IMAGE_FORMATS.PNG,
  IMAGE_FORMATS.WEBP,
  IMAGE_FORMATS.AVIF,
  IMAGE_FORMATS.GIF,
  IMAGE_FORMATS.TIFF,
] as const;

export type ImageFormat =
  (typeof SUPPORTED_IMAGE_FORMATS)[number];