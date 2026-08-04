import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Triage Acuity Annotation",
  description: "Clinician annotation exercise for simulated triage conversations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
