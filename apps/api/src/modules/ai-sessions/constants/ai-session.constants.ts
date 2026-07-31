export const AI_SESSION_WORKFLOW_VERSION = 'ai-session.v1';
export const AI_SESSION_DEFINITION_ID = 'advertise-product';
export const CONVERSATION_MANAGER = 'conversationManager';
export const CONVERSATION_PROMPT_VERSION = 'conversation.v1';
export const META_CAMPAIGN_GENERATOR_PROMPT_VERSION = 'meta-campaign-generator.v2';
export const SAVE_DRAFT_MANAGER = 'saveDraftCampaign';
export const SAVE_DRAFT_PHASE = 'DRAFT_SAVED';

export const ACTIVE_AI_SESSION_STATUSES = [
  'CREATED',
  'AWAITING_INPUT',
  'INTERVIEWING',
  'READY_FOR_ANALYSIS',
  'ANALYZING',
  'PLANNING',
  'BUILDING',
  'REVIEWING',
  'AWAITING_APPROVAL',
] as const;

export type InterviewStepKey =
  | 'country'
  | 'language'
  | 'dailyBudget'
  | 'objective'
  | 'adType'
  | 'carouselCardCount'
  | 'carouselHighlightProducts'
  | 'videoDuration'
  | 'videoStyle'
  | 'videoTone';

export interface InterviewStepDefinition {
  key: InterviewStepKey;
  prompt: string;
  required: boolean;
}

export const BASE_INTERVIEW_STEPS: InterviewStepDefinition[] = [
  { key: 'country', prompt: 'Which target country should this campaign focus on?', required: true },
  { key: 'language', prompt: 'What language should the ads use?', required: true },
  { key: 'dailyBudget', prompt: 'What daily budget should we use? (number)', required: true },
  { key: 'objective', prompt: 'What is the campaign objective? (e.g. CONVERSIONS, TRAFFIC, AWARENESS)', required: true },
  {
    key: 'adType',
    prompt:
      'What type of ad would you like to create?\n\n• IMAGE\n• VIDEO\n• CAROUSEL\n• NONE',
    required: true,
  },
];

export const CAROUSEL_STEPS: InterviewStepDefinition[] = [
  { key: 'carouselCardCount', prompt: 'How many carousel cards should we use?', required: true },
  {
    key: 'carouselHighlightProducts',
    prompt: 'Should we highlight multiple products in the carousel? (yes/no)',
    required: true,
  },
];

export const VIDEO_STEPS: InterviewStepDefinition[] = [
  { key: 'videoDuration', prompt: 'Preferred video duration? (e.g. 15s, 30s)', required: true },
  { key: 'videoStyle', prompt: 'What video style should we use?', required: true },
  { key: 'videoTone', prompt: 'What tone should the video use?', required: true },
];
