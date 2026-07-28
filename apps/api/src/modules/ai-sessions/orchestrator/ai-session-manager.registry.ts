import { Injectable, OnModuleInit } from '@nestjs/common';

import type { AiSessionManager } from '../managers/ai-session-manager.interface';
import { ConversationManager } from '../managers/conversation.manager';

@Injectable()
export class AiSessionManagerRegistry implements OnModuleInit {
  private readonly managers = new Map<string, AiSessionManager>();

  constructor(private readonly conversationManager: ConversationManager) {}

  onModuleInit(): void {
    this.register(this.conversationManager);
  }

  register(manager: AiSessionManager): void {
    this.managers.set(manager.name, manager);
  }

  get(name: string): AiSessionManager | undefined {
    return this.managers.get(name);
  }

  require(name: string): AiSessionManager {
    const manager = this.get(name);
    if (!manager) {
      throw new Error(`AI session manager "${name}" is not registered.`);
    }
    return manager;
  }

  list(): AiSessionManager[] {
    return [...this.managers.values()];
  }
}
