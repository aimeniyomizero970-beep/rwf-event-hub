import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DashboardShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <Navbar />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "primary",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  hint?: string;
  tone?: "primary" | "accent" | "success" | "muted";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/20 text-accent-foreground",
    success: "bg-success/15 text-success",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className={cn("flex size-11 items-center justify-center rounded-xl", tones[tone])}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-xl font-bold">{value}</p>
          {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, description, cta }: { title: string; description: string; cta?: { to: string; label: string } }) {
  return (
    <div className="rounded-xl border border-dashed bg-card p-10 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {cta ? (
        <Link
          to={cta.to}
          className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}
