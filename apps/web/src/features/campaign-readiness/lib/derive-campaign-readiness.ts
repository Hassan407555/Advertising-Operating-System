import {
  CAMPAIGN_READINESS_NEXT_MESSAGES,
  CAMPAIGN_READINESS_NEXT_TITLES,
  CAMPAIGN_READINESS_PRIMARY_ACTIONS,
  CAMPAIGN_READINESS_STEP_LABELS,
  OPTIONAL_READINESS_STEP_IDS,
  OPTIONAL_STEP_ACTION_LABELS,
  REQUIRED_READINESS_STEP_IDS,
  REQUIRED_STEP_ACTIONS,
  isMetaSetupStepId,
} from "@/features/campaign-readiness/constants/campaign-readiness.constants";
import type {
  CampaignReadinessChecklistItem,
  CampaignReadinessModel,
  CampaignReadinessNextAction,
  CampaignReadinessPrimaryAction,
  CampaignReadinessState,
  CampaignReadinessCurrentStep,
  CampaignReadinessStep,
  CampaignReadinessStepStatus,
  DeriveCampaignReadinessInput,
} from "@/features/campaign-readiness/types/campaign-readiness.types";
import { buildAdvertisingSetupHref, buildCampaignChecklistReturnPath, buildJourneyHref } from "@/lib/navigation/journey-return";
import { ROUTES } from "@/constants/routes";

