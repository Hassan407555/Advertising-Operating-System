import { Module, forwardRef } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AiSessionsModule } from '../ai-sessions/ai-sessions.module';
import { StoresController } from './controllers/stores.controller';
import { AdvertisingEntryService } from './services/advertising-entry.service';
import { StoresService } from './services/stores.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AiSessionsModule)],
  controllers: [StoresController],
  providers: [StoresService, AdvertisingEntryService],
  exports: [StoresService, AdvertisingEntryService],
})
export class StoresModule {}
