import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { ArrowRight, CalendarDays, MapPin, Search, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import heroImage from "@/assets/hero.jpg";
import { SiteLayout } from "@/components/embs/SiteLayout";
import { EventCard } from "@/components/embs/EventCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmbs, tierAvailable } from "@/lib/embs/store";
import { formatDate, rwf } from "@/lib/embs/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EMBS Rwanda — Book Events in Kigali & Beyond" },
      {
        name: "description",
        content:
          "Find concerts, tech conferences and festivals across Rwanda. Book tickets in RWF and receive instant digital QR tickets.",
      },
      { property: "og:title", content: "EMBS Rwanda — Book Events in Kigali & Beyond" },
      {
        property: "og:description",
        content: "Find and book Rwandan events with instant digital QR tickets.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { events, categories, venues } = useEmbs();
  const navigate = useNavigate();
  const [keyword, setKeyword] = React.useState("");
  const [location, setLocation] = React.useState("all");
  const [category, setCategory] = React.useState("all");

  const published = events.filter((e) => e.status === "published");
  const upcoming = [...published].sort((a, b) => +new Date(a.date) - +new Date(b.date)).slice(0, 6);
  const popular = [...published]
    .sort(
      (a, b) =>
        b.tiers.reduce((s, t) => s + t.sold, 0) - a.tiers.reduce((s, t) => s + t.sold, 0),
    )
    .slice(0, 3);
  const featured = published.find((e) => e.featured);
  const cities = Array.from(new Set(venues.map((v) => v.city)));

  const search = () => {
    void navigate({
      to: "/events",
      search: {
        q: keyword || undefined,
        city: location === "all" ? undefined : location,
        category: category === "all" ? undefined : category,
      },
    });
  };

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImage}
          alt="Crowd at a concert in Kigali"
          width={1920}
          height={1088}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sidebar/95 via-sidebar/80 to-sidebar/40" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 md:py-32">
          <Badge className="bg-accent text-accent-foreground">Rwanda's event marketplace</Badge>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-white md:text-6xl">
            Every concert, conference and festival in Rwanda — one ticket wallet.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/80">
            Browse events at BK Arena, Kigali Convention Centre and beyond. Pay with MTN MoMo, Airtel
            Money or card, and get a scannable QR ticket instantly.
          </p>

          <div className="mt-8 grid max-w-4xl gap-3 rounded-2xl bg-background/95 p-4 shadow-xl md:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Search events, artists, keywords…"
                className="pl-9"
              />
            </div>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="md:w-40">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="md:w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={search} className="md:px-6">
              Search
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-6 text-sm text-white/80">
            <span className="flex items-center gap-2">
              <Ticket className="size-4 text-accent" /> {published.length} live events
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="size-4 text-accent" /> {venues.length} venues
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-accent" /> Verified organizers
            </span>
          </div>
        </div>
      </section>

      {/* Upcoming */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">What's next</p>
            <h2 className="mt-1 text-2xl font-bold md:text-3xl">Upcoming events</h2>
          </div>
          <Button asChild variant="ghost">
            <Link to="/events">
              View all <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      </section>

      {/* Featured banner */}
      {featured ? (
        <section className="mx-auto max-w-7xl px-4">
          <div className="relative overflow-hidden rounded-3xl bg-sidebar">
            <img
              src={featured.banner}
              alt={featured.title}
              loading="lazy"
              className="absolute inset-0 size-full object-cover opacity-40"
            />
            <div className="relative grid gap-6 p-10 md:grid-cols-2 md:p-14">
              <div>
                <Badge className="bg-accent text-accent-foreground">Featured event</Badge>
                <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">{featured.title}</h2>
                <p className="mt-3 line-clamp-3 text-white/75">{featured.description}</p>
                <div className="mt-5 flex flex-wrap gap-4 text-sm text-white/80">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-accent" /> {formatDate(featured.date)}
                  </span>
                  <span className="flex items-center gap-2">
                    <Ticket className="size-4 text-accent" /> From{" "}
                    {rwf(Math.min(...featured.tiers.map((t) => t.price)))}
                  </span>
                </div>
                <Button asChild size="lg" className="mt-7 bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link to="/events/$eventId" params={{ eventId: featured.id }}>
                    Get tickets
                  </Link>
                </Button>
              </div>
              <div className="grid content-center gap-3">
                {featured.tiers.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl bg-white/10 px-5 py-4 text-white backdrop-blur"
                  >
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-xs text-white/70">{tierAvailable(t).toLocaleString()} left</p>
                    </div>
                    <span className="font-bold text-accent">{rwf(t.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Browse by interest</p>
        <h2 className="mt-1 text-2xl font-bold md:text-3xl">Event categories</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link key={c.id} to="/events" search={{ category: c.id }}>
              <Card className="group overflow-hidden p-0 transition-shadow hover:shadow-lg">
                <div className="relative aspect-[16/7] overflow-hidden">
                  <img
                    src={c.image}
                    alt={c.name}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-sidebar/90 to-transparent" />
                  <div className="absolute bottom-4 left-5 text-white">
                    <h3 className="text-lg font-semibold">{c.name}</h3>
                    <p className="text-xs text-white/75">
                      {events.filter((e) => e.categoryId === c.id && e.status === "published").length} events
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular */}
      <section className="bg-secondary/40 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-accent" />
            <h2 className="text-2xl font-bold md:text-3xl">Popular right now</h2>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex flex-wrap items-center justify-between gap-6 p-10">
            <div>
              <h2 className="text-2xl font-bold">Organising an event in Rwanda?</h2>
              <p className="mt-2 max-w-xl text-primary-foreground/80">
                Publish your event, build ticket tiers in RWF, track revenue and check attendees in at the
                gate with QR scanning.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary">
              <Link to="/register">Start selling tickets</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </SiteLayout>
  );
}
