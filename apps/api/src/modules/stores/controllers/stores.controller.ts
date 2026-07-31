import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import {
  ListStoreProductsQueryDto,
  StartAdvertisingEntryDto,
  UpsertStoreAdvertisingConfigurationDto,
} from '../dto/store.dto';
import { AdvertisingEntryService } from '../services/advertising-entry.service';
import { StoresService } from '../services/stores.service';

@ApiTags('Stores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stores')
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
    private readonly advertisingEntryService: AdvertisingEntryService,
  ) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  @ApiOperation({ summary: 'List Shopify stores with computed readiness and health' })
  listStores(@CurrentUser() currentUser: JwtPayload) {
    return this.storesService.listStores(currentUser);
  }

  @Get(':storeId')
  @Roles('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  @ApiOperation({ summary: 'Get store summary with computed readiness and health' })
  getStore(
    @Param('storeId') storeId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.storesService.getStore(storeId, currentUser);
  }

  @Get(':storeId/products')
  @Roles('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  @ApiOperation({
    summary:
      'List products for a store with advertising eligibility and active session hints',
  })
  listProducts(
    @Param('storeId') storeId: string,
    @Query() query: ListStoreProductsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.storesService.listProducts(storeId, query, currentUser);
  }

  @Get(':storeId/products/:productId')
  @Roles('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  @ApiOperation({
    summary:
      'Get a single store product with variants, images, and pricing details',
  })
  getProduct(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.storesService.getProduct(storeId, productId, currentUser);
  }

  @Post(':storeId/advertising-entry')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({
    summary:
      'Start or resume AI Campaign Entry for a product (Advertise / Resume AI Campaign)',
  })
  startAdvertisingEntry(
    @Param('storeId') storeId: string,
    @Body() dto: StartAdvertisingEntryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.advertisingEntryService.startOrResume(
      storeId,
      dto.productId,
      currentUser,
    );
  }

  @Get(':storeId/advertising-configuration')
  @Roles('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  @ApiOperation({ summary: 'Get Advertising Configuration for a store' })
  getAdvertisingConfiguration(
    @Param('storeId') storeId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.storesService.getAdvertisingConfiguration(storeId, currentUser);
  }

  @Put(':storeId/advertising-configuration')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Upsert Advertising Configuration (Meta resource IDs only)',
  })
  upsertAdvertisingConfiguration(
    @Param('storeId') storeId: string,
    @Body() dto: UpsertStoreAdvertisingConfigurationDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.storesService.upsertAdvertisingConfiguration(
      storeId,
      dto,
      currentUser,
    );
  }
}
