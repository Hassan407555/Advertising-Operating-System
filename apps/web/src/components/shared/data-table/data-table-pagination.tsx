import { Button } from "@/components/ui/button";

interface DataTablePaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function DataTablePagination({
  page,
  limit,
  total,
  onPageChange,
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex items-center justify-between gap-3 py-3 text-sm">
      <span className="text-body-sm">
        Page {page} of {totalPages}
        {total > 0 ? (
          <span className="text-muted-foreground"> · {total} total</span>
        ) : null}
      </span>
      <div className="inline-cluster">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
