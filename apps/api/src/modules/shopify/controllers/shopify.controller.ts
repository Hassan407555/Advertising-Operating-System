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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ShopifyService } from '../services/shopify.service';

import { ConnectShopifyDto } from '../dto/connect-shopify.dto';
import { ShopifyStoreResponseDto } from '../dto/shopify-store-response.dto';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ShopifyProductsService } from '../services/shopify-products.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('Shopify')
@ApiBearerAuth()
@Controller('shopify')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShopifyController {
  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly shopifyProductsService: ShopifyProductsService,
  ) {}

  @Post('connect')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Connect Shopify store',
  })
  connect(
    @Body() dto: ConnectShopifyDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.shopifyService.connect(
      dto,
      currentUser,
    );
  }

  @Get('callback')
  @ApiOperation({
    summary: 'Shopify OAuth callback',
  })
  @ApiResponse({
    status: 200,
    type: ShopifyStoreResponseDto,
  })
  callback(
    @Query('code') code: string,
    @Query('shop') shop: string,
    @Query('state') state: string,
  ) {
    return this.shopifyService.callback(
      code,
      shop,
      state,
    );
  }

  @Get('store')
@Roles('OWNER', 'ADMIN', 'MEMBER')
@ApiOperation({
  summary: 'Get connected Shopify store',
})
@ApiResponse({
  status: 200,
  type: ShopifyStoreResponseDto,
})
getStore(
  @CurrentUser() currentUser: JwtPayload,
) {
  return this.shopifyService.getStore(
    currentUser,
  );
}
    @Delete('disconnect')
@Roles('OWNER', 'ADMIN')
@ApiOperation({
  summary: 'Disconnect Shopify store',
})
disconnect(
  @CurrentUser() currentUser: JwtPayload,
): Promise<void> {
  return this.shopifyService.disconnect(
    currentUser,
  );
}

@Post('products/sync')
@Roles('OWNER', 'ADMIN')
@ApiOperation({
  summary: 'Sync Shopify products',
})
syncProducts(
  @CurrentUser() currentUser: JwtPayload,
) {
  return this.shopifyProductsService.syncProducts(
    currentUser,
  );
}
}