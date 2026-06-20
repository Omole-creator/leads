import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, signOut } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-brand-white text-brand-black">
      <header className="sticky top-0 z-20 border-b border-brand-black/10 bg-brand-white">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-1 text-sm font-medium sm:flex">
              <NavLink href="/dashboard">Overview</NavLink>
              <NavLink href="/leads">Leads</NavLink>
              {isAdmin && (
                <>
                  <NavLink href="/admin/reps">Reps</NavLink>
                  <NavLink href="/admin/cohorts">Cohorts</NavLink>
                  <NavLink href="/admin/tracks">Tracks</NavLink>
                </>
              )}
            </nav>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-brand-black/70 transition-colors hover:bg-brand-black/5 hover:text-brand-black"
    >
      {children}
    </Link>
  );
}
