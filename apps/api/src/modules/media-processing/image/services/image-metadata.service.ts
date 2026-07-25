import { Injectable } from '@nestjs/common';

import sharp, { Metadata } from 'sharp';

import { ImageMetadata } from '../interfaces/image-metadata.interface';

/**
 * Extracts metadata from image files.
 *
 * This service performs read-only operations and never modifies
 * the source image.
 */
@Injectable()
export class ImageMetadataService {
  /**
   * Extract metadata from an image buffer.
   */
  async extract(
    buffer: Buffer,
  ): Promise<ImageMetadata> {
    const metadata: Metadata =
      await sharp(buffer).metadata();

    return {
      width: metadata.width ?? 0,

      height: metadata.height ?? 0,

      format: metadata.format ?? 'unknown',

      size: buffer.length,

      channels: metadata.channels ?? 0,

      colorSpace: metadata.space ?? 'unknown',

      density: metadata.density,

      orientation: metadata.orientation,

      hasAlpha: metadata.hasAlpha ?? false,

      isAnimated:
        (metadata.pages ?? 1) > 1,

      pages: metadata.pages,

      pageHeight: metadata.pageHeight,

      hasExif: !!metadata.exif,

      hasIccProfile: !!metadata.icc,

      hasXmp: !!metadata.xmp,

      hasIptc: !!metadata.iptc,
    };
  }
}