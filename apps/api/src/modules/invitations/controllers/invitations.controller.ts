import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { CreateInvitationDto } from '../dto/create-invitation.dto';
import { InvitationsService } from '../services/invitations.service';

@Controller()
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('organizations/:organizationId/invitations')
  create(
    @Param('organizationId') organizationId: string,
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(
      organizationId,
      currentUser.sub,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('invitations/accept')
  accept(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.invitationsService.accept(
      currentUser,
      dto,
    );
  }
}