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

import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationsService } from '../services/organizations.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('current')
  @Roles(MembershipRole.VIEWER)
  async getCurrent(@CurrentUser() user: JwtPayload) {
    return this.organizationsService.getCurrent(user);
  }

  @Patch('current')
  @Roles(MembershipRole.OWNER)
  async updateCurrent(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.updateCurrent(user, dto);
  }

  @Get('members')
  @Roles(MembershipRole.VIEWER)
  async listMembers(@CurrentUser() user: JwtPayload) {
    return this.organizationsService.listMembers(user);
  }

  @Patch('members/:membershipId/role')
  @Roles(MembershipRole.ADMIN)
  async updateMemberRole(
    @CurrentUser() user: JwtPayload,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.organizationsService.updateMemberRole(user, membershipId, dto);
  }

  @Delete('members/:membershipId')
  @Roles(MembershipRole.ADMIN)
  async removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('membershipId') membershipId: string,
  ) {
    return this.organizationsService.removeMember(user, membershipId);
  }
}
