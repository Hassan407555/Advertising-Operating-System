"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import type { GenerateCampaignResponse } from "@/features/campaign-generator/types/campaign-generator.types";

interface GenerationSuccessSummaryProps {
  result: GenerateCampaignResponse;
  onGenerateAnother: () => void;
}

export function GenerationSuccessSummary({ result, onGenerateAnother }: GenerationSuccessSummaryProps) {
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-semibold">Campaigns generated successfully</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generated {result.campaigns.length} campaign(s), {result.adSets.length} ad set(s), {result.ads.length} ad(s), and{" "}
          {result.creatives.length} creative placeholder(s).
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Generated Campaigns</h3>
        <div className="mt-3 space-y-2">
          {result.campaigns.map((campaign) => (
            <div key={campaign.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
              <div>
                <div className="text-sm font-medium">{campaign.name}</div>
                <div className="text-xs text-muted-foreground">
                  {campaign.platform} • {campaign.id}
                </div>
              </div>
              <Link href={ROUTES.CAMPAIGN_DETAILS(campaign.id)}>
                <Button type="button" variant="secondary">
                  View Campaign
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={onGenerateAnother}>
          Generate Another
        </Button>
      </div>
    </div>
  );
}
