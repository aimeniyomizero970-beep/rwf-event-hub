import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { CalendarDays, Clock, MapPin, Star, Users } from "lucide-react";
import { SiteLayout } from "@/components/embs/SiteLayout";
import { BookingModal } from "@/components/embs/BookingModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatTime, rwf } from "@/lib/embs/format";
import { tierAvailable, useEmbs } from "@/lib/embs/store";

export const Route = createFileRoute("/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Event details — EMBS Rwanda" },
      {
        name: "description",
        content: "Event date, venue, organizer and ticket tiers in RWF with live availability.",
      },
      { property: "og:title", content: "Event details — EMBS Rwanda" },
      { property: "og:description", content: "Ticket tiers, venue details and instant digital tickets." },
    ],
  }),
  component: EventDetails,
});

function EventDetails() {
  const { eventId } = Route.useParams();
  const { eventById, categoryById, venueById, userById, reviews } = useEmbs();
  const event = eventById(eventId);
  const [open, setOpen] = React.useState(false);
  const [tierId, setTierId] = React.useState<string | undefined>();

  if (!event) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Event not found</h1>
          <Button asChild className="mt-4">
            <Link to="/events">Back to events</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const category = categoryById(event.categoryId);
  const venue = venueById(event.venueId);
  const organizer = userById(event.organizerId);
  const eventReviews = reviews.filter((r) => r.eventId === event.id);
  const sold = event.tiers.reduce((s, t) => s + t.sold, 0);

  const book = (id?: string) => {
    setTierId(id);
    setOpen(true);
  };

  return (
    <SiteLayout>
      <div className="relative h-[340px] w-full overflow-hidden md:h-[420px]">
        <img src={event.banner} alt={event.title} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-7xl px-4 pb-8">
            <div className="flex flex-wrap gap-2">
              {category ? <Badge className="bg-primary">{category.name}</Badge> : null}
              {event.featured ? <Badge className="bg-accent text-accent-foreground">Featured</Badge> : null}
              <Badge variant="secondary" className="capitalize">
                {event.status}
              </Badge>
            </div>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold text-white md:text-5xl">{event.title}</h1>
            <div className="mt-4 flex flex-wrap gap-5 text-sm text-white/85">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4 text-accent" /> {formatDate(event.date)}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="size-4 text-accent" /> {formatTime(event.date)} – {formatTime(event.endTime)}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="size-4 text-accent" /> {venue?.name}
              </span>
              <span className="flex items-center gap-2">
                <Users className="size-4 text-accent" /> {sold.toLocaleString()} booked
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold">About this event</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
              {event.description}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Venue</h2>
            <Card className="mt-3 overflow-hidden p-0">
              <div className="grid sm:grid-cols-[200px_1fr]">
                <img src={venue?.image} alt={venue?.name} loading="lazy" className="h-40 w-full object-cover sm:h-full" />
                <CardContent className="p-5">
                  <h3 className="font-semibold">{venue?.name}</h3>
                  <p className="text-sm text-muted-foreground">{venue?.address}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{venue?.description}</p>
                  <p className="mt-3 text-sm">
                    Capacity: <strong>{venue?.capacity.toLocaleString()}</strong>
                  </p>
                </CardContent>
              </div>
            </Card>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Organizer</h2>
            <Card className="mt-3">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-semibold">{organizer?.name}</p>
                  <p className="text-sm text-muted-foreground">{organizer?.email}</p>
                  {organizer?.phone ? (
                    <p className="text-sm text-muted-foreground">{organizer.phone}</p>
                  ) : null}
                </div>
                <Badge variant="secondary">Verified organizer</Badge>
              </CardContent>
            </Card>
          </section>

          {eventReviews.length ? (
            <section>
              <h2 className="text-xl font-semibold">Reviews</h2>
              <div className="mt-3 space-y-3">
                {eventReviews.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-1 text-accent">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="size-4 fill-current" />
                        ))}
                      </div>
                      <p className="mt-2 text-sm">{r.comment}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{userById(r.userId)?.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside>
          <Card className="lg:sticky lg:top-24">
            <CardContent className="space-y-4 p-5">
              <h2 className="text-lg font-semibold">Ticket tiers</h2>
              {event.tiers.map((t) => {
                const left = tierAvailable(t);
                return (
                  <div key={t.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{t.name}</p>
                      <span className="font-bold text-primary">{rwf(t.price)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge variant={left > 50 ? "secondary" : left > 0 ? "outline" : "destructive"}>
                        {left > 0 ? `${left.toLocaleString()} in stock` : "Sold out"}
                      </Badge>
                      <Button size="sm" disabled={left === 0} onClick={() => book(t.id)}>
                        Select
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Separator />
              <Button className="w-full" size="lg" onClick={() => book()}>
                Book tickets
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Pay with MTN MoMo, Airtel Money, card or cash.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      <BookingModal event={event} open={open} onOpenChange={setOpen} initialTierId={tierId} />
    </SiteLayout>
  );
}
