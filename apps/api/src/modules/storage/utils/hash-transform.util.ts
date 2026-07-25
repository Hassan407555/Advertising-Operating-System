import { createHash, Hash } from 'node:crypto';
import { Transform, TransformCallback } from 'node:stream';

export class HashTransform extends Transform {
  private readonly hash: Hash;

  private checksum = '';

  constructor() {
    super();

    this.hash = createHash('sha256');
  }

  override _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    this.hash.update(chunk);

    callback(null, chunk);
  }

  override _flush(
    callback: TransformCallback,
  ): void {
    this.checksum = this.hash.digest('hex');

    callback();
  }

  /**
   * Returns the calculated SHA-256 checksum.
   *
   * Only valid after the stream has completed.
   */
  getChecksum(): string {
    return this.checksum;
  }
}