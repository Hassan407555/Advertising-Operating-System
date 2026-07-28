import { AutomationRunDetailsPage } from "@/features/automation/components/automation-run-details-page";

interface AutomationRunProps {
  params: Promise<{ id: string }>;
}

export default async function AutomationRunPage({ params }: AutomationRunProps) {
  const { id } = await params;

  return <AutomationRunDetailsPage id={id} />;
}
