import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { ShopifyService } from '../services/shopify.service';
import { ConnectShopifyDto } from '../dto/connect-shopify.dto';
import { ShopifyCallbackDto } from '../dto/shopify-callback.dto';

@ApiTags('Shopify')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shopify')
export class ShopifyController {
  constructor(
    private readonly shopifyService: ShopifyService,
  ) {}

  @Post('connect')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Generate Shopify OAuth URL',
  })
  async connect(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: ConnectShopifyDto,
  ) {
    return this.shopifyService.connect(
      currentUser,
      dto.shopDomain,
    );
  }

  @Get('callback')
  @Public()
  @ApiOperation({
    summary: 'Handle Shopify OAuth callback and redirect to app',
  })
  async callback(
    @Query() dto: ShopifyCallbackDto,
    @Res() res: Response,
  ): Promise<void> {
    const redirectUrl = await this.shopifyService.callback(
      dto.code,
      dto.shop,
      dto.state,
      dto.hmac,
      {
        code: dto.code,
        shop: dto.shop,
        state: dto.state,
        host: dto.host,
        timestamp: dto.timestamp,
        hmac: dto.hmac,
      },
    );
    res.redirect(redirectUrl);
  }

  @Get('store')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({
    summary: 'Get connected Shopify store',
  })
  async getStore(
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.shopifyService.getStore(
      currentUser,
    );
  }

  @Post('sync')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Synchronize Shopify products',
  })
  async syncProducts(
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.shopifyService.syncProducts(
      currentUser,
    );
  }

  @Delete('disconnect')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Disconnect Shopify store',
  })
  async disconnect(
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.shopifyService.disconnect(
      currentUser,
    );
  }
}
