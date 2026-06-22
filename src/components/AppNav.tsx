"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

export function AppNav({ role }: { role: "ADMIN" | "SALES_REP" | "TUTOR" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items: NavItem[] =
    role === "TUTOR"
      ? [{ href: "/attendance", label: "Attendance" }]
      : [
          { href: "/dashboard", label: "Overview" },
          { href: "/leads", label: "Leads" },
          ...(role === "ADMIN"
            ? [
                { href: "/admin/reps", label: "Closers" },
                { href: "/admin/tutors", label: "Tutors" },
                { href: "/admin/attendance", label: "Attendance" },
                { href: "/admin/report", label: "Report" },
                { href: "/admin/cohorts", label: "Cohorts" },
                { href: "/admin/tracks", label: "Tracks" },
                { href: "/admin/import", label: "Import" },
                { href: "/admin/email", label: "Email" },
              ]
            : []),
        ];

  const linkClass = (href: string) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      pathname === href
        ? "bg-brand-yellow text-brand-black"
        : "text-brand-white/80 hover:bg-brand-white/10 hover:text-brand-yellow",
    );

  return (
    <>
      {/* Desktop: inline links */}
      <nav className="hidden items-center gap-1 sm:flex">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className={linkClass(it.href)}>
            {it.label}
          </Link>
        ))}
      </nav>

      {/* Mobile: hamburger toggling a dropdown with ALL links */}
      <button
        type="button"
        aria-label="Toggle menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-2 text-brand-white hover:bg-brand-white/10 sm:hidden"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-14 z-30 border-b border-brand-yellow bg-brand-black p-3 sm:hidden">
          <nav className="flex flex-col gap-1">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className={linkClass(it.href)}
              >
                {it.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
