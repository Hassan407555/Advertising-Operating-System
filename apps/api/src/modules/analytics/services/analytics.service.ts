import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import {
  AnalyticsLevel,
  PlatformType,
  Prisma,
} from '@prisma/client';

import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import {
  ANALYTICS_INCLUDE,
  AnalyticsSnapshotWithRelations,
  ANALYTICS_SORT_FIELDS,
  DEFAULT_SORT_BY,
  AnalyticsSortField,
  TopPerformerEntity,
  TopPerformerMetric,
} from '../constants/analytics.constants';

import {
  AnalyticsBreakdownDto,
  BreakdownDimension,
} from '../dto/analytics-breakdown.dto';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { AnalyticsResponseDto } from '../dto/analytics-response.dto';

import { AnalyticsMapper } from '../mappers/analytics.mapper';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(
    AnalyticsService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsMapper: AnalyticsMapper,
  ) {}
  async findAll(
  query: AnalyticsQueryDto,
  currentUser: JwtPayload,
): Promise<
  PaginatedResponseDto<AnalyticsResponseDto>
> {
  const {
    page,
    limit,
    search,
    platform,
    level,
    campaignId,
    adSetId,
    adId,
    creativeId,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  } = query;

  const where = this.buildWhereClause({
    organizationId: currentUser.organizationId,
    search,
    platform,
    level,
    campaignId,
    adSetId,
    adId,
    creativeId,
    startDate: startDate
  ? new Date(startDate)
  : undefined,

endDate: endDate
  ? new Date(endDate)
  : undefined,
  });

  const safeSortBy =
    this.ensureValidSortField(sortBy);

  const skip = (page - 1) * limit;

 const snapshots =
  await this.prisma.analyticsSnapshot.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      [safeSortBy]: sortOrder,
    },
    include: ANALYTICS_INCLUDE,
  });

const total =
  await this.prisma.analyticsSnapshot.count({
    where,
  });

  this.logger.debug({
    message: 'Analytics retrieved.',
    organizationId:
      currentUser.organizationId,
    page,
    limit,
    total,
  });

  return {
    data: snapshots.map((snapshot) =>
      this.analyticsMapper.toResponse(
        snapshot,
      ),
    ),

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage:
        page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
}
async findOne(
  id: string,
  currentUser: JwtPayload,
): Promise<AnalyticsResponseDto> {
  const snapshot =
    await this.prisma.analyticsSnapshot.findFirst({
      where: {
        id,
        organizationId:
          currentUser.organizationId,
      },
      include: ANALYTICS_INCLUDE,
    });

  if (!snapshot) {
    throw new NotFoundException(
      'Analytics snapshot not found.',
    );
  }

  return this.analyticsMapper.toResponse(
    snapshot,
  );
}
async getSummary(
  query: AnalyticsQueryDto,
  currentUser: JwtPayload,
) {
  const where = this.buildWhereClause({
    organizationId: currentUser.organizationId,
    search: query.search,
    platform: query.platform,
    level: query.level,
    campaignId: query.campaignId,
    adSetId: query.adSetId,
    adId: query.adId,
    creativeId: query.creativeId,
    startDate: query.startDate
  ? new Date(query.startDate)
  : undefined,

endDate: query.endDate
  ? new Date(query.endDate)
  : undefined,
  });

  const result =
    await this.prisma.analyticsSnapshot.aggregate({
      where,

      _sum: {
        impressions: true,
        reach: true,
        clicks: true,
        linkClicks: true,
        spend: true,
        conversions: true,
        conversionValue: true,
        revenue: true,
        videoViews: true,
      },

      _avg: {
        ctr: true,
        cpc: true,
        cpm: true,
        roas: true,
      },

      _count: {
        id: true,
      },
    });

  return {
    totalSnapshots: result._count.id,

    impressions:
      result._sum.impressions ?? 0,

    reach:
      result._sum.reach ?? 0,

    clicks:
      result._sum.clicks ?? 0,

    linkClicks:
      result._sum.linkClicks ?? 0,

    spend: this.decimalToNumber(
      result._sum.spend,
    ),

    conversions: this.decimalToNumber(
      result._sum.conversions,
    ),

    conversionValue:
      this.decimalToNumber(
        result._sum.conversionValue,
      ),

    revenue: this.decimalToNumber(
      result._sum.revenue,
    ),

    videoViews:
      result._sum.videoViews ?? 0,

    ctr: this.decimalToNullableNumber(
      result._avg.ctr,
    ),

    cpc: this.decimalToNullableNumber(
      result._avg.cpc,
    ),

    cpm: this.decimalToNullableNumber(
      result._avg.cpm,
    ),

    roas: this.decimalToNullableNumber(
      result._avg.roas,
    ),
  };
}
async getTimeSeries(
  query: AnalyticsQueryDto,
  currentUser: JwtPayload,
) {
  const where = this.buildWhereClause({
    organizationId: currentUser.organizationId,
    search: query.search,
    platform: query.platform,
    level: query.level,
    campaignId: query.campaignId,
    adSetId: query.adSetId,
    adId: query.adId,
    creativeId: query.creativeId,
    startDate: query.startDate
  ? new Date(query.startDate)
  : undefined,

endDate: query.endDate
  ? new Date(query.endDate)
  : undefined,
  });

  const snapshots =
    await this.prisma.analyticsSnapshot.findMany({
      where,
      orderBy: {
        snapshotDate: 'asc',
      },
    });

  const series = new Map<
    string,
    {
      date: string;
      impressions: number;
      clicks: number;
      spend: number;
      revenue: number;
      conversions: number;
    }
  >();

  for (const snapshot of snapshots) {
    const date = snapshot.snapshotDate
      .toISOString()
      .split('T')[0];

    if (!series.has(date)) {
      series.set(date, {
        date,
        impressions: 0,
        clicks: 0,
        spend: 0,
        revenue: 0,
        conversions: 0,
      });
    }

    const row = series.get(date)!;

    row.impressions += snapshot.impressions;
    row.clicks += snapshot.clicks;
    row.spend += Number(snapshot.spend);
    row.revenue += Number(
      snapshot.revenue ?? 0,
    );
    row.conversions += Number(
      snapshot.conversions ?? 0,
    );
  }

  return [...series.values()];
}
async getBreakdown(
  query: AnalyticsBreakdownDto,
  currentUser: JwtPayload,
) {
  const where = this.buildWhereClause({
    organizationId: currentUser.organizationId,
    search: query.search,
    platform: query.platform,
    level: query.level,
    campaignId: query.campaignId,
    adSetId: query.adSetId,
    adId: query.adId,
    creativeId: query.creativeId,
    startDate: query.startDate
  ? new Date(query.startDate)
  : undefined,

endDate: query.endDate
  ? new Date(query.endDate)
  : undefined,
  });

  const snapshots =
    await this.prisma.analyticsSnapshot.findMany({
      where,
      include: ANALYTICS_INCLUDE,
    });

  return this.aggregateBreakdown(
    snapshots,
    query.dimension,
  );
}
async getDashboard(
  query: AnalyticsQueryDto,
  currentUser: JwtPayload,
) {
  const [
    summary,
    timeSeries,
    campaignBreakdown,
  ] = await Promise.all([
    this.getSummary(query, currentUser),

    this.getTimeSeries(
      query,
      currentUser,
    ),

    this.getBreakdown(
      {
        ...query,
        dimension: 'campaign',
      },
      currentUser,
    ),
  ]);

  return {
    summary,
    timeSeries,
    breakdown: {
      campaigns: campaignBreakdown,
    },
  };
}

