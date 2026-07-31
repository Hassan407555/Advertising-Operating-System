import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import ffmpegStatic from 'ffmpeg-static';

import {
  DEFAULT_VIDEO_DURATION_SECONDS,
  END_CARD_SECONDS,
  MAX_VIDEO_SOURCE_IMAGES,
  SECONDS_PER_IMAGE,
  VIDEO_FPS,
  VIDEO_OUTPUT_HEIGHT,
  VIDEO_OUTPUT_WIDTH,
} from '../constants/video-generation.constants';
import type { VideoGenerationRequest } from '../interfaces/video-generation-request.interface';
import type { VideoGenerationResult } from '../interfaces/video-generation-result.interface';

/**
 * Low-level MP4 assembly via ffmpeg-static.
 * Implementation detail of SimpleVideoProvider — not a video "generator" API.
 */
@Injectable()
export class FfmpegVideoRenderEngine {
  private readonly logger = new Logger(FfmpegVideoRenderEngine.name);

  async renderProductShowcase(
    request: VideoGenerationRequest,
  ): Promise<VideoGenerationResult> {
    const imageUrls = this.normalizeImageUrls(request.imageUrls);
    if (imageUrls.length === 0) {
      throw new BadRequestException(
        'Video generation requires at least one product image URL.',
      );
    }

    const ffmpegPath = this.resolveFfmpegPath();
    const workDir = join(tmpdir(), `aos-video-${randomUUID()}`);
    await fs.mkdir(workDir, { recursive: true });

    try {
      const localImages = await this.downloadImages(imageUrls, workDir);
      const clipPaths: string[] = [];

      for (let i = 0; i < localImages.length; i += 1) {
        const clipPath = join(workDir, `clip-${i}.mp4`);
        await this.renderImageClip(
          ffmpegPath,
          localImages[i],
          clipPath,
          SECONDS_PER_IMAGE,
        );
        clipPaths.push(clipPath);
      }

      const endCardPath = join(workDir, 'end-card.mp4');
      await this.renderEndCard(
        ffmpegPath,
        endCardPath,
        request.headline || request.productTitle,
        request.cta,
        END_CARD_SECONDS,
      );
      clipPaths.push(endCardPath);

      const outputPath = join(workDir, 'product-ad.mp4');
      await this.concatClips(ffmpegPath, clipPaths, outputPath, workDir);

      const buffer = await fs.readFile(outputPath);
      const durationSeconds = Math.min(
        10,
        Math.max(
          5,
          Number(
            (
              localImages.length * SECONDS_PER_IMAGE +
              END_CARD_SECONDS
            ).toFixed(1),
          ),
        ),
      );

      return {
        buffer,
        mimeType: 'video/mp4',
        extension: 'mp4',
        durationSeconds:
          request.durationSeconds &&
          request.durationSeconds >= 5 &&
          request.durationSeconds <= 10
            ? request.durationSeconds
            : durationSeconds || DEFAULT_VIDEO_DURATION_SECONDS,
        width: VIDEO_OUTPUT_WIDTH,
        height: VIDEO_OUTPUT_HEIGHT,
      };
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private normalizeImageUrls(urls: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of urls) {
      const url = String(raw ?? '').trim();
      if (!url || seen.has(url)) {
        continue;
      }
      seen.add(url);
      result.push(url);
      if (result.length >= MAX_VIDEO_SOURCE_IMAGES) {
        break;
      }
    }
    return result;
  }

  private resolveFfmpegPath(): string {
    if (!ffmpegStatic) {
      throw new BadRequestException(
        'ffmpeg-static binary is not available. Reinstall the api package dependencies.',
      );
    }
    return ffmpegStatic;
  }

  private async downloadImages(
    urls: string[],
    workDir: string,
  ): Promise<string[]> {
    const paths: string[] = [];
    for (let i = 0; i < urls.length; i += 1) {
      const response = await fetch(urls[i]);
      if (!response.ok) {
        this.logger.warn(
          `Failed to download product image (${response.status}): ${urls[i]}`,
        );
        continue;
      }
      const contentType = response.headers.get('content-type') ?? '';
      const ext = contentType.includes('png')
        ? 'png'
        : contentType.includes('webp')
          ? 'webp'
          : 'jpg';
      const filePath = join(workDir, `image-${i}.${ext}`);
      const arrayBuffer = await response.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(arrayBuffer));
      paths.push(filePath);
    }

    if (paths.length === 0) {
      throw new BadRequestException(
        'Could not download any product images for video generation.',
      );
    }
    return paths;
  }

