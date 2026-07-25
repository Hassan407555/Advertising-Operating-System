import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { encode } from 'blurhash';

import {
  ImageAnalysis,
  ImageColor,
} from '../interfaces/image-analysis.interface';
import { ImageHashService } from './image-hash.service';

/**
 * Performs image analysis.
 *
 * Current capabilities:
 * - Average color extraction
 * - Dominant color extraction (basic)
 * - BlurHash generation
 * - Image hashing
 *
 * Future capabilities:
 * - K-Means dominant colors
 * - Histogram generation
 * - Face detection
 * - Logo detection
 * - OCR
 * - Object detection
 * - NSFW moderation
 */
@Injectable()
export class ImageAnalysisService {
  constructor(
    private readonly hashService: ImageHashService,
  ) {}

  /**
   * Analyze an image.
   */
  async analyze(
    buffer: Buffer,
  ): Promise<ImageAnalysis> {
    const image = sharp(buffer);

    const {
      data,
      info,
    } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({
        resolveWithObject: true,
      });

    const dominantColors =
      this.extractDominantColors(data);

    const hashes =
      await this.hashService.generate(buffer);

    return {
      dominantColors,

      averageColor:
        dominantColors[0]?.hex ?? '#000000',

      blurHash: encode(
        new Uint8ClampedArray(data),
        info.width,
        info.height,
        4,
        4,
      ),

      perceptualHash:
        hashes.perceptualHash,
    };
  }

  /**
   * Extract dominant colors.
   *
   * NOTE:
   * This currently returns the average image color.
   * In a future version it will be replaced with
   * K-Means clustering to return the top colors.
   */
  private extractDominantColors(
    pixels: Buffer,
  ): ImageColor[] {
    let red = 0;
    let green = 0;
    let blue = 0;

    const totalPixels =
      pixels.length / 4;

    for (
      let index = 0;
      index < pixels.length;
      index += 4
    ) {
      red += pixels[index];
      green += pixels[index + 1];
      blue += pixels[index + 2];
    }

    red = Math.round(red / totalPixels);
    green = Math.round(green / totalPixels);
    blue = Math.round(blue / totalPixels);

    const hex = `#${[
      red,
      green,
      blue,
    ]
      .map((value) =>
        value
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`;

    return [
      {
        hex,
        red,
        green,
        blue,
        percentage: 100,
      },
    ];
  }
}