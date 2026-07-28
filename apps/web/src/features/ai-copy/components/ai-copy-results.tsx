"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import type { GenerateAiCopyResponse } from "@/features/ai-copy/types/ai-copy.types";
import { formatDateTime } from "@/utils/formatters";

interface AiCopyResultsProps {
  result: GenerateAiCopyResponse;
  onRegenerate: () => void;
}

export function AiCopyResults({ result, onRegenerate }: AiCopyResultsProps) {
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-semibold">AI Copy Generated</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Creatives processed: {result.creativesProcessed}, Ads processed: {result.adsProcessed}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Provider: {result.execution.provider} {result.execution.model ? `• ${result.execution.model}` : ""} • Duration:{" "}
          {result.execution.durationMs}ms
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Started: {formatDateTime(result.execution.startedAt)} • Completed: {formatDateTime(result.execution.completedAt)}
        </p>
      </Card>

      {result.generated.map((item) => (
        <Card key={item.creativeId} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">Creative {item.creativeId}</div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const payload = [
                  `Headline: ${item.headline}`,
                  `Primary Text: ${item.primaryText}`,
                  `Description: ${item.description}`,
                  `CTA: ${item.cta}`,
                ].join("\n");
                navigator.clipboard.writeText(payload);
                toast.success("Copy copied to clipboard.");
              }}
            >
              Copy to Clipboard
            </Button>
          </div>
          <p className="text-sm"><span className="text-muted-foreground">Headline:</span> {item.headline}</p>
          <p className="text-sm"><span className="text-muted-foreground">Primary Text:</span> {item.primaryText}</p>
          <p className="text-sm"><span className="text-muted-foreground">Description:</span> {item.description}</p>
          <p className="text-sm"><span className="text-muted-foreground">CTA:</span> {item.cta}</p>
          <p className="text-sm"><span className="text-muted-foreground">Suggested Hook:</span> {item.suggestedHook}</p>
          <p className="text-sm"><span className="text-muted-foreground">Target Audience:</span> {item.targetAudienceSummary}</p>
          <p className="text-sm"><span className="text-muted-foreground">Offer Angle:</span> {item.offerAngle}</p>
          <p className="text-sm"><span className="text-muted-foreground">Marketing Angle:</span> {item.marketingAngle}</p>
          <p className="text-sm"><span className="text-muted-foreground">Platform Notes:</span> {item.platformNotes}</p>
          <p className="text-sm"><span className="text-muted-foreground">Tone:</span> {item.tone}</p>
          <p className="text-sm"><span className="text-muted-foreground">Pain Points:</span> {item.painPoints.join(", ") || "N/A"}</p>
          <p className="text-sm"><span className="text-muted-foreground">Benefits:</span> {item.benefits.join(", ") || "N/A"}</p>
          <p className="text-xs text-muted-foreground">
            Product: {item.productId ?? "N/A"} • Ads: {item.adIds.join(", ") || "N/A"} • Provider: {item.provider} • Model: {item.model}
          </p>
        </Card>
      ))}

      <div className="flex flex-wrap justify-end gap-2">
        <Link href={ROUTES.CAMPAIGN_DETAILS(result.campaignId)}>
          <Button type="button" variant="secondary">
            View Related Campaign
          </Button>
        </Link>
        <Button type="button" onClick={onRegenerate}>
          Regenerate
        </Button>
      </div>
    </div>
  );
}
