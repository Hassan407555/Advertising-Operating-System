import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

import { ImageHashes } from '../interfaces/image-hash.interface';

@Injectable()
export class ImageHashService {
  /**
   * Generate image hashes.
   */
  async generate(
    buffer: Buffer,
  ): Promise<ImageHashes> {
    const averageHash = await this.generateAverageHash(buffer);
    const differenceHash = await this.generateDifferenceHash(buffer);

    return {
      averageHash,
      differenceHash,
      perceptualHash: undefined,
    };
  }

  /**
   * Average Hash (aHash).
   */
  private async generateAverageHash(
    buffer: Buffer,
  ): Promise<string> {
    const { data } = await sharp(buffer)
      .resize(8, 8)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const average =
      data.reduce((sum, pixel) => sum + pixel, 0) / data.length;

    return [...data]
      .map((pixel) => (pixel >= average ? '1' : '0'))
      .join('');
  }

  /**
   * Difference Hash (dHash).
   */
  private async generateDifferenceHash(
    buffer: Buffer,
  ): Promise<string> {
    const { data, info } = await sharp(buffer)
      .resize(9, 8)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let hash = '';

    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width - 1; x++) {
        const left = data[y * info.width + x];
        const right = data[y * info.width + x + 1];

        hash += left > right ? '1' : '0';
      }
    }

    return hash;
  }
}