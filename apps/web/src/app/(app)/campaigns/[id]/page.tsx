import { PlaceholderPage } from "@/components/shared/placeholder-page";

interface CampaignDetailsProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailsPage({ params }: CampaignDetailsProps) {
  const { id } = await params;

  return (
    <PlaceholderPage
      title={`Campaign Details Scaffold: ${id}`}
      description="Campaign details implementation is deferred."
    />
  );
}
