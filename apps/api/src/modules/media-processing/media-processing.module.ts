import { Module } from '@nestjs/common';

import { ImageModule } from './image/image.module';
import { PipelineModule } from './pipeline/pipeline.module';

@Module({
  imports: [
    ImageModule,
    PipelineModule,
  ],
  exports: [
    ImageModule,
    PipelineModule,
  ],
})
export class MediaProcessingModule {}