import { createHash } from 'node:crypto';

export class ChecksumUtil {
  /**
   * Calculates the SHA-256 checksum of a buffer.
   */
  static sha256(
    buffer: Buffer,
  ): string {
    return createHash('sha256')
      .update(buffer)
      .digest('hex');
  }
}