import {
  CallToAction,
  CampaignObjective,
  Currency,
} from '@prisma/client';

const OBJECTIVE_ALIASES: Record<string, CampaignObjective> = {
  AWARENESS: CampaignObjective.AWARENESS,
  BRAND_AWARENESS: CampaignObjective.AWARENESS,
  TRAFFIC: CampaignObjective.TRAFFIC,
  LINK_CLICKS: CampaignObjective.TRAFFIC,
  ENGAGEMENT: CampaignObjective.ENGAGEMENT,
  POST_ENGAGEMENT: CampaignObjective.ENGAGEMENT,
  LEADS: CampaignObjective.LEADS,
  LEAD_GENERATION: CampaignObjective.LEADS,
  SALES: CampaignObjective.SALES,
  CONVERSIONS: CampaignObjective.SALES,
  CONVERSION: CampaignObjective.SALES,
  PURCHASE: CampaignObjective.SALES,
  CATALOG_SALES: CampaignObjective.CATALOG_SALES,
  APP_PROMOTION: CampaignObjective.APP_PROMOTION,
  APP_INSTALLS: CampaignObjective.APP_PROMOTION,
  VIDEO: CampaignObjective.VIDEO,
  VIDEO_VIEWS: CampaignObjective.VIDEO,
  LOCAL: CampaignObjective.LOCAL,
  STORE_VISITS: CampaignObjective.STORE_VISITS,
  MESSAGES: CampaignObjective.MESSAGES,
  MESSAGING: CampaignObjective.MESSAGES,
};

const CTA_ALIASES: Record<string, CallToAction> = {
  LEARN_MORE: CallToAction.LEARN_MORE,
  SHOP_NOW: CallToAction.SHOP_NOW,
  BUY_NOW: CallToAction.SHOP_NOW,
  DOWNLOAD: CallToAction.DOWNLOAD,
  SIGN_UP: CallToAction.SIGN_UP,
  SIGNUP: CallToAction.SIGN_UP,
  CONTACT_US: CallToAction.CONTACT_US,
  BOOK_NOW: CallToAction.BOOK_NOW,
  GET_OFFER: CallToAction.GET_OFFER,
  GET_QUOTE: CallToAction.GET_QUOTE,
  GET_STARTED: CallToAction.GET_STARTED,
  INSTALL_APP: CallToAction.INSTALL_APP,
  LISTEN: CallToAction.LISTEN,
  ORDER_NOW: CallToAction.ORDER_NOW,
  PLAY_GAME: CallToAction.PLAY_GAME,
  REGISTER_NOW: CallToAction.REGISTER_NOW,
  RENT_NOW: CallToAction.RENT_NOW,
  SEE_MORE: CallToAction.SEE_MORE,
  SEND_EMAIL: CallToAction.SEND_EMAIL,
  SEND_MESSAGE: CallToAction.SEND_MESSAGE,
  SEND_WHATSAPP: CallToAction.SEND_WHATSAPP,
  SUBSCRIBE: CallToAction.SUBSCRIBE,
  VISIT_SITE: CallToAction.VISIT_SITE,
  WATCH_MORE: CallToAction.WATCH_MORE,
};

function normalizeKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

/** Maps free-text objective to Prisma CampaignObjective. Defaults to SALES. */
export function mapObjective(value: string): CampaignObjective {
  const key = normalizeKey(value);
  if (OBJECTIVE_ALIASES[key]) {
    return OBJECTIVE_ALIASES[key];
  }

  const match = (Object.values(CampaignObjective) as string[]).find(
    (item) => item === key,
  );
  return (match as CampaignObjective | undefined) ?? CampaignObjective.SALES;
}

/** Maps free-text CTA to Prisma CallToAction. Defaults to LEARN_MORE. */
export function mapCallToAction(value: string): CallToAction {
  const key = normalizeKey(value);
  if (CTA_ALIASES[key]) {
    return CTA_ALIASES[key];
  }

  const match = (Object.values(CallToAction) as string[]).find(
    (item) => item === key,
  );
  return (match as CallToAction | undefined) ?? CallToAction.LEARN_MORE;
}

/** Maps currency string to Prisma Currency. Defaults to USD. */
export function mapCurrency(value: string | undefined | null): Currency {
  if (!value?.trim()) {
    return Currency.USD;
  }

  const key = normalizeKey(value);
  const match = (Object.values(Currency) as string[]).find(
    (item) => item === key,
  );
  return (match as Currency | undefined) ?? Currency.USD;
}
