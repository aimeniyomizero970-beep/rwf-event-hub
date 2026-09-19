import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, LayoutDashboard, LogOut, Menu, Ticket, UserCircle2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useEmbs } from "@/lib/embs/store";
import type { Role } from "@/lib/embs/types";
import { toast } from "sonner";

const links = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Events" },
  { to: "/categories", label: "Categories" },
  { to: "/venues", label: "Venues" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

const dashboardFor: Record<Role, string> = {
  customer: "/dashboard/customer",
  organizer: "/dashboard/organizer",
  admin: "/dashboard/admin",
};

export function Navbar() {
  const { currentUser, switchRole, setCurrentUser } = useEmbs();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  const handleSwitch = (role: Role) => {
    switchRole(role);
    toast.success(`Previewing as ${role}`);
    void navigate({ to: dashboardFor[role] });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur no-print">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Ticket className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            EMBS<span className="text-accent">.rw</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <UserCircle2 className="size-4" />
                  <span className="hidden sm:inline">{currentUser.name.split(" ")[0]}</span>
                  <Badge variant="secondary" className="hidden capitalize sm:inline-flex">
                    {currentUser.role}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{currentUser.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={dashboardFor[currentUser.role]}>
                    <LayoutDashboard className="mr-2 size-4" /> My dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/events">
                    <CalendarDays className="mr-2 size-4" /> Browse events
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Quick role preview
                </DropdownMenuLabel>
                {(["customer", "organizer", "admin"] as Role[]).map((role) => (
                  <DropdownMenuItem key={role} onClick={() => handleSwitch(role)} className="capitalize">
                    {role}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setCurrentUser(null);
                    toast.success("Signed out");
                    void navigate({ to: "/" });
                  }}
                >
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Register</Link>
              </Button>
            </div>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-6">
              <SheetTitle className="mb-4">Menu</SheetTitle>
              <div className="flex flex-col gap-1">
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="mt-4 flex flex-col gap-2">
                  <Button asChild variant="outline" onClick={() => setOpen(false)}>
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild onClick={() => setOpen(false)}>
                    <Link to="/register">Register</Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
