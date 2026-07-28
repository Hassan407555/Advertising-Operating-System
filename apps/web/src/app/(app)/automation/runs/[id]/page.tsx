import { PlaceholderPage } from "@/components/shared/placeholder-page";

interface AutomationRunProps {
  params: Promise<{ id: string }>;
}

export default async function AutomationRunPage({ params }: AutomationRunProps) {
  const { id } = await params;

  return (
    <PlaceholderPage
      title={`Automation Run Scaffold: ${id}`}
      description="Automation run details implementation is deferred."
    />
  );
}
