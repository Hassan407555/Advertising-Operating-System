import { PlaceholderPage } from "@/components/shared/placeholder-page";

interface AutomationPipelineProps {
  params: Promise<{ id: string }>;
}

export default async function AutomationPipelinePage({ params }: AutomationPipelineProps) {
  const { id } = await params;

  return (
    <PlaceholderPage
      title={`Automation Pipeline Scaffold: ${id}`}
      description="Automation pipeline details implementation is deferred."
    />
  );
}
