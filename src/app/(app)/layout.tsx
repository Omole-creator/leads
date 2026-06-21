import { redirect } from "next/navigation";
import { getCurrentUser, signOut } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { AppNav } from "@/components/AppNav";
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
      <header className="sticky top-0 z-20 border-b-2 border-brand-yellow bg-brand-black text-brand-white">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo />
            <AppNav isAdmin={isAdmin} />
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button
              size="sm"
              type="submit"
              className="bg-brand-yellow text-brand-black hover:brightness-90"
            >
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  );
}
