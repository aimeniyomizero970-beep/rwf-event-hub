import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/embs/Navbar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEmbs } from "@/lib/embs/store";
import type { Role } from "@/lib/embs/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create an account — EMBS Rwanda" },
      {
        name: "description",
        content: "Register on EMBS Rwanda as a customer, event organizer or administrator.",
      },
      { property: "og:title", content: "Create an account — EMBS Rwanda" },
      { property: "og:description", content: "Join EMBS to book tickets or publish your own events." },
    ],
  }),
  component: RegisterPage,
});

const dashboardFor: Record<Role, string> = {
  customer: "/dashboard/customer",
  organizer: "/dashboard/organizer",
  admin: "/dashboard/admin",
};

const roleCopy: { value: Role; title: string; body: string }[] = [
  { value: "customer", title: "Customer", body: "Discover events and book digital tickets." },
  { value: "organizer", title: "Organizer", body: "Publish events and manage attendees." },
  { value: "admin", title: "Admin", body: "Moderate the platform and run reports." },
];

function RegisterPage() {
  const { registerUser, backendReady, signUpWithApi } = useEmbs();
  const navigate = useNavigate();
  const [role, setRole] = React.useState<Role>("customer");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (backendReady) {
      setBusy(true);
      const res = await signUpWithApi({ name: name.trim(), email: email.trim(), password });
      setBusy(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.needsEmailConfirmation) {
        toast.success("Account created — check your email to confirm before signing in.");
        void navigate({ to: "/login" });
        return;
      }
      toast.success(`Account created — welcome, ${res.user?.name ?? name}`);
      void navigate({ to: dashboardFor[res.user?.role ?? role] });
      return;
    }
    const user = registerUser({ name: name.trim(), email: email.trim(), role });
    toast.success(`Account created — welcome, ${user.name}`);
    void navigate({ to: dashboardFor[role] });
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <Navbar />
      <div className="flex flex-1 items-center justify-center px-4 py-14">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8">
            <div className="mb-6 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <UserPlus className="size-6" />
              </span>
              <h1 className="mt-4 text-2xl font-bold">Create your EMBS account</h1>
              <p className="mt-1 text-sm text-muted-foreground">Pick the role you want to test.</p>
            </div>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Aline Uwase" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw">Password</Label>
                <Input
                  id="pw"
                  type="password"
                  required
                  minLength={backendReady ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label>Account type</Label>
                <RadioGroup value={role} onValueChange={(v) => setRole(v as Role)} className="grid gap-2 sm:grid-cols-3">
                  {roleCopy.map((r) => (
                    <Label
                      key={r.value}
                      htmlFor={`role-${r.value}`}
                      className={cn(
                        "flex cursor-pointer flex-col gap-1 rounded-lg border p-3",
                        role === r.value && "border-primary bg-primary/5",
                      )}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <RadioGroupItem id={`role-${r.value}`} value={r.value} /> {r.title}
                      </span>
                      <span className="text-xs text-muted-foreground">{r.body}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Creating account…" : "Create account"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already registered?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
