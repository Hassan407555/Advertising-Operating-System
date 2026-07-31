import {
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  Res,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { MetaService } from '../services/meta.service';
import {
  ConnectMetaDto,
  MetaAdAccountsQueryDto,
  MetaCatalogsQueryDto,
  MetaInstagramAccountsQueryDto,
  MetaPixelsQueryDto,
} from '../dto/meta.dto';

@ApiTags('Meta')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('meta')
export class MetaController {
  private readonly logger = new Logger(MetaController.name);

  constructor(private readonly metaService: MetaService) {}

  @Post('connect')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Generate Meta OAuth authorization URL' })
  async connect(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: ConnectMetaDto,
  ) {
    return this.metaService.connect(currentUser, dto.storeId);
  }

  @Get('callback')
  @Public()
  @ApiOperation({ summary: 'Handle Meta OAuth callback and redirect to app' })
  async callback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Read raw query strings — avoid ValidationPipe forbidNonWhitelisted
    // rejecting Facebook's optional extra callback params before persistence.
    const queryKeys = Object.keys(req.query);
    const code = firstQueryValue(req.query.code);
    const state = firstQueryValue(req.query.state);
    const accessTokenCookie = readCookie(req, 'aos.access-token');

    this.logger.log({
      msg: 'meta.oauth.callback.controller_entered',
      file: 'meta.controller.ts',
      function: 'MetaController.callback',
      queryKeys,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasAccessCookie: Boolean(accessTokenCookie),
      originalUrlHasState: Boolean(
        typeof req.originalUrl === 'string' &&
          /[?&]state=/i.test(req.originalUrl),
      ),
    });

    const redirectUrl = await this.metaService.callback({
      code,
      state,
      error: firstQueryValue(req.query.error),
      errorReason: firstQueryValue(req.query.error_reason),
      errorDescription: firstQueryValue(req.query.error_description),
      queryKeys,
      accessTokenCookie,
    });
    res.redirect(redirectUrl);
  }

  @Get('connection/status')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Get connected Meta account status' })
  async getConnectionStatus(@CurrentUser() currentUser: JwtPayload) {
    return this.metaService.getConnection(currentUser);
  }

  @Get('businesses')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'List Meta businesses for the connected account' })
  async listBusinesses(@CurrentUser() currentUser: JwtPayload) {
    return this.metaService.listBusinesses(currentUser);
  }

  @Get('ad-accounts')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({
    summary:
      'List Meta ad accounts (optionally filtered by business) and sync locally',
  })
  async listAdAccounts(
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: MetaAdAccountsQueryDto,
  ) {
    return this.metaService.listAdAccounts(currentUser, query.businessId);
  }

  @Get('pages')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'List Facebook Pages for the connected account' })
  async listPages(@CurrentUser() currentUser: JwtPayload) {
    return this.metaService.listPages(currentUser);
  }

  @Get('instagram-accounts')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({
    summary:
      'List Instagram accounts linked to a Page (or all Pages when pageId is omitted)',
  })
  async listInstagramAccounts(
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: MetaInstagramAccountsQueryDto,
  ) {
    return this.metaService.listInstagramAccounts(currentUser, query.pageId);
  }

  @Get('pixels')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({
    summary: 'List Meta pixels for a business and/or ad account',
  })
  async listPixels(
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: MetaPixelsQueryDto,
  ) {
    return this.metaService.listPixels(currentUser, {
      businessId: query.businessId,
      adAccountId: query.adAccountId,
    });
  }

  @Get('catalogs')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({
    summary: 'List product catalogs for a Meta business (or all businesses)',
  })
  async listCatalogs(
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: MetaCatalogsQueryDto,
  ) {
    return this.metaService.listCatalogs(currentUser, query.businessId);
  }

  @Delete('disconnect')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Disconnect Meta account' })
  async disconnect(@CurrentUser() currentUser: JwtPayload) {
    await this.metaService.disconnect(currentUser);
    return { disconnected: true };
  }
}

function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value.find(
      (entry): entry is string => typeof entry === 'string' && entry.length > 0,
    );
    return first;
  }

  return undefined;
}

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) {
    return undefined;
  }

  for (const part of raw.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (key !== name) {
      continue;
    }
    const value = trimmed.slice(eq + 1).trim();
    return value.length > 0 ? decodeURIComponent(value) : undefined;
  }

  return undefined;
}
