import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";

export default function ForbiddenPage() {
  return (
    <Card>
      <h1 className="text-xl font-semibold">Forbidden</h1>
      <p className="mt-2 text-sm text-muted-foreground">Your role does not have permission for this page.</p>
      <Link href={ROUTES.DASHBOARD} className="mt-4 inline-block text-sm text-primary underline-offset-2 hover:underline">
        Go to dashboard
      </Link>
    </Card>
  );
}
