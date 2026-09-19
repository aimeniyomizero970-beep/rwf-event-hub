import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { BarChart3, CalendarDays, CheckCircle2, Plus, Trash2, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell, EmptyState, StatCard } from "@/components/embs/DashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime, randomId, rwf } from "@/lib/embs/format";
import { useEmbs, tierAvailable } from "@/lib/embs/store";
import type { EventItem, TicketTier } from "@/lib/embs/types";

export const Route = createFileRoute("/dashboard/organizer")({
  head: () => ({
    meta: [
      { title: "Organizer Dashboard — EMBS Rwanda" },
      { name: "description", content: "Track ticket sales, revenue in RWF, attendees and check-ins for your events." },
      { property: "og:title", content: "Organizer Dashboard — EMBS Rwanda" },
      { property: "og:description", content: "Manage your Rwandan events, tickets and attendees." },
    ],
  }),
  component: OrganizerDashboard,
});

const emptyEvent = (organizerId: string, categoryId: string, venueId: string): EventItem => ({
  id: randomId("evt"),
  title: "",
  description: "",
  categoryId,
  venueId,
  organizerId,
  date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16),
  endTime: new Date(Date.now() + 86400000 * 30 + 3600000 * 4).toISOString().slice(0, 16),
  banner: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",
  status: "draft",
  featured: false,
  tiers: [{ id: randomId("t"), name: "Regular", price: 10000, capacity: 500, sold: 0 }],
});

