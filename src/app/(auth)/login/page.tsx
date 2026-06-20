import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-white px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Logo href="/login" />
          <CardTitle className="mt-4 text-xl">Lead Tracking System</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in with your JobMingle Google account.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <Button type="submit" className="w-full">
              Continue with Google
            </Button>
          </form>

          {process.env.E2E_TEST_MODE === "true" && (
            <div className="space-y-2 border-t border-brand-black/10 pt-4">
              <p className="text-center text-xs text-muted-foreground">
                Dev preview sign-in (no Google needed)
              </p>
              <form
                action={async () => {
                  "use server";
                  await signIn("e2e", {
                    email: "admin@jobmingle.com",
                    redirectTo: "/dashboard",
                  });
                }}
              >
                <Button type="submit" variant="outline" className="w-full">
                  Sign in as Admin
                </Button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await signIn("e2e", {
                    email: "rep1@jobmingle.com",
                    redirectTo: "/dashboard",
                  });
                }}
              >
                <Button type="submit" variant="outline" className="w-full">
                  Sign in as Sales Closer
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
