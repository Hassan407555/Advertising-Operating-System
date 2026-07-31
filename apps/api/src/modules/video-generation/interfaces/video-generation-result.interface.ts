export interface VideoGenerationResult {
  buffer: Buffer;
  mimeType: 'video/mp4';
  extension: 'mp4';
  durationSeconds: number;
  width: number;
  height: number;
}
