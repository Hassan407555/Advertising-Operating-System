import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import * as path from 'node:path';

@Injectable()
export class FileValidationService {
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

  private static readonly ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',

    // Videos
    'video/mp4',
    'video/quicktime',
    'video/webm',

    // Documents
    'application/pdf',
  ] as const;

  private static readonly ALLOWED_EXTENSIONS = [
    'jpg',
    'jpeg',
    'png',
    'webp',
    'gif',
    'svg',
    'mp4',
    'mov',
    'webm',
    'pdf',
  ] as const;

  validate(file: Express.Multer.File): void {
    this.validatePresence(file);
    this.validateSize(file);
    this.validateMimeType(file);
    this.validateExtension(file);
    this.validateFileName(file);
  }

  private validatePresence(
    file: Express.Multer.File,
  ): void {
    if (!file) {
      throw new BadRequestException(
        'File is required.',
      );
    }

    if (file.size === 0) {
      throw new BadRequestException(
        'Uploaded file is empty.',
      );
    }
  }

  private validateSize(
    file: Express.Multer.File,
  ): void {
    if (
      file.size >
      FileValidationService.MAX_FILE_SIZE
    ) {
      throw new BadRequestException(
        'File exceeds the maximum allowed size of 100 MB.',
      );
    }
  }

  private validateMimeType(
    file: Express.Multer.File,
  ): void {
    if (
      !FileValidationService.ALLOWED_MIME_TYPES.includes(
        file.mimetype as (typeof FileValidationService.ALLOWED_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        `Unsupported MIME type: ${file.mimetype}.`,
      );
    }
  }

  private validateExtension(
    file: Express.Multer.File,
  ): void {
    const extension = path
      .extname(file.originalname)
      .replace('.', '')
      .toLowerCase();

    if (!extension) {
      throw new BadRequestException(
        'File extension is missing.',
      );
    }

    if (
      !FileValidationService.ALLOWED_EXTENSIONS.includes(
        extension as (typeof FileValidationService.ALLOWED_EXTENSIONS)[number],
      )
    ) {
      throw new BadRequestException(
        `Unsupported file extension: .${extension}.`,
      );
    }
  }

  private validateFileName(
    file: Express.Multer.File,
  ): void {
    const fileName = file.originalname.trim();

    if (!fileName) {
      throw new BadRequestException(
        'File name is required.',
      );
    }

    if (
      fileName.includes('..') ||
      fileName.includes('/') ||
      fileName.includes('\\')
    ) {
      throw new BadRequestException(
        'Invalid file name.',
      );
    }

    if (fileName.length > 255) {
      throw new BadRequestException(
        'File name cannot exceed 255 characters.',
      );
    }
  }
}