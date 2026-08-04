import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth";
import AnnotateClient from "./AnnotateClient";

export default async function AnnotatePage() {
  const session = await verifySessionCookie(cookies().get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    redirect("/");
  }

  return <AnnotateClient clinicianName={session.displayName} />;
}
