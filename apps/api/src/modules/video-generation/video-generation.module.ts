import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { VIDEO_GENERATION_PROVIDER } from './constants/video-generation.constants';
import { FfmpegVideoRenderEngine } from './engines/ffmpeg-video-render.engine';
import { SimpleVideoProvider } from './providers/simple-video.provider';
import { CreativeVideoService } from './services/creative-video.service';
import { VideoGenerationService } from './services/video-generation.service';

@Module({
  imports: [PrismaModule, StorageModule],
  providers: [
    FfmpegVideoRenderEngine,
    SimpleVideoProvider,
    {
      provide: VIDEO_GENERATION_PROVIDER,
      useExisting: SimpleVideoProvider,
    },
    VideoGenerationService,
    CreativeVideoService,
  ],
  exports: [VideoGenerationService, CreativeVideoService],
})
export class VideoGenerationModule {}
