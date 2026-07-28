import { CampaignDetailsPage } from "@/features/campaigns/components/campaign-details-page";

interface CampaignDetailsProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailsRoute({ params }: CampaignDetailsProps) {
  const { id } = await params;

  return <CampaignDetailsPage id={id} />;
}
