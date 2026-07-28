import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { AutomationActionType } from '@prisma/client';

import { AutomationActionHandler } from '../interfaces/automation-action-handler.interface';

@Injectable()
export class AutomationActionRegistry {
  private readonly handlers = new Map<
    AutomationActionType,
    AutomationActionHandler
  >();

  register(handler: AutomationActionHandler): void {
    this.handlers.set(handler.type, handler);
  }

  hasHandler(type: AutomationActionType): boolean {
    return this.handlers.has(type);
  }

  getHandler(
    type: AutomationActionType,
  ): AutomationActionHandler {
    const handler = this.handlers.get(type);

    if (!handler) {
      throw new BadRequestException(
        `Handler not registered for automation action: ${type}`,
      );
    }

    return handler;
  }

  assertSupportedActions(
    actions: Array<{ type: AutomationActionType }>,
  ): void {
    const unsupported = actions
      .map((action) => action.type)
      .filter((type) => !this.hasHandler(type));

    if (unsupported.length > 0) {
      throw new BadRequestException(
        `Unsupported automation action(s): ${[...new Set(unsupported)].join(', ')}`,
      );
    }
  }
}
