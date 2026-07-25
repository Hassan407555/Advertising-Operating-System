import { Injectable } from '@nestjs/common';

import { ImageMetadataService } from './image-metadata.service';

import { ImageValidationResult } from '../interfaces/image-validation.interface';
import { ImageMetadata } from '../interfaces/image-metadata.interface';

import {
  IMAGE_LIMITS,
} from '../constants/image-limits.constant';

import {
  SUPPORTED_IMAGE_FORMATS,
} from '../constants/image-formats.constant';

/**
 * Validates uploaded images.
 *
 * This service performs only validation and never modifies images.
 */
@Injectable()
export class ImageValidationService {
  constructor(
    private readonly metadataService: ImageMetadataService,
  ) {}

  /**
   * Validate an image buffer.
   */
  async validate(
    buffer: Buffer,
  ): Promise<ImageValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    let metadata: ImageMetadata;

    try {
      metadata =
        await this.metadataService.extract(buffer);
    } catch {
      return {
        valid: false,
        errors: ['Invalid or corrupted image.'],
        warnings: [],
      };
    }

    if (buffer.length > IMAGE_LIMITS.MAX_FILE_SIZE) {
      errors.push('Image exceeds maximum file size.');
    }

    if (
      metadata.width < IMAGE_LIMITS.MIN_WIDTH ||
      metadata.width > IMAGE_LIMITS.MAX_WIDTH
    ) {
      errors.push('Invalid image width.');
    }

    if (
      metadata.height < IMAGE_LIMITS.MIN_HEIGHT ||
      metadata.height > IMAGE_LIMITS.MAX_HEIGHT
    ) {
      errors.push('Invalid image height.');
    }

    if (
      metadata.width * metadata.height >
      IMAGE_LIMITS.MAX_PIXELS
    ) {
      errors.push('Image exceeds maximum pixel count.');
    }

    if (
      !SUPPORTED_IMAGE_FORMATS.includes(
        metadata.format.toLowerCase() as never,
      )
    ) {
      errors.push(
        `Unsupported image format: ${metadata.format}`,
      );
    }

    if (metadata.isAnimated) {
      warnings.push('Animated image detected.');
    }

    if (metadata.hasAlpha) {
      warnings.push(
        'Image contains transparency.',
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}