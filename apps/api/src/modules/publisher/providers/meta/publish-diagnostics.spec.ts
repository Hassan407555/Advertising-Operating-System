import {
  formatMetaErrorMessage,
  isMetaErrorRetryable,
  MetaGraphApiException,
  type MetaGraphErrorDetails,
} from './meta-graph.error';
import { PublishStageTracker } from './publish-stage-tracker';

describe('MetaGraphApiException', () => {
  it('preserves Graph error fields', () => {
    const details: MetaGraphErrorDetails = {
      message: 'Invalid Page ID',
      httpStatus: 400,
      code: 100,
      errorSubcode: 33,
      type: 'OAuthException',
      fbtraceId: 'AbCdEf',
      path: 'act_1/campaigns',
      raw: { error: { message: 'Invalid Page ID', code: 100 } },
    };

    const error = new MetaGraphApiException(details);

    expect(error.graph).toEqual(details);
    expect(error.message).toBe('(#100) Invalid Page ID');
    expect(formatMetaErrorMessage(details)).toBe('(#100) Invalid Page ID');
    expect(isMetaErrorRetryable(details)).toBe(false);
  });
});

describe('PublishStageTracker', () => {
  it('records stage timing and builds structured diagnostics on failure', async () => {
    const tracker = new PublishStageTracker('test');

    await tracker.run('campaign', {}, async () => 'camp_1');

    await expect(
      tracker.run('video_upload', {}, async () => {
        throw new MetaGraphApiException({
          message: 'Video URL is not publicly accessible.',
          httpStatus: 400,
          code: 100,
          fbtraceId: 'trace_1',
          path: 'act_1/advideos',
        });
      }),
    ).rejects.toBeInstanceOf(MetaGraphApiException);

    const diagnostics = tracker.buildDiagnostics({ success: false });

    expect(diagnostics.success).toBe(false);
    expect(diagnostics.stage).toBe('video_upload');
    expect(diagnostics.errorCode).toBe('META_VIDEO_UPLOAD_FAILED');
    expect(diagnostics.errorMessage).toContain('Video URL is not publicly accessible');
    expect(diagnostics.metaTraceId).toBe('trace_1');
    expect(diagnostics.httpStatus).toBe(400);
    expect(diagnostics.graphErrorCode).toBe(100);
    expect(diagnostics.stages).toHaveLength(2);
    expect(diagnostics.stages[0]?.status).toBe('succeeded');
    expect(diagnostics.stages[1]?.status).toBe('failed');
  });
});
