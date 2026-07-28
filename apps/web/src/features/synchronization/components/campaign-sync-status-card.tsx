"use client";

import { Card } from "@/components/ui/card";
import type { CampaignSyncStatusResponse } from "@/features/synchronization/types/synchronization.types";
import { formatDateTime } from "@/utils/formatters";

interface CampaignSyncStatusCardProps {
  status: CampaignSyncStatusResponse;
}

export function CampaignSyncStatusCard({ status }: CampaignSyncStatusCardProps) {
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">Campaign Sync Status</h2>
      <div className="grid gap-2 text-sm md:grid-cols-2">
        <p><span className="text-muted-foreground">Campaign:</span> {status.name}</p>
        <p><span className="text-muted-foreground">Platform:</span> {status.platform}</p>
        <p><span className="text-muted-foreground">Status:</span> {status.status}</p>
        <p><span className="text-muted-foreground">External Status:</span> {status.externalStatus ?? "N/A"}</p>
        <p><span className="text-muted-foreground">Spend:</span> {status.spend ?? "N/A"}</p>
        <p><span className="text-muted-foreground">Impressions:</span> {status.impressions ?? "N/A"}</p>
        <p><span className="text-muted-foreground">Clicks:</span> {status.clicks ?? "N/A"}</p>
        <p><span className="text-muted-foreground">Conversions:</span> {status.conversions ?? "N/A"}</p>
        <p><span className="text-muted-foreground">Last Synced:</span> {status.lastSyncedAt ? formatDateTime(status.lastSyncedAt) : "N/A"}</p>
      </div>

      <details className="rounded-md border border-border p-3 text-sm">
        <summary className="cursor-pointer font-medium">Expand ad set and ad statuses ({status.adSets.length})</summary>
        <div className="mt-2 space-y-2">
          {status.adSets.map((adSet) => (
            <div key={adSet.id} className="rounded-md border border-border p-2">
              <div className="font-medium">
                Ad Set: {adSet.name} • {adSet.status}
              </div>
              <div className="text-xs text-muted-foreground">Ads: {adSet.ads.length}</div>
              <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                {adSet.ads.map((ad) => (
                  <div key={ad.id}>
                    {ad.name} • {ad.status} • External: {ad.externalStatus ?? "N/A"}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </Card>
  );
}
