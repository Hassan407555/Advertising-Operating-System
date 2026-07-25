import { Module } from '@nestjs/common';

import { ImageModule } from '../image/image.module';

import { ImagePipelineService } from './services/image-pipeline.service';

@Module({
  imports: [ImageModule],
  providers: [ImagePipelineService],
  exports: [ImagePipelineService],
})
export class PipelineModule {}