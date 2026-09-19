import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/embs/SiteLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About EMBS Rwanda" },
      {
        name: "description",
        content:
          "EMBS is Rwanda's event management and booking system for organizers, attendees and administrators.",
      },
      { property: "og:title", content: "About EMBS Rwanda" },
      { property: "og:description", content: "Who we are and how EMBS powers Rwandan events." },
    ],
  }),
  component: AboutPage,
});

const pillars = [
  {
    icon: Smartphone,
    title: "Mobile-money first",
    body: "MTN MoMo and Airtel Money sit alongside card and cash so every attendee can pay their way.",
  },
  {
    icon: QrCode,
    title: "Digital QR tickets",
    body: "Every ticket is issued individually with a unique code and a scannable QR pass for the gate.",
  },
  {
    icon: BarChart3,
    title: "Live organizer insight",
    body: "Tickets sold, revenue in RWF and check-in counts update the moment a booking is confirmed.",
  },
  {
    icon: ShieldCheck,
    title: "Moderated marketplace",
    body: "Administrators approve events, feature the best line-ups and audit every transaction reference.",
  },
];

function AboutPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="About us"
        title="Built in Kigali for Rwanda's event economy"
        subtitle="EMBS connects organizers, attendees and administrators on one platform — from publishing an event to scanning the last ticket at the gate."
      />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-4 text-muted-foreground">
            <h2 className="text-2xl font-bold text-foreground">Our story</h2>
            <p>
              Rwanda's cultural calendar has never been fuller — arena concerts, continental tech summits,
              lakeside festivals and league basketball. Yet ticketing still runs on paper stubs, WhatsApp
              threads and manual mobile-money reconciliation.
            </p>
            <p>
              EMBS was built to fix that. Organizers publish an event, define Regular, VIP and VVIP tiers
              priced in Rwandan Francs, and watch stock deplete in real time. Attendees book in under a
              minute and carry their tickets as QR codes. Administrators keep the marketplace trustworthy.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["9", "Events listed"],
              ["6", "Partner venues"],
              ["14k+", "Tickets sold"],
              ["100%", "Digital check-in"],
            ].map(([value, label]) => (
              <Card key={label}>
                <CardContent className="p-6">
                  <p className="text-3xl font-bold text-primary">{value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <Card key={p.title}>
              <CardContent className="space-y-3 p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <p.icon className="size-5" />
                </span>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-sidebar text-sidebar-foreground">
          <CardContent className="flex flex-wrap items-center justify-between gap-6 p-10">
            <div>
              <h2 className="text-2xl font-bold">Ready to list your next event?</h2>
              <p className="mt-2 text-sidebar-foreground/70">
                Create an organizer account and publish in minutes.
              </p>
            </div>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/register">Create account</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
