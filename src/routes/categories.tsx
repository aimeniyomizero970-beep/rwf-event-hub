import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/embs/SiteLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEmbs } from "@/lib/embs/store";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Event Categories — EMBS Rwanda" },
      {
        name: "description",
        content: "Concerts, tech conferences, festivals, sports, business and arts events across Rwanda.",
      },
      { property: "og:title", content: "Event Categories — EMBS Rwanda" },
      { property: "og:description", content: "Browse Rwandan events by category." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { categories, events } = useEmbs();
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Directory"
        title="Event categories"
        subtitle="Pick a theme and jump straight into the matching events catalog."
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const count = events.filter((e) => e.categoryId === c.id && e.status === "published").length;
          return (
            <Link key={c.id} to="/events" search={{ category: c.id }}>
              <Card className="group h-full overflow-hidden p-0 transition-shadow hover:shadow-lg">
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={c.image}
                    alt={c.name}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{c.name}</h3>
                    <Badge variant="secondary">{count} events</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Browse <ArrowRight className="size-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </SiteLayout>
  );
}
