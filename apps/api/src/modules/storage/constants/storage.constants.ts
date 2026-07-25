/**
 * Dependency injection token used to resolve the active storage provider.
 */
export const STORAGE_PROVIDER_TOKEN = Symbol('STORAGE_PROVIDER');

/**
 * Default directory used when no destination is provided.
 */
export const DEFAULT_STORAGE_DIRECTORY = 'general';

/**
 * Maximum supported file name length.
 */
export const MAX_FILE_NAME_LENGTH = 255;

/**
 * Default signed URL expiration time (seconds).
 */
export const DEFAULT_SIGNED_URL_EXPIRATION = 3600;

/**
 * Default buffer size used for stream operations (64 KB).
 */
export const DEFAULT_STREAM_HIGH_WATER_MARK = 64 * 1024;