import { HttpStatus } from '@nestjs/common';

import { StorageException } from './storage.exception';

/**
 * Thrown when a signed URL cannot be generated.
 */
export class SignedUrlGenerationException extends StorageException {
  constructor(cause?: unknown) {
    super(
      'Failed to generate signed URL.',
      HttpStatus.INTERNAL_SERVER_ERROR,
      cause,
    );
  }
}