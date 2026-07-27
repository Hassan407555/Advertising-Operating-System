import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { ShopifyService } from '../services/shopify.service';
import { Public } from '../../auth/decorators/public.decorator';
import { ConnectShopifyDto } from '../dto/connect-shopify.dto';
import { ShopifyCallbackDto } from '../dto/shopify-callback.dto';

@ApiTags('Shopify')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shopify')
export class ShopifyController {
  constructor(
    private readonly shopifyService: ShopifyService,
  ) {}

  @Post('connect')
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
  summary: 'Handle Shopify OAuth callback',
})
@Public()
async callback(
  @Query() dto: ShopifyCallbackDto,
) {
  return this.shopifyService.callback(
    dto.code,
    dto.shop,
    dto.state,
  );
}
@Get('store')
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