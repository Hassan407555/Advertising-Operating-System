import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

import { ImageTransformOptions } from '../interfaces/image-transform.interface';
import { IMAGE_QUALITY } from '../constants/image-quality.constant';

/**
 * Performs image transformations.
 */
@Injectable()
export class ImageTransformService {
  /**
   * Transform an image.
   */
  async transform(
    buffer: Buffer,
    options: ImageTransformOptions,
  ): Promise<Buffer> {
    let image = sharp(buffer);

    if (options.width || options.height) {
      image = image.resize({
        width: options.width,
        height: options.height,
        fit: options.fit ?? 'inside',
        withoutEnlargement:
          options.withoutEnlargement ?? true,
      });
    }

    if (options.rotate !== undefined) {
      image = image.rotate(options.rotate);
    }

    if (options.flip) {
      image = image.flip();
    }

    if (options.flop) {
      image = image.flop();
    }

    if (options.blur !== undefined) {
      image = image.blur(options.blur);
    }

    if (options.sharpen) {
      image = image.sharpen();
    }

    if (options.grayscale) {
      image = image.grayscale();
    }

    if (options.preserveMetadata) {
      image = image.withMetadata();
    }

    switch (options.format) {
      case 'jpeg':
        image = image.jpeg({
          quality:
            options.quality ??
            IMAGE_QUALITY.JPEG,
          mozjpeg: true,
          progressive: true,
        });
        break;

      case 'png':
        image = image.png({
          compressionLevel:
            IMAGE_QUALITY.PNG_COMPRESSION_LEVEL,
          progressive: true,
        });
        break;

      case 'webp':
        image = image.webp({
          quality:
            options.quality ??
            IMAGE_QUALITY.WEBP,
        });
        break;

      case 'avif':
        image = image.avif({
          quality:
            options.quality ??
            IMAGE_QUALITY.AVIF,
        });
        break;
    }

    return image.toBuffer();
  }
}