function clampPercent(completed: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

function withAdvertisingHref(
  action: CampaignReadinessPrimaryAction,
  returnPath: string,
): CampaignReadinessPrimaryAction {
  return {
    ...action,
    href: buildAdvertisingSetupHref(returnPath),
  };
}

function resolveStepHref(
  stepId: CampaignReadinessStep,
  returnPath: string | null,
  baseAction?: CampaignReadinessPrimaryAction,
): string | undefined {
  if (!returnPath) {
    if (isMetaSetupStepId(stepId)) {
      return buildAdvertisingSetupHref();
    }
    return baseAction?.href;
  }

  if (isMetaSetupStepId(stepId)) {
    return buildAdvertisingSetupHref(returnPath);
  }

  if (!baseAction?.href) {
    return undefined;
  }

  return buildJourneyHref(baseAction.href, returnPath);
}

function buildNextAction(params: {
  ready: boolean;
  currentStep: CampaignReadinessCurrentStep;
  primaryAction: CampaignReadinessPrimaryAction;
}): CampaignReadinessNextAction {
  return {
    ready: params.ready,
    currentStep: params.currentStep,
    nextAction: CAMPAIGN_READINESS_NEXT_TITLES[params.currentStep],
    message: CAMPAIGN_READINESS_NEXT_MESSAGES[params.currentStep],
    actionUrl: params.primaryAction.href,
    actionLabel: params.primaryAction.label,
    actionId: params.primaryAction.id,
    action: params.primaryAction.action,
  };
}

/**
 * Single source of truth for campaign publishing readiness.
 * Evaluates prerequisites in order and exposes checklist rows + next action.
 */
export function deriveCampaignReadiness(input: DeriveCampaignReadinessInput): CampaignReadinessModel {
  const caps = input.capabilities;
  const draftSaved = input.hasDraftSaved ?? Boolean(input.campaignId);

  const flags = {
    shopifyConnected: Boolean(caps?.shopifyConnected),
    productsSynced: Boolean(caps?.productsSynced && (caps?.productCount ?? 0) > 0),
    aiCampaignGenerated: Boolean(input.hasCampaignGenerated),
    metaConnected: Boolean(caps?.metaConnected),
    businessSelected: Boolean(caps?.businessManagerSelected),
    adAccountSelected: Boolean(caps?.adAccountSelected),
    facebookPageSelected: Boolean(caps?.facebookPageSelected),
    draftSaved: Boolean(draftSaved),
    metaAdvertisingConfigured: false,
    instagramSelected: Boolean(caps?.instagramSelected),
    pixelSelected: Boolean(caps?.pixelSelected),
    catalogSelected: Boolean(caps?.catalogSelected),
    readyToPublish: false,
    live: Boolean(input.isLive),
  };

  flags.metaAdvertisingConfigured = Boolean(
    flags.metaConnected &&
      flags.businessSelected &&
      flags.adAccountSelected &&
      flags.facebookPageSelected,
  );

  flags.readyToPublish = Boolean(
    flags.shopifyConnected &&
      flags.productsSynced &&
      flags.aiCampaignGenerated &&
      flags.metaAdvertisingConfigured &&
      flags.draftSaved,
  );

  const campaignDetailsHref = input.campaignId
    ? ROUTES.CAMPAIGN_DETAILS(input.campaignId)
    : ROUTES.CAMPAIGNS;
  const returnPath = input.campaignId
    ? buildCampaignChecklistReturnPath(input.campaignId)
    : null;

  const steps: CampaignReadinessStepStatus[] = [
    { id: "shopify", label: CAMPAIGN_READINESS_STEP_LABELS.shopify, done: flags.shopifyConnected, required: true },
    { id: "products", label: CAMPAIGN_READINESS_STEP_LABELS.products, done: flags.productsSynced, required: true },
    { id: "aiCampaign", label: CAMPAIGN_READINESS_STEP_LABELS.aiCampaign, done: flags.aiCampaignGenerated, required: true },
    { id: "metaConnected", label: CAMPAIGN_READINESS_STEP_LABELS.metaConnected, done: flags.metaConnected, required: true },
    { id: "businessSelected", label: CAMPAIGN_READINESS_STEP_LABELS.businessSelected, done: flags.businessSelected, required: true },
    { id: "adAccountSelected", label: CAMPAIGN_READINESS_STEP_LABELS.adAccountSelected, done: flags.adAccountSelected, required: true },
    { id: "facebookPageSelected", label: CAMPAIGN_READINESS_STEP_LABELS.facebookPageSelected, done: flags.facebookPageSelected, required: true },
    { id: "draftSaved", label: CAMPAIGN_READINESS_STEP_LABELS.draftSaved, done: flags.draftSaved, required: true },
    { id: "readyToPublish", label: CAMPAIGN_READINESS_STEP_LABELS.readyToPublish, done: flags.readyToPublish, required: false },
    { id: "live", label: CAMPAIGN_READINESS_STEP_LABELS.live, done: flags.live, required: false },
    { id: "instagramSelected", label: CAMPAIGN_READINESS_STEP_LABELS.instagramSelected, done: flags.instagramSelected, required: false },
    { id: "pixelSelected", label: CAMPAIGN_READINESS_STEP_LABELS.pixelSelected, done: flags.pixelSelected, required: false },
    { id: "catalogSelected", label: CAMPAIGN_READINESS_STEP_LABELS.catalogSelected, done: flags.catalogSelected, required: false },
  ];

  const blockingReasons: string[] = [];
  const optionalRecommendations: string[] = [];

  let state: CampaignReadinessState;
  let primaryAction: CampaignReadinessPrimaryAction;
  let currentStep: CampaignReadinessCurrentStep;

  if (!flags.shopifyConnected) {
    state = "SETUP_REQUIRED";
    currentStep = "shopify";
    blockingReasons.push("Shopify is not connected.");
    primaryAction = returnPath
      ? {
          ...CAMPAIGN_READINESS_PRIMARY_ACTIONS.connectShopify,
          href: buildJourneyHref(ROUTES.SHOPIFY_CONNECTIONS, returnPath),
        }
      : CAMPAIGN_READINESS_PRIMARY_ACTIONS.connectShopify;
  } else if (!flags.productsSynced) {
    state = "PRODUCTS_REQUIRED";
    currentStep = "products";
    blockingReasons.push("Products are not synced.");
    primaryAction = returnPath
      ? {
          ...CAMPAIGN_READINESS_PRIMARY_ACTIONS.syncProducts,
          href: buildJourneyHref(ROUTES.SHOPIFY, returnPath),
        }
      : CAMPAIGN_READINESS_PRIMARY_ACTIONS.syncProducts;
  } else if (!flags.aiCampaignGenerated) {
    state = "AI_DRAFT_REQUIRED";
    currentStep = "aiCampaign";
    blockingReasons.push("Generate at least one AI campaign draft.");
    primaryAction = returnPath
      ? {
          ...CAMPAIGN_READINESS_PRIMARY_ACTIONS.generateCampaign,
          href: buildJourneyHref(ROUTES.PRODUCTS, returnPath),
        }
      : CAMPAIGN_READINESS_PRIMARY_ACTIONS.generateCampaign;
  } else if (!flags.metaConnected) {
    state = "META_CONNECTION_REQUIRED";
    currentStep = "metaConnected";
    blockingReasons.push("Meta is not connected.");
    primaryAction = withAdvertisingHref(
      CAMPAIGN_READINESS_PRIMARY_ACTIONS.connectMeta,
      returnPath ?? campaignDetailsHref,
    );
  } else if (!flags.businessSelected) {
    state = "BUSINESS_REQUIRED";
    currentStep = "businessSelected";
    blockingReasons.push("Business is not selected.");
    primaryAction = withAdvertisingHref(
      CAMPAIGN_READINESS_PRIMARY_ACTIONS.selectBusiness,
      returnPath ?? campaignDetailsHref,
    );
  } else if (!flags.adAccountSelected) {
    state = "AD_ACCOUNT_REQUIRED";
    currentStep = "adAccountSelected";
    blockingReasons.push("Ad account is not selected.");
    primaryAction = withAdvertisingHref(
      CAMPAIGN_READINESS_PRIMARY_ACTIONS.selectAdAccount,
      returnPath ?? campaignDetailsHref,
    );
  } else if (!flags.facebookPageSelected) {
    state = "FACEBOOK_PAGE_REQUIRED";
    currentStep = "facebookPageSelected";
    blockingReasons.push("Facebook Page is not selected.");
    primaryAction = withAdvertisingHref(
      CAMPAIGN_READINESS_PRIMARY_ACTIONS.selectFacebookPage,
      returnPath ?? campaignDetailsHref,
    );
  } else if (!flags.draftSaved) {
    state = "DRAFT_REQUIRED";
    currentStep = "draftSaved";
    blockingReasons.push("Campaign draft has not been saved.");
    primaryAction = returnPath
      ? {
          ...CAMPAIGN_READINESS_PRIMARY_ACTIONS.saveDraft,
          href: buildJourneyHref(ROUTES.PRODUCTS, returnPath),
        }
      : CAMPAIGN_READINESS_PRIMARY_ACTIONS.saveDraft;
  } else if (!flags.live) {
    state = "READY_TO_PUBLISH";
    currentStep = "readyToPublish";
    primaryAction = CAMPAIGN_READINESS_PRIMARY_ACTIONS.publishCampaign;
  } else {
    state = "LIVE";
    currentStep = "live";
    primaryAction = CAMPAIGN_READINESS_PRIMARY_ACTIONS.viewAnalytics;
  }

  if (!flags.instagramSelected) {
    optionalRecommendations.push("Select an Instagram account for enhanced placement coverage.");
  }
  if (!flags.pixelSelected) {
    optionalRecommendations.push("Select a Pixel for stronger performance tracking.");
  }
  if (!flags.catalogSelected) {
    optionalRecommendations.push("Select a Catalog to support product-led ad formats.");
  }

  const requiredCompleted = REQUIRED_READINESS_STEP_IDS.filter((stepId) => {
    const step = steps.find((item) => item.id === stepId);
    return Boolean(step?.done);
  }).length;
  const optionalCompleted = OPTIONAL_READINESS_STEP_IDS.filter((stepId) => {
    const step = steps.find((item) => item.id === stepId);
    return Boolean(step?.done);
  }).length;

  const percent = clampPercent(requiredCompleted, REQUIRED_READINESS_STEP_IDS.length);
  const next = buildNextAction({
    ready: flags.readyToPublish && !flags.live,
    currentStep,
    primaryAction,
  });

  const requiredSteps: CampaignReadinessChecklistItem[] = REQUIRED_READINESS_STEP_IDS.map((stepId) => {
    const step = steps.find((item) => item.id === stepId)!;
    const baseAction = REQUIRED_STEP_ACTIONS[stepId];
    const href = step.done ? undefined : resolveStepHref(stepId, returnPath, baseAction);
    return {
      id: stepId,
      label: step.label,
      actionLabel: CAMPAIGN_READINESS_NEXT_TITLES[stepId],
      done: step.done,
      required: true,
      isCurrent: !flags.live && !flags.readyToPublish && currentStep === stepId,
      href,
      actionId: baseAction.id,
    };
  });

  const advertisingHref = returnPath
    ? buildAdvertisingSetupHref(returnPath)
    : buildAdvertisingSetupHref();
  const optionalSteps: CampaignReadinessChecklistItem[] = OPTIONAL_READINESS_STEP_IDS.map((stepId) => {
    const step = steps.find((item) => item.id === stepId)!;
    return {
      id: stepId,
      label: step.label,
      actionLabel: OPTIONAL_STEP_ACTION_LABELS[stepId],
      done: step.done,
      required: false,
      isCurrent: false,
      href: step.done ? undefined : advertisingHref,
      actionId: CAMPAIGN_READINESS_PRIMARY_ACTIONS.configureOptional.id,
    };
  });

  return {
    state,
    flags,
    primaryAction,
    next,
    requiredSteps,
    optionalSteps,
    blockingReasons,
    optionalRecommendations,
    requiredProgress: {
      completed: requiredCompleted,
      total: REQUIRED_READINESS_STEP_IDS.length,
      percent,
    },
    optionalProgress: {
      completed: optionalCompleted,
      total: OPTIONAL_READINESS_STEP_IDS.length,
    },
    completedCount: requiredCompleted,
    totalCount: REQUIRED_READINESS_STEP_IDS.length,
    progressPercentage: percent,
    steps,
  };
}

/** First incomplete required checklist step, if any. */
export function getFirstIncompleteRequiredStep(
  readiness: CampaignReadinessModel,
): CampaignReadinessStep | null {
  for (const stepId of REQUIRED_READINESS_STEP_IDS) {
    const step = readiness.steps.find((item) => item.id === stepId);
    if (step && !step.done) {
      return stepId;
    }
  }
  return null;
}
