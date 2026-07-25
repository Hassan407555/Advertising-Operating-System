import { ApiProperty } from '@nestjs/swagger';

export class UploadAssetResponseDto {
  @ApiProperty({
    example: 'cmf4q8w0n0001g8jv2u8m1c7a',
  })
  id: string;

  @ApiProperty({
    example: 'banner.jpg',
  })
  fileName: string;

  @ApiProperty({
    example: 'https://cdn.example.com/assets/banner.jpg',
  })
  url: string;

  @ApiProperty({
    example:
      'organizations/org_123/creative-assets/banner-8c9f5d3d.jpg',
  })
  storageKey: string;

  @ApiProperty({
    example: 'image/jpeg',
  })
  mimeType: string;

  @ApiProperty({
    example: 'jpg',
  })
  extension: string;

  @ApiProperty({
    example: 245871,
  })
  fileSize: number;

  @ApiProperty({
    example:
      'd7f2f5db7b8dff8f57c7a90b96b0f54b9df1e57d0dc5dbcb8bdf9f1d95f3f0ab',
    required: false,
  })
  checksum?: string;

  @ApiProperty({
    example: 1080,
    required: false,
  })
  width?: number;

  @ApiProperty({
    example: 1080,
    required: false,
  })
  height?: number;

  @ApiProperty({
    example: true,
  })
  success: boolean;
}