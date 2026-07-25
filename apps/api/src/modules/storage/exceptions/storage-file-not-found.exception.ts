import { HttpStatus } from '@nestjs/common';

import { StorageException } from './storage.exception';

/**
 * Thrown when the requested object
 * does not exist.
 */
export class StorageFileNotFoundException extends StorageException {
  constructor(storageKey: string) {
    super(
      `Storage object '${storageKey}' was not found.`,
      HttpStatus.NOT_FOUND,
    );
  }
}