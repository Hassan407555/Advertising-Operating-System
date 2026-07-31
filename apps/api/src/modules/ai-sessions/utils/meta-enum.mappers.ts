import { BadRequestException, Logger } from '@nestjs/common';
import {
  CallToAction,
  CampaignObjective,
  Currency,
} from '@prisma/client';

const logger = new Logger('MetaEnumMappers');

const OBJECTIVE_ALIASES: Record<string, CampaignObjective> = {
  // Awareness (+ common typos / AI variants)
  AWARENESS: CampaignObjective.AWARENESS,
  BRAND_AWARENESS: CampaignObjective.AWARENESS,
  BRANDAWARENESS: CampaignObjective.AWARENESS,
  AWARNESS: CampaignObjective.AWARENESS,
  AWARENES: CampaignObjective.AWARENESS,
  BRANDAWARNESS: CampaignObjective.AWARENESS,

  // Traffic
  TRAFFIC: CampaignObjective.TRAFFIC,
  LINK_CLICKS: CampaignObjective.TRAFFIC,
  VISITS: CampaignObjective.TRAFFIC,
  WEBSITE_TRAFFIC: CampaignObjective.TRAFFIC,

  // Engagement (+ common typo)
  ENGAGEMENT: CampaignObjective.ENGAGEMENT,
  ENGAGEMENTS: CampaignObjective.ENGAGEMENT,
  ENGAGE: CampaignObjective.ENGAGEMENT,
  POST_ENGAGEMENT: CampaignObjective.ENGAGEMENT,
  POST_ENGAGMENT: CampaignObjective.ENGAGEMENT,

  // Leads
  LEADS: CampaignObjective.LEADS,
  LEAD: CampaignObjective.LEADS,
  LEAD_GENERATION: CampaignObjective.LEADS,

  // Sales
  SALES: CampaignObjective.SALES,
  SALE: CampaignObjective.SALES,
  CONVERSIONS: CampaignObjective.SALES,
  CONVERSION: CampaignObjective.SALES,
  PURCHASE: CampaignObjective.SALES,
  PURCHASES: CampaignObjective.SALES,
  SELL: CampaignObjective.SALES,
  SELLING: CampaignObjective.SALES,

  // Remaining Prisma objectives / Meta-style aliases
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

/**
 * Normalize free-text enum keys:
 * trim → uppercase → punctuation/spaces → underscores → collapse underscores.
 */
function normalizeKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Maps free-text objective to Prisma CampaignObjective.
 * Throws BadRequestException for unrecognized values (does not default to SALES).
 */
export function mapObjective(value: string): CampaignObjective {
  const key = normalizeKey(value);

  if (OBJECTIVE_ALIASES[key]) {
    return OBJECTIVE_ALIASES[key];
  }

  const match = (Object.values(CampaignObjective) as string[]).find(
    (item) => item === key,
  );
  if (match) {
    return match as CampaignObjective;
  }

  logger.warn(`Unknown campaign objective: "${value}"`);
  throw new BadRequestException(`Unknown campaign objective: "${value}"`);
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
