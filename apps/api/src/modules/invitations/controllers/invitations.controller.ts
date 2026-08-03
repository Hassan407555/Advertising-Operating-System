import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { CreateInvitationDto } from '../dto/create-invitation.dto';
import { InvitationsService } from '../services/invitations.service';

@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @Get('organizations/:organizationId/invitations')
  list(
    @Param('organizationId') organizationId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.invitationsService.list(organizationId, currentUser.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @Post('organizations/:organizationId/invitations/:invitationId/resend')
  resend(
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.invitationsService.resend(
      organizationId,
      currentUser.sub,
      invitationId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @Post('organizations/:organizationId/invitations/:invitationId/link')
  regenerateLink(
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.invitationsService.regenerateLink(
      organizationId,
      currentUser.sub,
      invitationId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @Post('organizations/:organizationId/invitations/:invitationId/revoke')
  revoke(
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.invitationsService.revoke(
      organizationId,
      currentUser.sub,
      invitationId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @Delete('organizations/:organizationId/invitations/:invitationId')
  remove(
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.invitationsService.remove(
      organizationId,
      currentUser.sub,
      invitationId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('invitations/accept')
  accept(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.invitationsService.accept(currentUser, dto);
  }
}
