import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

import { MembershipsController } from './controllers/memberships.controller';
import { MembershipsService } from './services/memberships.service';

@Module({
  imports: [PrismaModule],
  controllers: [MembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}