/**
 * Default image validation limits.
 */
export const IMAGE_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB

  MAX_WIDTH: 12000,

  MAX_HEIGHT: 12000,

  MAX_PIXELS: 100_000_000,

  MIN_WIDTH: 1,

  MIN_HEIGHT: 1,
} as const;