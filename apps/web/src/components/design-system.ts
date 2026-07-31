/**
 * Design system — public surface area for Phase 1 primitives & patterns.
 * Prefer importing from `@/components/ui/*` or `@/components/shared/*` directly.
 * This module documents the catalog for discoverability (no Storybook yet).
 *
 * Tokens live in `src/styles/tokens.css` (bridged via `globals.css`).
 * Typography roles: `.text-display` `.text-title` `.text-heading` `.text-subheading`
 *                   `.text-body` `.text-body-sm` `.text-caption` `.text-eyebrow` `.text-mono`
 * Layout helpers:   `.page-stack` `.section-stack` `.stack` `.stack-sm` `.inline-cluster`
 * Grid helpers:     `.grid-responsive-2|3|4` or `<PageGrid />`
 * Motion:           `.animate-fade-in` `.animate-fade-in-up` `.animate-fade-in-scale`
 *                   `.animate-slide-in-right` `.transition-surface`
 */

export { Button, buttonVariants } from "@/components/ui/button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
} from "@/components/ui/card";
export { Badge, badgeVariants } from "@/components/ui/badge";
export { Input, inputVariants } from "@/components/ui/input";
export { Textarea } from "@/components/ui/textarea";
export { Label } from "@/components/ui/label";
export { Skeleton, skeletonVariants } from "@/components/ui/skeleton";
export { Separator } from "@/components/ui/separator";
export { Progress } from "@/components/ui/progress";

export { PageHeader } from "@/components/shared/page-header";
export { SectionHeader } from "@/components/shared/section-header";
export { StatusBadge } from "@/components/shared/status-badge";
export { PageEmpty } from "@/components/shared/states/page-empty";
export { PageLoading, TableSkeleton } from "@/components/shared/states/page-loading";
export { PageError } from "@/components/shared/states/page-error";
export { PageGrid } from "@/components/shared/layout/page-grid";
export { DataTable } from "@/components/shared/data-table/data-table";
export { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
export { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
export { FormFieldText } from "@/components/shared/forms/form-field-text";