async getTopPerformers(
  query: AnalyticsQueryDto & {
    entity?: TopPerformerEntity;
    metric?: TopPerformerMetric;
    limit?: number;
  },
  currentUser: JwtPayload,
) {
  const where = this.buildWhereClause({
    organizationId: currentUser.organizationId,
    search: query.search,
    platform: query.platform,
    level: query.level,
    campaignId: query.campaignId,
    adSetId: query.adSetId,
    adId: query.adId,
    creativeId: query.creativeId,

    startDate: query.startDate
      ? new Date(query.startDate)
      : undefined,

    endDate: query.endDate
      ? new Date(query.endDate)
      : undefined,
  });

  const snapshots =
    await this.prisma.analyticsSnapshot.findMany({
      where,
      include: ANALYTICS_INCLUDE,
    });

  return this.aggregateTopPerformers(
    snapshots,
    query.entity ?? 'campaign',
    query.metric ?? 'roas',
    query.limit ?? 10,
  );
}
private aggregateTopPerformers(
  snapshots: AnalyticsSnapshotWithRelations[],
  entity: TopPerformerEntity,
  metric: TopPerformerMetric,
  limit: number,
) {
  const groups = new Map<
    string,
    {
      id: string;
      name: string;
      impressions: number;
      clicks: number;
      spend: number;
      revenue: number;
      conversions: number;
      roas: number;
      ctr: number;
    }
  >();

  for (const snapshot of snapshots) {
    let target:
      | { id: string; name: string }
      | null
      | undefined;

    switch (entity) {
      case 'campaign':
        target = snapshot.campaign;
        break;

      case 'adSet':
        target = snapshot.adSet;
        break;

      case 'ad':
        target = snapshot.ad;
        break;

      case 'creative':
        target = snapshot.creative;
        break;
    }

    if (!target) {
      continue;
    }

    if (!groups.has(target.id)) {
      groups.set(target.id, {
        id: target.id,
        name: target.name,
        impressions: 0,
        clicks: 0,
        spend: 0,
        revenue: 0,
        conversions: 0,
        roas: 0,
        ctr: 0,
      });
    }

    const row = groups.get(target.id)!;

    row.impressions += snapshot.impressions;
    row.clicks += snapshot.clicks;
    row.spend += Number(snapshot.spend);
    row.revenue += Number(snapshot.revenue ?? 0);
    row.conversions += Number(snapshot.conversions ?? 0);
  }

  const results = [...groups.values()].map((row) => {
    const ctr =
      row.impressions > 0
        ? (row.clicks / row.impressions) * 100
        : 0;

    const roas =
      row.spend > 0
        ? row.revenue / row.spend
        : 0;

    return {
      ...row,
      ctr,
      roas,
    };
  });

  return results
    .sort((a, b) => {
      switch (metric) {
        case 'spend':
          return b.spend - a.spend;

        case 'revenue':
          return b.revenue - a.revenue;

        case 'roas':
          return b.roas - a.roas;

        case 'ctr':
          return b.ctr - a.ctr;

        case 'clicks':
          return b.clicks - a.clicks;

        case 'impressions':
          return (
            b.impressions - a.impressions
          );

        case 'conversions':
          return (
            b.conversions - a.conversions
          );

        default:
          return 0;
      }
    })
    .slice(0, limit);
}

