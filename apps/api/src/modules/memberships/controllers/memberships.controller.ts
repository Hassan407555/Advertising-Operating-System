import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { UpdateMembershipRoleDto } from '../dto/update-membership-role.dto';
import { MembershipsService } from '../services/memberships.service';

@Controller('memberships')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.membershipsService.findAll(user);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.membershipsService.findOne(user, id);
  }

  @Roles(MembershipRole.OWNER)
  @Patch(':id/role')
  async updateRole(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMembershipRoleDto,
  ) {
    return this.membershipsService.updateRole(user, id, dto);
  }

  @Roles(MembershipRole.OWNER)
  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.membershipsService.remove(user, id);
  }
}
