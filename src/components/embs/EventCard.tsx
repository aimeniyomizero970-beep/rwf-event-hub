import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, rwf } from "@/lib/embs/format";
import { useEmbs, tierAvailable } from "@/lib/embs/store";
import type { EventItem } from "@/lib/embs/types";

export function EventCard({ event }: { event: EventItem }) {
  const { categoryById, venueById } = useEmbs();
  const category = categoryById(event.categoryId);
  const venue = venueById(event.venueId);
  const from = Math.min(...event.tiers.map((t) => t.price));
  const available = event.tiers.reduce((sum, t) => sum + tierAvailable(t), 0);

  return (
    <Card className="group overflow-hidden p-0 transition-shadow hover:shadow-lg">
      <Link to="/events/$eventId" params={{ eventId: event.id }} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <img
            src={event.banner}
            alt={event.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3 flex gap-2">
            {category ? <Badge className="bg-primary/90">{category.name}</Badge> : null}
            {event.featured ? <Badge className="bg-accent text-accent-foreground">Featured</Badge> : null}
          </div>
          <Badge
            variant={available > 0 ? "secondary" : "destructive"}
            className="absolute right-3 top-3"
          >
            {available > 0 ? `${available.toLocaleString()} left` : "Sold out"}
          </Badge>
        </div>
        <CardContent className="space-y-3 p-5">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug">{event.title}</h3>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0" /> {formatDate(event.date)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" /> {venue?.name}, {venue?.city}
            </p>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-xs text-muted-foreground">From</span>
            <span className="text-base font-bold text-primary">{rwf(from)}</span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
