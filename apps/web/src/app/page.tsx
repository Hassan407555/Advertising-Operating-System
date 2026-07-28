import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function Home() {
  // Auth is enforced by proxy + AuthGuard; send users into the app shell.
  redirect(ROUTES.DASHBOARD);
}
