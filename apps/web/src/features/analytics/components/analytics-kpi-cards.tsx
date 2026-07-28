"use client";

import { Card } from "@/components/ui/card";
import type { AnalyticsSummary } from "@/features/analytics/types/analytics.types";

interface AnalyticsKpiCardsProps {
  summary: AnalyticsSummary;
}

function formatMetric(value: number | null | undefined, digits = 2) {
  if (value == null) {
    return "N/A";
  }
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function AnalyticsKpiCards({ summary }: AnalyticsKpiCardsProps) {
  const cards = [
    { label: "Spend", value: formatMetric(summary.spend) },
    { label: "Revenue", value: formatMetric(summary.revenue) },
    { label: "ROAS", value: formatMetric(summary.roas) },
    { label: "Impressions", value: formatMetric(summary.impressions, 0) },
    { label: "Reach", value: formatMetric(summary.reach, 0) },
    { label: "Clicks", value: formatMetric(summary.clicks, 0) },
    { label: "CTR", value: formatMetric(summary.ctr) },
    { label: "CPC", value: formatMetric(summary.cpc) },
    { label: "CPM", value: formatMetric(summary.cpm) },
    { label: "Conversions", value: formatMetric(summary.conversions) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label} className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
          <p className="text-xl font-semibold">{card.value}</p>
        </Card>
      ))}
    </div>
  );
}
