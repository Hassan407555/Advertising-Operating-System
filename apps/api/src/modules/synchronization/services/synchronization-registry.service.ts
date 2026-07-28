import { Injectable, BadRequestException } from '@nestjs/common';

import { SynchronizationPlatform } from '../enums/synchronization.enums';
import type { SynchronizationProvider } from '../providers/interfaces/synchronization-provider.interface';

@Injectable()
export class SynchronizationRegistryService {
  private readonly providers = new Map<
    SynchronizationPlatform,
    SynchronizationProvider
  >();

  register(provider: SynchronizationProvider): void {
    this.providers.set(provider.platform, provider);
  }

  get(platform: SynchronizationPlatform): SynchronizationProvider {
    const provider = this.providers.get(platform);

    if (!provider) {
      throw new BadRequestException(
        `Synchronization provider is not registered for platform: ${platform}`,
      );
    }

    return provider;
  }

  has(platform: SynchronizationPlatform): boolean {
    return this.providers.has(platform);
  }

  listRegistered(): SynchronizationPlatform[] {
    return [...this.providers.keys()];
  }
}
