import { Injectable } from '@nestjs/common';

import { ImageVariant } from '../interfaces/image-variant.interface';

import { ImageTransformService } from './image-transform.service';
import { ImageMetadataService } from './image-metadata.service';

import {
  IMAGE_VARIANTS,
  IMAGE_SIZES,
} from '../constants/image-sizes.constant';

/**
 * Generates image variants.
 */
@Injectable()
export class ImageVariantService {
  constructor(
    private readonly transformService: ImageTransformService,
    private readonly metadataService: ImageMetadataService,
  ) {}

  /**
   * Generate all standard image variants.
   */
  async generate(
    buffer: Buffer,
  ): Promise<ImageVariant[]> {
    const variants: ImageVariant[] = [];

    variants.push(
      await this.createVariant(
        IMAGE_VARIANTS.ORIGINAL,
        buffer,
      ),
    );

    variants.push(
      await this.resizeVariant(
        IMAGE_VARIANTS.THUMBNAIL,
        buffer,
        IMAGE_SIZES.THUMBNAIL,
      ),
    );

    variants.push(
      await this.resizeVariant(
        IMAGE_VARIANTS.SMALL,
        buffer,
        IMAGE_SIZES.SMALL,
      ),
    );

    variants.push(
      await this.resizeVariant(
        IMAGE_VARIANTS.MEDIUM,
        buffer,
        IMAGE_SIZES.MEDIUM,
      ),
    );

    variants.push(
      await this.resizeVariant(
        IMAGE_VARIANTS.LARGE,
        buffer,
        IMAGE_SIZES.LARGE,
      ),
    );

    variants.push(
      await this.convertVariant(
        'webp',
        buffer,
        'webp',
      ),
    );

    variants.push(
      await this.convertVariant(
        'avif',
        buffer,
        'avif',
      ),
    );

    return variants;
  }

  /**
   * Create the original variant.
   */
  private async createVariant(
    name: string,
    buffer: Buffer,
  ): Promise<ImageVariant> {
    const metadata =
      await this.metadataService.extract(buffer);

    return {
      name,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      buffer,
      size: buffer.length,
    };
  }

  /**
   * Create a resized variant.
   */
  private async resizeVariant(
    name: string,
    buffer: Buffer,
    width: number,
  ): Promise<ImageVariant> {
    const transformed =
      await this.transformService.transform(
        buffer,
        {
          width,
        },
      );

    const metadata =
      await this.metadataService.extract(
        transformed,
      );

    return {
      name,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      buffer: transformed,
      size: transformed.length,
    };
  }

  /**
   * Create a format-converted variant.
   */
  private async convertVariant(
    name: string,
    buffer: Buffer,
    format: string,
  ): Promise<ImageVariant> {
    const transformed =
      await this.transformService.transform(
        buffer,
        {
          format,
        },
      );

    const metadata =
      await this.metadataService.extract(
        transformed,
      );

    return {
      name,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      buffer: transformed,
      size: transformed.length,
    };
  }
}