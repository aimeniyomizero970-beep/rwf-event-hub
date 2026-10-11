import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { z } from "zod";
import { SiteLayout, PageHeader } from "@/components/embs/SiteLayout";
import { EventCard } from "@/components/embs/EventCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmbs } from "@/lib/embs/store";
import { rwf } from "@/lib/embs/format";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  venue: z.string().optional(),
});

export const Route = createFileRoute("/events/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "All Events — EMBS Rwanda" },
      {
        name: "description",
        content:
          "Filter every event in Rwanda by category, date, venue and price range, and book tickets in RWF.",
      },
      { property: "og:title", content: "All Events — EMBS Rwanda" },
      { property: "og:description", content: "Filter and book Rwandan events by category, venue and price." },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/events/" });
  const { events, categories, venues } = useEmbs();

  const [q, setQ] = React.useState(search.q ?? "");
  const [category, setCategory] = React.useState(search.category ?? "all");
  const [venue, setVenue] = React.useState(search.venue ?? "all");
  const [city, setCity] = React.useState(search.city ?? "all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState(250000);

  const cities = Array.from(new Set(venues.map((v) => v.city)));

  const results = events.filter((e) => {
    if (e.status !== "published") return false;
    if (q && !`${e.title} ${e.description}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (category !== "all" && e.categoryId !== category) return false;
    if (venue !== "all" && e.venueId !== venue) return false;
    if (city !== "all" && venues.find((v) => v.id === e.venueId)?.city !== city) return false;
    if (from && new Date(e.date) < new Date(from)) return false;
    if (to && new Date(e.date) > new Date(`${to}T23:59:59`)) return false;
    if (Math.min(...e.tiers.map((t) => t.price)) > maxPrice) return false;
    return true;
  });

  const reset = () => {
    setQ("");
    setCategory("all");
    setVenue("all");
    setCity("all");
    setFrom("");
    setTo("");
    setMaxPrice(250000);
    void navigate({ search: {} as never });
  };

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Discover"
        title="Events catalog"
        subtitle="Search and filter every published event across Rwanda. All prices in RWF."
      />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[280px_1fr]">
        <aside>
          <Card className="lg:sticky lg:top-24">
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center gap-2 font-semibold">
                <SlidersHorizontal className="size-4" /> Filters
              </div>
              <div className="space-y-2">
                <Label>Keyword</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
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
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cities</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Venue</Label>
                <Select value={venue} onValueChange={setVenue}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All venues</SelectItem>
                    {venues.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
              <div className="space-y-3">
                <Label>Max price: {rwf(maxPrice)}</Label>
                <Slider
                  value={[maxPrice]}
                  min={5000}
                  max={250000}
                  step={5000}
                  onValueChange={([v]) => setMaxPrice(v ?? 250000)}
                />
              </div>
              <Button variant="outline" className="w-full" onClick={reset}>
                Reset filters
              </Button>
            </CardContent>
          </Card>
        </aside>

        <div>
          <p className="mb-5 text-sm text-muted-foreground">
            Showing <strong>{results.length}</strong> event{results.length === 1 ? "" : "s"}
          </p>
          {results.length ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <h3 className="font-semibold">No events match your filters</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try widening the date or price range.</p>
              <Button className="mt-4" onClick={reset}>
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
