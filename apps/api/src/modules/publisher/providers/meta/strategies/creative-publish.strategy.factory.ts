import { CreativeType } from '@prisma/client';

import type { MetaCreativePublishStrategy } from './creative-publish.strategy';
import { ImageOrTextCreativePublishStrategy } from './image-or-text-creative.publish.strategy';
import { NoneCreativePublishStrategy } from './none-creative.publish.strategy';
import { VideoCreativePublishStrategy } from './video-creative.publish.strategy';

/**
 * Factory for Meta V1 creative publish strategies.
 * IMAGE / TEXT / VIDEO keep existing behavior; NONE adds deferred-creative support.
 */
export class MetaCreativePublishStrategyFactory {
  private readonly strategies: Map<CreativeType, MetaCreativePublishStrategy>;

  constructor() {
    this.strategies = new Map<CreativeType, MetaCreativePublishStrategy>([
      [CreativeType.IMAGE, new ImageOrTextCreativePublishStrategy(CreativeType.IMAGE)],
      [CreativeType.TEXT, new ImageOrTextCreativePublishStrategy(CreativeType.TEXT)],
      [CreativeType.VIDEO, new VideoCreativePublishStrategy()],
      [CreativeType.NONE, new NoneCreativePublishStrategy()],
    ]);
  }

  get(type: CreativeType): MetaCreativePublishStrategy | null {
    return this.strategies.get(type) ?? null;
  }

  supports(type: CreativeType): boolean {
    return this.strategies.has(type);
  }
}
