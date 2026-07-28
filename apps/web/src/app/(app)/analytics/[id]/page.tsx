import { AnalyticsDetailsPage as AnalyticsDetailsContent } from "@/features/analytics/components/analytics-details-page";

interface AnalyticsDetailsProps {
  params: Promise<{ id: string }>;
}

export default async function AnalyticsDetailsPage({ params }: AnalyticsDetailsProps) {
  const { id } = await params;

  return <AnalyticsDetailsContent id={id} />;
}
