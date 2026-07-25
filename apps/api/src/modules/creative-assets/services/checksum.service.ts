import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

@Injectable()
export class ChecksumService {
  sha256(buffer: Buffer): string {
    return createHash('sha256')
      .update(buffer)
      .digest('hex');
  }

  md5(buffer: Buffer): string {
    return createHash('md5')
      .update(buffer)
      .digest('hex');
  }
}