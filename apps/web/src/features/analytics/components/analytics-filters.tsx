"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ANALYTICS_BREAKDOWN_DIMENSIONS, ANALYTICS_GROUP_BY_OPTIONS, ANALYTICS_LEVEL_OPTIONS, ANALYTICS_PLATFORM_OPTIONS } from "@/features/analytics/constants/analytics.constants";
import type { AnalyticsFiltersFormValues } from "@/features/analytics/schemas/analytics.schemas";
import type { Campaign } from "@/types/campaign";

interface AnalyticsFiltersProps {
  value: AnalyticsFiltersFormValues;
  campaigns: Campaign[];
  onChange: (updates: Partial<AnalyticsFiltersFormValues>) => void;
}

export function AnalyticsFilters({ value, campaigns, onChange }: AnalyticsFiltersProps) {
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">Filters</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          className="h-9 rounded-md border border-border bg-transparent px-3 text-sm"
          placeholder="Search campaign/ad/ad set"
          value={value.search ?? ""}
          onChange={(event) => onChange({ search: event.target.value, page: 1 })}
        />

        <select
          className="h-9 rounded-md border border-border bg-transparent px-3 text-sm"
          value={value.platform ?? ""}
          onChange={(event) => onChange({ platform: (event.target.value || undefined) as AnalyticsFiltersFormValues["platform"], page: 1 })}
        >
          <option value="">All platforms</option>
          {ANALYTICS_PLATFORM_OPTIONS.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>

        <select
          className="h-9 rounded-md border border-border bg-transparent px-3 text-sm"
          value={value.level ?? ""}
          onChange={(event) => onChange({ level: (event.target.value || undefined) as AnalyticsFiltersFormValues["level"], page: 1 })}
        >
          <option value="">All levels</option>
          {ANALYTICS_LEVEL_OPTIONS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>

        <select
          className="h-9 rounded-md border border-border bg-transparent px-3 text-sm"
          value={value.campaignId ?? ""}
          onChange={(event) => onChange({ campaignId: event.target.value || undefined, page: 1 })}
        >
          <option value="">All campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="h-9 rounded-md border border-border bg-transparent px-3 text-sm"
          value={value.startDate ?? ""}
          onChange={(event) => onChange({ startDate: event.target.value || undefined, page: 1 })}
        />
        <input
          type="date"
          className="h-9 rounded-md border border-border bg-transparent px-3 text-sm"
          value={value.endDate ?? ""}
          onChange={(event) => onChange({ endDate: event.target.value || undefined, page: 1 })}
        />

        <select
          className="h-9 rounded-md border border-border bg-transparent px-3 text-sm"
          value={value.groupBy}
          onChange={(event) => onChange({ groupBy: event.target.value as AnalyticsFiltersFormValues["groupBy"] })}
        >
          {ANALYTICS_GROUP_BY_OPTIONS.map((groupBy) => (
            <option key={groupBy} value={groupBy}>
              Group by {groupBy}
            </option>
          ))}
        </select>

        <select
          className="h-9 rounded-md border border-border bg-transparent px-3 text-sm"
          value={value.dimension}
          onChange={(event) => onChange({ dimension: event.target.value as AnalyticsFiltersFormValues["dimension"] })}
        >
          {ANALYTICS_BREAKDOWN_DIMENSIONS.map((dimension) => (
            <option key={dimension} value={dimension}>
              Breakdown: {dimension}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            onChange({
              page: 1,
              limit: 20,
              search: undefined,
              platform: undefined,
              level: undefined,
              campaignId: undefined,
              startDate: undefined,
              endDate: undefined,
              groupBy: "day",
              sortBy: "snapshotDate",
              sortOrder: "desc",
              dimension: "campaign",
            })
          }
        >
          Reset Filters
        </Button>
      </div>
    </Card>
  );
}
