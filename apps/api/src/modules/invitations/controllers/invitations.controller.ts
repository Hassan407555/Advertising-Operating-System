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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { CreateInvitationDto } from '../dto/create-invitation.dto';
import { InvitationsService } from '../services/invitations.service';

@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invitationsService.findAll(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.invitationsService.remove(user, id);
  }

  @Post('accept')
  async accept(
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.invitationsService.accept(dto);
  }
}