import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobMingle Leads",
  description: "JobMingle Cohort Lead Tracking System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-white text-brand-black antialiased">
        {children}
      </body>
    </html>
  );
}
