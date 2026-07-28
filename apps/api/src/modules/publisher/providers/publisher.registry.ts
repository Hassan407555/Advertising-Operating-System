import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';

import { PublisherPlatform } from '../enums/publisher.enums';
import type { PublisherProvider } from './interfaces/publisher-provider.interface';

@Injectable()
export class PublisherRegistry implements OnModuleInit {
  private readonly providers = new Map<
    PublisherPlatform,
    PublisherProvider
  >();

  onModuleInit(): void {
    // Providers self-register when implemented, e.g.:
    // this.register(this.metaPublisherProvider);
    // this.register(this.tiktokPublisherProvider);
  }

  register(provider: PublisherProvider): void {
    this.providers.set(provider.platform, provider);
  }

  get(platform: PublisherPlatform): PublisherProvider {
    const provider = this.providers.get(platform);

    if (!provider) {
      throw new BadRequestException(
        `Publisher provider is not registered for platform: ${platform}`,
      );
    }

    return provider;
  }

  has(platform: PublisherPlatform): boolean {
    return this.providers.has(platform);
  }

  listRegistered(): PublisherPlatform[] {
    return [...this.providers.keys()];
  }
}
