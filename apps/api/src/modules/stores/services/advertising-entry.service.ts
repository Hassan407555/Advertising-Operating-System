import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { AiSessionSource, ShopifyProductStatus } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import type { AiSessionResponseDto } from '../../ai-sessions/dto/ai-session.dto';
import { AiSessionsService } from '../../ai-sessions/services/ai-sessions.service';
import { getGenerationBlockingReasons } from '../utils/store-readiness.util';
import { StoresService } from './stores.service';

@Injectable()
export class AdvertisingEntryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
    @Inject(forwardRef(() => AiSessionsService))
    private readonly aiSessionsService: AiSessionsService,
  ) {}

  /**
   * Starts or resumes AI campaign work for a store product.
   * Products UI must call this — never create AI sessions directly.
   * Meta Advertising Configuration is not required (publish-only).
   */
  async startOrResume(
    storeId: string,
    productId: string,
    currentUser: JwtPayload,
  ): Promise<AiSessionResponseDto> {
    const store = await this.storesService.getStore(storeId, currentUser);

    const generationReasons = getGenerationBlockingReasons({
      shopifyConnected: store.capabilities.shopifyConnected,
      metaConnected: store.capabilities.metaConnected,
      productsSynced: store.capabilities.productsSynced,
      productCount: store.capabilities.productCount,
      lastSyncAt: store.capabilities.lastSyncAt,
      adAccountSelected: store.capabilities.adAccountSelected,
      businessManagerSelected: store.capabilities.businessManagerSelected,
      facebookPageSelected: store.capabilities.facebookPageSelected,
      instagramSelected: store.capabilities.instagramSelected,
      pixelSelected: store.capabilities.pixelSelected,
      catalogSelected: store.capabilities.catalogSelected,
    });

    if (generationReasons.length > 0) {
      throw new BadRequestException(
        `Store must have Shopify connected and products synced before starting AI campaign work.${
          generationReasons.length > 0
            ? ` ${generationReasons.join('; ')}.`
            : ''
        }`,
      );
    }

    const product = await this.prisma.shopifyProduct.findFirst({
      where: {
        id: productId,
        organizationId: currentUser.organizationId,
        platformConnectionId: storeId,
        deletedAt: null,
      },
      select: { id: true, status: true },
    });

    if (!product) {
      throw new NotFoundException(
        'Product was not found for this store and organization.',
      );
    }

    if (product.status !== ShopifyProductStatus.ACTIVE) {
      throw new BadRequestException(
        'Only ACTIVE products can be advertised.',
      );
    }

    const existingId = await this.aiSessionsService.findActiveSessionId({
      organizationId: currentUser.organizationId,
      storeId,
      productId,
    });

    if (existingId) {
      // Resume path preserves original sessionSource on the session record.
      const resumed = await this.aiSessionsService.resume(existingId, currentUser);
      return { ...resumed, reusedExisting: true };
    }

    return this.aiSessionsService.create(
      {
        storeId,
        productId,
        sessionSource: AiSessionSource.PRODUCT_PAGE,
      },
      currentUser,
    );
  }
}
