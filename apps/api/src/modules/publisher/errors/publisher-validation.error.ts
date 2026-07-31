import { BadRequestException } from '@nestjs/common';

import type { PublishValidationIssue } from '../providers/interfaces/publisher-provider.interface';

export interface PublisherValidationErrorBody {
  title: string;
  message: string;
  validationCode: string;
  platform?: string;
  issues?: PublishValidationIssue[];
}

/**
 * Business validation failure for the publisher gateway.
 * Prefer this over raw Meta Graph errors when a pre-publish check fails.
 */
export class PublisherValidationError extends BadRequestException {
  readonly title: string;
  readonly validationCode: string;

  constructor(body: PublisherValidationErrorBody) {
    const issues: PublishValidationIssue[] =
      body.issues ??
      [
        {
          code: body.validationCode,
          message: body.message,
        },
      ];

    super({
      message: body.message,
      title: body.title,
      validationCode: body.validationCode,
      ...(body.platform ? { platform: body.platform } : {}),
      issues,
    });

    this.title = body.title;
    this.validationCode = body.validationCode;
  }
}
