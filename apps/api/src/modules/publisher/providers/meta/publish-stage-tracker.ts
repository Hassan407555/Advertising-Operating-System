import { Logger } from '@nestjs/common';

import { PublishEntityType } from '../../enums/publisher.enums';
import {
  publishStageErrorCode,
  type PublishDiagnostics,
  type PublishStage,
  type PublishStageLog,
} from '../../types/publish-diagnostics.types';
import {
  extractMetaGraphError,
  formatMetaErrorMessage,
  isMetaErrorRetryable,
  type MetaGraphErrorDetails,
} from './meta-graph.error';

/**
 * Collects per-stage timing + Meta errors during a publish run.
 * Does not alter publish sequencing — diagnostics only.
 */
export class PublishStageTracker {
  readonly stages: PublishStageLog[] = [];
  private readonly logger: Logger;

  constructor(loggerContext = 'PublishStageTracker') {
    this.logger = new Logger(loggerContext);
  }

  async run<T>(
    stage: PublishStage,
    options: {
      entityType?: PublishEntityType;
      entityId?: string;
      message?: string;
    },
    fn: () => Promise<T>,
  ): Promise<T> {
    const startedAt = new Date();
    const entry: PublishStageLog = {
      stage,
      status: 'started',
      startedAt: startedAt.toISOString(),
      entityType: options.entityType,
      entityId: options.entityId,
      message: options.message,
    };
    this.stages.push(entry);

    this.logger.log(
      `[publish] stage=${stage} status=started entityType=${options.entityType ?? 'n/a'} entityId=${options.entityId ?? 'n/a'}`,
    );

    try {
      const result = await fn();
      const completedAt = new Date();
      entry.status = 'succeeded';
      entry.completedAt = completedAt.toISOString();
      entry.durationMs = completedAt.getTime() - startedAt.getTime();

      this.logger.log(
        `[publish] stage=${stage} status=succeeded durationMs=${entry.durationMs}`,
      );

      return result;
    } catch (error) {
      const completedAt = new Date();
      const metaError = extractMetaGraphError(error);
      entry.status = 'failed';
      entry.completedAt = completedAt.toISOString();
      entry.durationMs = completedAt.getTime() - startedAt.getTime();
      entry.metaError = metaError ?? undefined;
      entry.message =
        metaError != null
          ? formatMetaErrorMessage(metaError)
          : error instanceof Error
            ? error.message
            : 'Publish stage failed.';

      this.logger.error(
        `[publish] stage=${stage} status=failed durationMs=${entry.durationMs} message=${entry.message}` +
          (metaError
            ? ` httpStatus=${metaError.httpStatus} code=${metaError.code ?? 'n/a'} fbtrace_id=${metaError.fbtraceId ?? 'n/a'} raw=${JSON.stringify(metaError.raw ?? null)}`
            : ''),
      );

      throw error;
    }
  }

  /** Record a non-API diagnostic step (e.g. image URL attached without Meta upload). */
  mark(
    stage: PublishStage,
    status: 'succeeded' | 'skipped' | 'failed',
    options: {
      entityType?: PublishEntityType;
      entityId?: string;
      message?: string;
      metaError?: MetaGraphErrorDetails;
      durationMs?: number;
    } = {},
  ): void {
    const now = new Date();
    const durationMs = options.durationMs ?? 0;
    this.stages.push({
      stage,
      status,
      startedAt: new Date(now.getTime() - durationMs).toISOString(),
      completedAt: now.toISOString(),
      durationMs,
      entityType: options.entityType,
      entityId: options.entityId,
      message: options.message,
      metaError: options.metaError,
    });

    this.logger.log(
      `[publish] stage=${stage} status=${status} message=${options.message ?? ''}`,
    );
  }

  buildDiagnostics(params: {
    success: boolean;
    fallbackMessage?: string;
    error?: unknown;
  }): PublishDiagnostics {
    const failedStage = [...this.stages]
      .reverse()
      .find((stage) => stage.status === 'failed');
    const lastStage = this.stages[this.stages.length - 1];
    const stage = failedStage?.stage ?? lastStage?.stage;
    const metaError =
      failedStage?.metaError ??
      extractMetaGraphError(params.error) ??
      undefined;

    const errorMessage =
      failedStage?.message ??
      (metaError ? formatMetaErrorMessage(metaError) : undefined) ??
      (params.error instanceof Error ? params.error.message : undefined) ??
      params.fallbackMessage;

    const errorCode = stage
      ? publishStageErrorCode(stage)
      : params.success
        ? undefined
        : 'META_PUBLISH_FAILED';

    return {
      success: params.success,
      stage,
      errorCode: params.success ? undefined : errorCode,
      errorMessage: params.success ? undefined : errorMessage,
      metaTraceId: metaError?.fbtraceId,
      httpStatus: metaError?.httpStatus,
      graphErrorCode: metaError?.code,
      graphErrorSubcode: metaError?.errorSubcode,
      retryable: params.success
        ? undefined
        : isMetaErrorRetryable(metaError ?? null),
      stages: this.stages,
    };
  }
}
