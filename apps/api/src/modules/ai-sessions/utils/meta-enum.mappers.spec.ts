import { BadRequestException } from '@nestjs/common';
import { CampaignObjective } from '@prisma/client';

import { mapObjective } from './meta-enum.mappers';

describe('mapObjective', () => {
  it.each([
    ['AWARENESS', CampaignObjective.AWARENESS],
    ['awareness', CampaignObjective.AWARENESS],
    ['Awareness', CampaignObjective.AWARENESS],
    ['AWARNESS', CampaignObjective.AWARENESS],
    ['AWARENES', CampaignObjective.AWARENESS],
    ['BRAND AWARENESS', CampaignObjective.AWARENESS],
    ['BRAND_AWARENESS', CampaignObjective.AWARENESS],
    ['BRANDAWARENESS', CampaignObjective.AWARENESS],
    ['BRANDAWARNESS', CampaignObjective.AWARENESS],
  ])('maps %s → AWARENESS', (input, expected) => {
    expect(mapObjective(input)).toBe(expected);
  });

  it.each([
    ['SALES', CampaignObjective.SALES],
    ['SALE', CampaignObjective.SALES],
    ['CONVERSIONS', CampaignObjective.SALES],
    ['CONVERSION', CampaignObjective.SALES],
    ['PURCHASE', CampaignObjective.SALES],
    ['PURCHASES', CampaignObjective.SALES],
    ['SELL', CampaignObjective.SALES],
    ['SELLING', CampaignObjective.SALES],
  ])('maps %s → SALES', (input, expected) => {
    expect(mapObjective(input)).toBe(expected);
  });

  it.each([
    ['TRAFFIC', CampaignObjective.TRAFFIC],
    ['LINK CLICKS', CampaignObjective.TRAFFIC],
    ['LINK_CLICKS', CampaignObjective.TRAFFIC],
    ['VISITS', CampaignObjective.TRAFFIC],
    ['WEBSITE TRAFFIC', CampaignObjective.TRAFFIC],
  ])('maps %s → TRAFFIC', (input, expected) => {
    expect(mapObjective(input)).toBe(expected);
  });

  it.each([
    ['LEADS', CampaignObjective.LEADS],
    ['LEAD', CampaignObjective.LEADS],
    ['LEAD GENERATION', CampaignObjective.LEADS],
    ['LEAD_GENERATION', CampaignObjective.LEADS],
  ])('maps %s → LEADS', (input, expected) => {
    expect(mapObjective(input)).toBe(expected);
  });

  it.each([
    ['ENGAGEMENT', CampaignObjective.ENGAGEMENT],
    ['POST ENGAGEMENT', CampaignObjective.ENGAGEMENT],
    ['POST ENGAGMENT', CampaignObjective.ENGAGEMENT],
    ['ENGAGE', CampaignObjective.ENGAGEMENT],
    ['ENGAGEMENTS', CampaignObjective.ENGAGEMENT],
  ])('maps %s → ENGAGEMENT', (input, expected) => {
    expect(mapObjective(input)).toBe(expected);
  });

  it('throws a validation error for completely invalid objectives', () => {
    expect(() => mapObjective('HELLO_WORLD')).toThrow(BadRequestException);
    expect(() => mapObjective('HELLO_WORLD')).toThrow(
      'Unknown campaign objective: "HELLO_WORLD"',
    );
  });

  it('does not silently default unknown values to SALES', () => {
    expect(() => mapObjective('NOT_A_REAL_OBJECTIVE')).toThrow(
      BadRequestException,
    );
  });
});
