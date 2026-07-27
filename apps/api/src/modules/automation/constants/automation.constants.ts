export const AUTOMATION_DEFAULT_PAGE = 1;
export const AUTOMATION_DEFAULT_LIMIT = 20;
export const AUTOMATION_DEFAULT_SORT_BY = 'createdAt';
export const AUTOMATION_DEFAULT_SORT_ORDER = 'desc';

export const AUTOMATION_PIPELINE_SORT_FIELDS = [
  'name',
  'triggerType',
  'isEnabled',
  'createdAt',
  'updatedAt',
] as const;

export const AUTOMATION_RUN_SORT_FIELDS = [
  'status',
  'triggerType',
  'startedAt',
  'completedAt',
  'createdAt',
  'updatedAt',
] as const;

export type AutomationPipelineSortField =
  (typeof AUTOMATION_PIPELINE_SORT_FIELDS)[number];

export type AutomationRunSortField =
  (typeof AUTOMATION_RUN_SORT_FIELDS)[number];
