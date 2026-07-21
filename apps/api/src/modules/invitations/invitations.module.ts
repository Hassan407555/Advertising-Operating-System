import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

import { InvitationsController } from './controllers/invitations.controller';
import { InvitationsService } from './services/invitations.service';

@Module({
  imports: [PrismaModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}