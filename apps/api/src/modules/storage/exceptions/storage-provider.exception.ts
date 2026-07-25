import { HttpStatus } from '@nestjs/common';

import { StorageException } from './storage.exception';

/**
 * Thrown when the configured storage provider
 * cannot complete an operation.
 */
export class StorageProviderException extends StorageException {
  constructor(message: string, cause?: unknown) {
    super(message, HttpStatus.BAD_GATEWAY, cause);
  }
}