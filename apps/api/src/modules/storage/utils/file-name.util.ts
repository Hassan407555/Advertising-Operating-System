import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

export class FileNameUtil {
  private constructor() {}

  /**
   * Generates a unique filename while preserving the original extension.
   */
  static generate(originalFileName: string): string {
    const extension = extname(originalFileName).toLowerCase();

    return `${randomUUID()}${extension}`;
  }

  /**
   * Returns the extension without the leading dot.
   */
  static extension(fileName: string): string {
    return extname(fileName).replace('.', '').toLowerCase();
  }

  /**
   * Returns the filename without its extension.
   */
  static withoutExtension(fileName: string): string {
    const extension = extname(fileName);

    return fileName.substring(0, fileName.length - extension.length);
  }

  /**
   * Sanitizes a filename.
   */
  static sanitize(fileName: string): string {
    return fileName
      .trim()
      .replace(/[^\w.-]/g, '_')
      .replace(/_+/g, '_');
  }
}