"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      className="logout-button"
      onClick={handleLogout}
      disabled={loggingOut}
    >
      {loggingOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
