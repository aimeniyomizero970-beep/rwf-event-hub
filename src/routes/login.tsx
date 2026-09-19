import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { Ticket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/embs/Navbar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmbs } from "@/lib/embs/store";
import type { Role } from "@/lib/embs/types";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — EMBS Rwanda" },
      { name: "description", content: "Sign in to EMBS Rwanda as a customer, organizer or administrator." },
      { property: "og:title", content: "Login — EMBS Rwanda" },
      { property: "og:description", content: "Access your EMBS bookings, events or admin console." },
    ],
  }),
  component: LoginPage,
});

const dashboardFor: Record<Role, string> = {
  customer: "/dashboard/customer",
  organizer: "/dashboard/organizer",
  admin: "/dashboard/admin",
};

const demoAccounts: Record<Role, string> = {
  customer: "customer@embs.rw",
  organizer: "organizer@embs.rw",
  admin: "admin@embs.rw",
};

function LoginPage() {
  const { users, setCurrentUser } = useEmbs();
  const navigate = useNavigate();
  const [role, setRole] = React.useState<Role>("customer");
  const [email, setEmail] = React.useState(demoAccounts.customer);
  const [password, setPassword] = React.useState("demo1234");

  const pickRole = (r: Role) => {
    setRole(r);
    setEmail(demoAccounts[r]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const user =
      users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) ??
      users.find((u) => u.role === role && u.status === "active");
    if (!user) {
      toast.error("No account found for that role");
      return;
    }
    if (user.status === "suspended") {
      toast.error("This account is suspended. Contact an administrator.");
      return;
    }
    setCurrentUser(user.id);
    toast.success(`Welcome back, ${user.name}`);
    void navigate({ to: dashboardFor[user.role] });
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <Navbar />
      <div className="flex flex-1 items-center justify-center px-4 py-14">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="mb-6 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Ticket className="size-6" />
              </span>
              <h1 className="mt-4 text-2xl font-bold">Sign in to EMBS</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a role to explore the matching dashboard.
              </p>
            </div>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label>Sign in as</Label>
                <Select value={role} onValueChange={(v) => pickRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="organizer">Organizer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              No account?{" "}
              <Link to="/register" className="font-medium text-primary hover:underline">
                Register
              </Link>
            </p>
            <p className="mt-3 rounded-md bg-muted p-3 text-center text-xs text-muted-foreground">
              Demo mode: any password works. Accounts — customer@embs.rw, organizer@embs.rw, admin@embs.rw
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