  private async renderImageClip(
    ffmpegPath: string,
    imagePath: string,
    outputPath: string,
    durationSeconds: number,
  ): Promise<void> {
    const frames = Math.max(1, Math.round(durationSeconds * VIDEO_FPS));
    const vf = [
      `scale=${VIDEO_OUTPUT_WIDTH}:${VIDEO_OUTPUT_HEIGHT}:force_original_aspect_ratio=increase`,
      `crop=${VIDEO_OUTPUT_WIDTH}:${VIDEO_OUTPUT_HEIGHT}`,
      `zoompan=z='min(zoom+0.0012,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${VIDEO_OUTPUT_WIDTH}x${VIDEO_OUTPUT_HEIGHT}:fps=${VIDEO_FPS}`,
      'format=yuv420p',
    ].join(',');

    await this.runFfmpeg(ffmpegPath, [
      '-y',
      '-loop',
      '1',
      '-i',
      imagePath,
      '-vf',
      vf,
      '-t',
      String(durationSeconds),
      '-r',
      String(VIDEO_FPS),
      '-an',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outputPath,
    ]);
  }

  private async renderEndCard(
    ffmpegPath: string,
    outputPath: string,
    headline: string,
    cta: string,
    durationSeconds: number,
  ): Promise<void> {
    const fontFile = this.resolveFontFile();
    const fontOption = fontFile
      ? `fontfile=${fontFile.replace(/:/g, '\\:')}`
      : null;
    const safeHeadline = this.escapeDrawText(headline.slice(0, 80));
    const safeCta = this.escapeDrawText(cta.slice(0, 40));

    const drawFilters = [
      fontOption,
      `text='${safeHeadline}'`,
      'fontsize=48',
      'fontcolor=white',
      'x=(w-text_w)/2',
      'y=(h-text_h)/2-40',
    ]
      .filter(Boolean)
      .join(':');

    const ctaFilters = [
      fontOption,
      `text='${safeCta}'`,
      'fontsize=36',
      'fontcolor=white',
      'x=(w-text_w)/2',
      'y=(h-text_h)/2+40',
    ]
      .filter(Boolean)
      .join(':');

    const vf = `drawtext=${drawFilters},drawtext=${ctaFilters},format=yuv420p`;

    await this.runFfmpeg(ffmpegPath, [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `color=c=0x111111:s=${VIDEO_OUTPUT_WIDTH}x${VIDEO_OUTPUT_HEIGHT}:d=${durationSeconds}`,
      '-vf',
      vf,
      '-r',
      String(VIDEO_FPS),
      '-an',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outputPath,
    ]);
  }

  private async concatClips(
    ffmpegPath: string,
    clipPaths: string[],
    outputPath: string,
    workDir: string,
  ): Promise<void> {
    const listPath = join(workDir, 'concat.txt');
    const listBody = clipPaths
      .map((path) => `file '${path.replace(/\\/g, '/')}'`)
      .join('\n');
    await fs.writeFile(listPath, listBody, 'utf8');

    await this.runFfmpeg(ffmpegPath, [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listPath,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-an',
      outputPath,
    ]);
  }

  private resolveFontFile(): string | null {
    const candidates =
      process.platform === 'win32'
        ? [
            'C:/Windows/Fonts/arial.ttf',
            'C:/Windows/Fonts/segoeui.ttf',
            'C:/Windows/Fonts/calibri.ttf',
          ]
        : process.platform === 'darwin'
          ? [
              '/System/Library/Fonts/Supplemental/Arial.ttf',
              '/Library/Fonts/Arial.ttf',
              '/System/Library/Fonts/Helvetica.ttc',
            ]
          : [
              '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
              '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
              '/usr/share/fonts/TTF/DejaVuSans.ttf',
            ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate.replace(/\\/g, '/');
      }
    }
    return null;
  }

  private escapeDrawText(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/:/g, '\\:')
      .replace(/'/g, "\\'")
      .replace(/%/g, '\\%')
      .replace(/\n/g, ' ');
  }

  private runFfmpeg(ffmpegPath: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(ffmpegPath, args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderr = '';
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        reject(
          new BadRequestException(
            `Failed to start ffmpeg: ${error.message}`,
          ),
        );
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        this.logger.error(
          `ffmpeg exited with code ${code}. stderr tail: ${stderr.slice(-2000)}`,
        );
        reject(
          new BadRequestException(
            'Failed to render product video. Check product images and try again.',
          ),
        );
      });
    });
  }
}
