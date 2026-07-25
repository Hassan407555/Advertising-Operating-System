export class MimeTypeUtil {
  private constructor() {}

  /**
   * Returns the primary MIME type.
   *
   * Example:
   * image/jpeg -> image
   */
  static category(mimeType: string): string {
    return mimeType.split('/')[0].toLowerCase();
  }

  /**
   * Returns true when the MIME type is an image.
   */
  static isImage(mimeType: string): boolean {
    return this.category(mimeType) === 'image';
  }

  /**
   * Returns true when the MIME type is a video.
   */
  static isVideo(mimeType: string): boolean {
    return this.category(mimeType) === 'video';
  }

  /**
   * Returns true when the MIME type is audio.
   */
  static isAudio(mimeType: string): boolean {
    return this.category(mimeType) === 'audio';
  }

  /**
   * Returns true when the MIME type is text.
   */
  static isText(mimeType: string): boolean {
    return this.category(mimeType) === 'text';
  }

  /**
   * Returns true when the MIME type is a PDF document.
   */
  static isPdf(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  /**
   * Returns true when the MIME type represents a document.
   */
  static isDocument(mimeType: string): boolean {
    return (
      this.isPdf(mimeType) ||
      mimeType.startsWith('application/')
    );
  }
}