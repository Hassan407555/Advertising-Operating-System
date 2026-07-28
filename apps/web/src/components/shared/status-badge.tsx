import { Badge } from "@/components/ui/badge";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "outline";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PAUSED: "Paused",
  ARCHIVED: "Archived",
  DELETED: "Deleted",
  CREATED: "Created",
  AWAITING_INPUT: "Awaiting input",
  INTERVIEWING: "Interview",
  READY_FOR_ANALYSIS: "Ready to generate",
  ANALYZING: "Generating",
  PLANNING: "Planning",
  BUILDING: "Building",
  REVIEWING: "Review",
  AWAITING_APPROVAL: "Awaiting approval",
  APPROVED: "Approved",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  HEALTHY: "Healthy",
  NEEDS_ATTENTION: "Needs attention",
  NOT_READY: "Not ready",
  CONNECTED: "Connected",
  DISCONNECTED: "Disconnected",
  MISSING: "Missing",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
  INACTIVE: "Inactive",
};

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  DRAFT: "default",
  ACTIVE: "success",
  PAUSED: "warning",
  ARCHIVED: "outline",
  DELETED: "danger",
  CREATED: "info",
  AWAITING_INPUT: "warning",
  INTERVIEWING: "info",
  READY_FOR_ANALYSIS: "info",
  ANALYZING: "info",
  PLANNING: "info",
  BUILDING: "info",
  REVIEWING: "warning",
  AWAITING_APPROVAL: "warning",
  APPROVED: "success",
  FAILED: "danger",
  CANCELLED: "outline",
  HEALTHY: "success",
  NEEDS_ATTENTION: "warning",
  NOT_READY: "danger",
  CONNECTED: "success",
  DISCONNECTED: "outline",
  MISSING: "danger",
  EXPIRED: "danger",
  REVOKED: "danger",
  INACTIVE: "outline",
};

function humanize(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) {
    return null;
  }

  const key = status.toUpperCase();
  const label = STATUS_LABELS[key] ?? humanize(status);
  const variant = STATUS_VARIANTS[key] ?? "default";

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
