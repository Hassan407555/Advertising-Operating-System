import { PlaceholderPage } from "@/components/shared/placeholder-page";

interface AnalyticsDetailsProps {
  params: Promise<{ id: string }>;
}

export default async function AnalyticsDetailsPage({ params }: AnalyticsDetailsProps) {
  const { id } = await params;

  return (
    <PlaceholderPage
      title={`Analytics View Scaffold: ${id}`}
      description="Analytics detail implementation is deferred."
    />
  );
}