function OrganizerDashboard() {
  const {
    currentUser,
    events,
    bookings,
    tickets,
    categories,
    venues,
    saveEvent,
    deleteEvent,
    toggleCheckIn,
    eventById,
    categoryById,
    venueById,
  } = useEmbs();

  const [editing, setEditing] = React.useState<EventItem | null>(null);
  const [rosterEvent, setRosterEvent] = React.useState<string>("");

  if (!currentUser) {
    return (
      <DashboardShell title="Organizer dashboard">
        <EmptyState title="You're signed out" description="Sign in as an organizer." cta={{ to: "/login", label: "Sign in" }} />
      </DashboardShell>
    );
  }

  const myEvents = events.filter((e) => e.organizerId === currentUser.id);
  const myEventIds = new Set(myEvents.map((e) => e.id));
  const myBookings = bookings.filter((b) => myEventIds.has(b.eventId) && b.status !== "cancelled");
  const myTickets = tickets.filter((t) => myEventIds.has(t.eventId));
  const sold = myEvents.reduce((s, e) => s + e.tiers.reduce((x, t) => x + t.sold, 0), 0);
  const revenue = myEvents.reduce(
    (s, e) => s + e.tiers.reduce((x, t) => x + t.sold * t.price, 0),
    0,
  );
  const checkedIn = myTickets.filter((t) => t.checkedIn).length;
  const rosterId = rosterEvent || myEvents[0]?.id || "";
  const roster = myTickets.filter((t) => t.eventId === rosterId);

  return (
    <DashboardShell
      title="Organizer dashboard"
      subtitle={`${currentUser.name} · revenue and attendance across your events`}
      actions={
        <Button onClick={() => setEditing(emptyEvent(currentUser.id, categories[0]!.id, venues[0]!.id))}>
          <Plus className="mr-2 size-4" /> Create event
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total events" value={String(myEvents.length)} icon={<CalendarDays className="size-5" />} />
        <StatCard label="Tickets sold" value={sold.toLocaleString()} icon={<Users className="size-5" />} tone="accent" />
        <StatCard label="Total revenue" value={rwf(revenue)} icon={<Wallet className="size-5" />} tone="success" />
        <StatCard label="Checked in" value={`${checkedIn} / ${myTickets.length}`} icon={<CheckCircle2 className="size-5" />} tone="muted" />
      </div>

      <Tabs defaultValue="events" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="events">My events</TabsTrigger>
          <TabsTrigger value="attendees">Bookings & attendees</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-5">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Sold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myEvents.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="max-w-[240px] truncate font-medium">{e.title}</TableCell>
                      <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                      <TableCell className="text-sm">{venueById(e.venueId)?.name}</TableCell>
                      <TableCell>{e.tiers.reduce((s, t) => s + t.sold, 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={e.status === "published" ? "default" : "secondary"} className="capitalize">
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button size="sm" variant="outline" onClick={() => setEditing(structuredClone(e))}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            deleteEvent(e.id);
                            toast.success("Event deleted");
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!myEvents.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No events yet — create your first one.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendees" className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Label>Event</Label>
            <Select value={rosterId} onValueChange={setRosterEvent}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                {myEvents.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary">{roster.length} attendees</Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bookings</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myBookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.ref}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{eventById(b.eventId)?.title}</TableCell>
                      <TableCell>{b.items.reduce((s, i) => s + i.qty, 0)}</TableCell>
                      <TableCell>{rwf(b.total)}</TableCell>
                      <TableCell className="text-xs">{b.paymentMethod}</TableCell>
                      <TableCell className="text-xs">{formatDateTime(b.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {!myBookings.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No bookings yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendee roster & gate check-in</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket code</TableHead>
                    <TableHead>Attendee</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Check-in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.code}</TableCell>
                      <TableCell>{t.attendeeName}</TableCell>
                      <TableCell>{t.tierName}</TableCell>
                      <TableCell>
                        <Badge variant={t.checkedIn ? "default" : "secondary"}>
                          {t.checkedIn ? "Checked in" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={t.checkedIn ? "outline" : "default"}
                          onClick={() => {
                            toggleCheckIn(t.id);
                            toast.success(t.checkedIn ? "Check-in reversed" : `${t.code} checked in`);
                          }}
                        >
                          {t.checkedIn ? "Undo" : "Scan in"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!roster.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No issued tickets for this event yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4" /> Revenue breakdown per event
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {myEvents.map((e) => {
                const eventRevenue = e.tiers.reduce((s, t) => s + t.sold * t.price, 0);
                const pct = revenue ? Math.round((eventRevenue / revenue) * 100) : 0;
                return (
                  <div key={e.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{e.title}</span>
                      <span className="font-semibold text-primary">{rwf(eventRevenue)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {e.tiers.map((t) => (
                        <span key={t.id}>
                          {t.name}: {t.sold.toLocaleString()} sold · {tierAvailable(t).toLocaleString()} left ·{" "}
                          {rwf(t.sold * t.price)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!myEvents.length ? <p className="text-sm text-muted-foreground">No revenue yet.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editing ? (
        <EventFormDialog
          event={editing}
          categories={categories}
          venues={venues}
          onClose={() => setEditing(null)}
          onSave={(e) => {
            saveEvent(e);
            setEditing(null);
            toast.success("Event saved");
          }}
          categoryName={(id) => categoryById(id)?.name ?? ""}
        />
      ) : null}
    </DashboardShell>
  );
}

function EventFormDialog({
  event,
  categories,
  venues,
  onClose,
  onSave,
}: {
  event: EventItem;
  categories: { id: string; name: string }[];
  venues: { id: string; name: string }[];
  onClose: () => void;
  onSave: (e: EventItem) => void;
  categoryName: (id: string) => string;
}) {
  const [draft, setDraft] = React.useState<EventItem>(event);

  const set = <K extends keyof EventItem>(key: K, value: EventItem[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setTier = (id: string, patch: Partial<TicketTier>) =>
    setDraft((d) => ({ ...d, tiers: d.tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));

  const toLocal = (iso: string) => (iso.length > 16 ? new Date(iso).toISOString().slice(0, 16) : iso);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{event.title ? "Edit event" : "Create event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="Event title" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={4} value={draft.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={draft.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Venue</Label>
              <Select value={draft.venueId} onValueChange={(v) => set("venueId", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Starts</Label>
              <Input
                type="datetime-local"
                value={toLocal(draft.date)}
                onChange={(e) => set("date", new Date(e.target.value).toISOString())}
              />
            </div>
            <div className="space-y-2">
              <Label>Ends</Label>
              <Input
                type="datetime-local"
                value={toLocal(draft.endTime)}
                onChange={(e) => set("endTime", new Date(e.target.value).toISOString())}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Banner image URL</Label>
            <Input value={draft.banner} onChange={(e) => set("banner", e.target.value)} />
          </div>
          <div className="flex items-center gap-6">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => set("status", v as EventItem["status"])}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending review</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={draft.featured} onCheckedChange={(v) => set("featured", v)} />
              <Label>Featured</Label>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <Label>Ticket tiers (RWF)</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    tiers: [...d.tiers, { id: randomId("t"), name: "VIP", price: 30000, capacity: 200, sold: 0 }],
                  }))
                }
              >
                <Plus className="mr-1 size-3.5" /> Add tier
              </Button>
            </div>
            {draft.tiers.map((t) => (
              <div key={t.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={t.name} onChange={(e) => setTier(t.id, { name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Price</Label>
                  <Input
                    type="number"
                    value={t.price}
                    onChange={(e) => setTier(t.id, { price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Capacity</Label>
                  <Input
                    type="number"
                    value={t.capacity}
                    onChange={(e) => setTier(t.id, { capacity: Number(e.target.value) })}
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDraft((d) => ({ ...d, tiers: d.tiers.filter((x) => x.id !== t.id) }))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!draft.title.trim()) {
                  toast.error("Add an event title");
                  return;
                }
                onSave(draft);
              }}
            >
              Save event
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