private aggregateBreakdown(
  snapshots: AnalyticsSnapshotWithRelations[],
  dimension: BreakdownDimension,
) {
  const groups = new Map<
    string,
    {
      id: string;
      name: string;
      impressions: number;
      clicks: number;
      spend: number;
      revenue: number;
      conversions: number;
      count: number;
    }
  >();

  for (const snapshot of snapshots) {
    let entity:
      | { id: string; name: string }
      | null
      | undefined;

    switch (dimension) {
      case 'campaign':
        entity = snapshot.campaign;
        break;

      case 'adSet':
        entity = snapshot.adSet;
        break;

      case 'ad':
        entity = snapshot.ad;
        break;

      case 'creative':
        entity = snapshot.creative;
        break;
    }

    if (!entity) {
      continue;
    }

    if (!groups.has(entity.id)) {
      groups.set(entity.id, {
        id: entity.id,
        name: entity.name,
        impressions: 0,
        clicks: 0,
        spend: 0,
        revenue: 0,
        conversions: 0,
        count: 0,
      });
    }

    const row = groups.get(entity.id)!;

    row.impressions += snapshot.impressions;
    row.clicks += snapshot.clicks;
    row.spend += Number(snapshot.spend);
    row.revenue += Number(snapshot.revenue ?? 0);
    row.conversions += Number(snapshot.conversions ?? 0);
    row.count++;
  }

  return [...groups.values()].map((row) => ({
    ...row,
    ctr:
      row.impressions > 0
        ? (row.clicks / row.impressions) * 100
        : 0,

    roas:
      row.spend > 0
        ? row.revenue / row.spend
        : 0,
  }));
}
private buildWhereClause(params: {
  organizationId: string;
  search?: string;
  platform?: PlatformType;
  level?: AnalyticsLevel;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  creativeId?: string;
  startDate?: Date;
  endDate?: Date;
}): Prisma.AnalyticsSnapshotWhereInput {
  const where: Prisma.AnalyticsSnapshotWhereInput =
    {
      organizationId:
        params.organizationId,
    };

  if (params.platform) {
    where.platform =
      params.platform;
  }

  if (params.level) {
    where.level = params.level;
  }

  if (params.campaignId) {
    where.campaignId =
      params.campaignId;
  }

  if (params.adSetId) {
    where.adSetId =
      params.adSetId;
  }

  if (params.adId) {
    where.adId = params.adId;
  }

  if (params.creativeId) {
    where.creativeId =
      params.creativeId;
  }

  if (
    params.startDate ||
    params.endDate
  ) {
    where.snapshotDate = {};

    if (params.startDate) {
      where.snapshotDate.gte =
        params.startDate;
    }

    if (params.endDate) {
      where.snapshotDate.lte =
        params.endDate;
    }
  }

  if (
    params.search &&
    params.search.trim().length > 0
  ) {
    const search =
      params.search.trim();

    where.OR = [
      {
        campaign: {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
      },

      {
        adSet: {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
      },

      {
        ad: {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
      },

      {
        creative: {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
      },
    ];
  }

  return where;
}
private ensureValidSortField(
  sortBy?: string,
): AnalyticsSortField {
  if (!sortBy) {
    return DEFAULT_SORT_BY;
  }

  if (
    ANALYTICS_SORT_FIELDS.includes(
      sortBy as AnalyticsSortField,
    )
  ) {
    return sortBy as AnalyticsSortField;
  }

  return DEFAULT_SORT_BY;
}
private decimalToNumber(
  value:
    | Prisma.Decimal
    | number
    | null
    | undefined,
): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

private decimalToNullableNumber(
  value:
    | Prisma.Decimal
    | number
    | null
    | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}
}