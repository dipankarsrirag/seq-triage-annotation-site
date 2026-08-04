import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionCookie, getClinicianDisplayNames, SESSION_COOKIE_NAME } from "@/lib/auth";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const session = await verifySessionCookie(cookies().get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    redirect("/");
  }
  if (session.role !== "admin") {
    redirect("/annotate");
  }

  return <AdminDashboard clinicianNames={getClinicianDisplayNames()} />;
}
