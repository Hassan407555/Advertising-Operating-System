import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception for all storage-related errors.
 */
export class StorageException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    cause?: unknown,
  ) {
    super(
      {
        statusCode: status,
        error: 'Storage Error',
        message,
        cause,
      },
      status,
    );
  }
}