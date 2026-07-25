import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

import { IMAGE_QUALITY } from '../constants/image-quality.constant';

/**
 * Performs lossless and lossy image optimization.
 *
 * This service does not change the visual dimensions of an image.
 */
@Injectable()
export class ImageOptimizationService {
  /**
   * Optimize an image while preserving its original format.
   */
  async optimize(
    buffer: Buffer,
  ): Promise<Buffer> {
    const image = sharp(buffer);

    const metadata = await image.metadata();

const format = metadata.format;

switch (format) {
  case 'jpeg':
    return image.jpeg({
      quality: IMAGE_QUALITY.JPEG,
      progressive: true,
      mozjpeg: true,
    }).toBuffer();

  case 'png':
    return image.png({
      compressionLevel: IMAGE_QUALITY.PNG_COMPRESSION_LEVEL,
      progressive: true,
    }).toBuffer();

  case 'webp':
    return image.webp({
      quality: IMAGE_QUALITY.WEBP,
    }).toBuffer();

  case 'heif':
    return image.avif({
      quality: IMAGE_QUALITY.AVIF,
    }).toBuffer();

  default:
    return image.toBuffer();
}
  }

  /**
   * Convert an image to WebP.
   */
  async toWebP(
    buffer: Buffer,
  ): Promise<Buffer> {
    return sharp(buffer)
      .webp({
        quality: IMAGE_QUALITY.WEBP,
      })
      .toBuffer();
  }

  /**
   * Convert an image to AVIF.
   */
  async toAvif(
    buffer: Buffer,
  ): Promise<Buffer> {
    return sharp(buffer)
      .avif({
        quality: IMAGE_QUALITY.AVIF,
      })
      .toBuffer();
  }

  /**
   * Optimize JPEG.
   */
  async optimizeJpeg(
    buffer: Buffer,
  ): Promise<Buffer> {
    return sharp(buffer)
      .jpeg({
        quality: IMAGE_QUALITY.JPEG,
        mozjpeg: true,
        progressive: true,
      })
      .toBuffer();
  }

  /**
   * Optimize PNG.
   */
  async optimizePng(
    buffer: Buffer,
  ): Promise<Buffer> {
    return sharp(buffer)
      .png({
        compressionLevel:
          IMAGE_QUALITY.PNG_COMPRESSION_LEVEL,
        progressive: true,
      })
      .toBuffer();
  }
}