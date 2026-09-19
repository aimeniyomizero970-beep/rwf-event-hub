import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Users } from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/embs/SiteLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEmbs } from "@/lib/embs/store";

export const Route = createFileRoute("/venues")({
  head: () => ({
    meta: [
      { title: "Venues — EMBS Rwanda" },
      {
        name: "description",
        content:
          "BK Arena, Kigali Convention Centre, Amahoro Stadium and more — explore Rwanda's event venues.",
      },
      { property: "og:title", content: "Venues — EMBS Rwanda" },
      { property: "og:description", content: "Explore Rwanda's leading event venues and their events." },
    ],
  }),
  component: VenuesPage,
});

function VenuesPage() {
  const { venues, events } = useEmbs();
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Directory"
        title="Venues across Rwanda"
        subtitle="From the 10,000-seat BK Arena to lakeside stages in Rubavu."
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 md:grid-cols-2">
        {venues.map((v) => {
          const count = events.filter((e) => e.venueId === v.id && e.status === "published").length;
          return (
            <Card key={v.id} className="overflow-hidden p-0">
              <div className="grid sm:grid-cols-[220px_1fr]">
                <img src={v.image} alt={v.name} loading="lazy" className="h-44 w-full object-cover sm:h-full" />
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{v.name}</h3>
                    <Badge variant="secondary">{count} events</Badge>
                  </div>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-4" /> {v.address}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="size-4" /> Capacity {v.capacity.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">{v.description}</p>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link to="/events" search={{ venue: v.id }}>
                      See events
                    </Link>
                  </Button>
                </CardContent>
              </div>
            </Card>
          );
        })}
      </div>
    </SiteLayout>
  );
}
