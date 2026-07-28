import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default async function Home() {
  const cookieStore = await cookies();
  const hasAccessToken = Boolean(cookieStore.get("aos.access-token")?.value);
  redirect(hasAccessToken ? ROUTES.DASHBOARD : ROUTES.LOGIN);
}
