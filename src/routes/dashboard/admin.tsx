import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Building2, CalendarDays, Download, Printer, Receipt, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell, StatCard } from "@/components/embs/DashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime, randomId, rwf } from "@/lib/embs/format";
import { downloadCsv, printArea } from "@/lib/embs/print";
import { useEmbs } from "@/lib/embs/store";
import type { Category, Venue } from "@/lib/embs/types";

export const Route = createFileRoute("/dashboard/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — EMBS Rwanda" },
      { name: "description", content: "Manage users, events, venues, payments and reports on EMBS Rwanda." },
      { property: "og:title", content: "Admin Dashboard — EMBS Rwanda" },
      { property: "og:description", content: "Platform administration for EMBS Rwanda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const s = useEmbs();
  const paid = s.bookings.filter((b) => b.status === "confirmed");
  const revenue = paid.reduce((n, b) => n + b.total, 0);

  return (
    <DashboardShell title="Admin dashboard" subtitle="Platform overview and management">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Users" value={String(s.users.length)} icon={<Users className="size-5" />} />
        <StatCard label="Organizers" value={String(s.users.filter((u) => u.role === "organizer").length)} icon={<Building2 className="size-5" />} tone="accent" />
        <StatCard label="Events" value={String(s.events.length)} icon={<CalendarDays className="size-5" />} />
        <StatCard label="Revenue" value={rwf(revenue)} icon={<Wallet className="size-5" />} tone="success" />
        <StatCard label="Bookings" value={String(s.bookings.length)} icon={<Receipt className="size-5" />} tone="muted" />
      </div>
      <Tabs defaultValue="users">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="venues">Venues</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="events"><EventsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="venues"><VenuesTab /></TabsContent>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

function UsersTab() {
  const { users, toggleUserStatus } = useEmbs();
  return (
    <Card><CardContent className="p-0">
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell className="capitalize">{u.role}</TableCell>
              <TableCell><Badge variant={u.status === "active" ? "default" : "destructive"}>{u.status}</Badge></TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => { toggleUserStatus(u.id); toast.success("User status updated"); }}>
                  {u.status === "active" ? "Suspend" : "Activate"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

function EventsTab() {
  const { events, updateEventStatus, toggleFeatured, deleteEvent, venueById } = useEmbs();
  return (
    <Card><CardContent className="p-0">
      <Table>
        <TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Date</TableHead><TableHead>Venue</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {events.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">{e.title}{e.featured ? <Badge className="ml-2" variant="secondary">Featured</Badge> : null}</TableCell>
              <TableCell>{formatDate(e.date)}</TableCell>
              <TableCell>{venueById(e.venueId)?.name ?? "—"}</TableCell>
              <TableCell><Badge variant="outline" className="capitalize">{e.status}</Badge></TableCell>
              <TableCell className="space-x-2 text-right whitespace-nowrap">
                {e.status !== "published" ? (
                  <Button size="sm" onClick={() => { updateEventStatus(e.id, "published"); toast.success("Event approved"); }}>Approve</Button>
                ) : null}
                <Button size="sm" variant="outline" onClick={() => { toggleFeatured(e.id); toast.success("Feature updated"); }}>
                  {e.featured ? "Unfeature" : "Feature"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => { if (confirm("Remove this event?")) { deleteEvent(e.id); toast.success("Event removed"); } }}>Remove</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

function CategoriesTab() {
  const { categories, saveCategory, deleteCategory } = useEmbs();
  const [edit, setEdit] = React.useState<Category | null>(null);
  const blank = (): Category => ({ id: randomId("cat"), name: "", slug: "", description: "", image: "" });
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between"><CardTitle>Categories</CardTitle><Button size="sm" onClick={() => setEdit(blank())}>Add category</Button></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="max-w-md truncate">{c.description}</TableCell>
                <TableCell className="space-x-2 text-right whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => setEdit(c)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => { deleteCategory(c.id); toast.success("Category deleted"); }}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit && categories.some((c) => c.id === edit.id) ? "Edit" : "New"} category</DialogTitle></DialogHeader>
          {edit ? (
            <div className="space-y-3">
              <Field label="Name"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} /></Field>
              <Field label="Description"><Textarea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
              <Field label="Image URL"><Input value={edit.image} onChange={(e) => setEdit({ ...edit, image: e.target.value })} /></Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => { if (!edit?.name.trim()) return toast.error("Name is required"); saveCategory(edit); setEdit(null); toast.success("Category saved"); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function VenuesTab() {
  const { venues, saveVenue, deleteVenue } = useEmbs();
  const [edit, setEdit] = React.useState<Venue | null>(null);
  const blank = (): Venue => ({ id: randomId("ven"), name: "", city: "Kigali", address: "", capacity: 500, description: "", image: "" });
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between"><CardTitle>Venues</CardTitle><Button size="sm" onClick={() => setEdit(blank())}>Add venue</Button></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>City</TableHead><TableHead>Capacity</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {venues.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell>{v.city}</TableCell>
                <TableCell>{v.capacity.toLocaleString()}</TableCell>
                <TableCell className="space-x-2 text-right whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => setEdit(v)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => { deleteVenue(v.id); toast.success("Venue deleted"); }}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Venue</DialogTitle></DialogHeader>
          {edit ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="City"><Input value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></Field>
              <Field label="Address"><Input value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></Field>
              <Field label="Capacity"><Input type="number" min={1} value={edit.capacity} onChange={(e) => setEdit({ ...edit, capacity: Number(e.target.value) })} /></Field>
              <div className="sm:col-span-2"><Field label="Description"><Textarea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field></div>
              <div className="sm:col-span-2"><Field label="Image URL"><Input value={edit.image} onChange={(e) => setEdit({ ...edit, image: e.target.value })} /></Field></div>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => { if (!edit?.name.trim()) return toast.error("Name is required"); saveVenue(edit); setEdit(null); toast.success("Venue saved"); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PaymentsTab() {
  const { bookings, userById, eventById } = useEmbs();
  return (
    <Card><CardContent className="p-0">
      <Table>
        <TableHeader><TableRow><TableHead>Booking</TableHead><TableHead>Customer</TableHead><TableHead>Event</TableHead><TableHead>Method</TableHead><TableHead>Tx ref</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
        <TableBody>
          {bookings.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-mono text-xs">{b.ref}</TableCell>
              <TableCell>{userById(b.userId)?.name ?? "—"}</TableCell>
              <TableCell>{eventById(b.eventId)?.title ?? "—"}</TableCell>
              <TableCell>{b.paymentMethod}</TableCell>
              <TableCell className="font-mono text-xs">{b.txRef}</TableCell>
              <TableCell>{rwf(b.total)}</TableCell>
              <TableCell><Badge variant="outline" className="capitalize">{b.status}</Badge></TableCell>
              <TableCell>{formatDateTime(b.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

function ReportsTab() {
  const { bookings, events, eventById } = useEmbs();
  const [from, setFrom] = React.useState("2026-01-01");
  const [to, setTo] = React.useState("2026-12-31");
  const [kind, setKind] = React.useState<"revenue" | "bookings" | "events">("revenue");
  const inRange = (iso: string) => { const d = iso.slice(0, 10); return d >= from && d <= to; };
  const rb = bookings.filter((b) => inRange(b.createdAt));
  const re = events.filter((e) => inRange(e.date));

  let rows: (string | number)[][] = [];
  if (kind === "revenue") {
    const map = new Map<string, number>();
    rb.filter((b) => b.status === "confirmed").forEach((b) => map.set(b.eventId, (map.get(b.eventId) ?? 0) + b.total));
    rows = [["Event", "Revenue (RWF)"], ...[...map].map(([id, v]) => [eventById(id)?.title ?? id, v])];
  } else if (kind === "bookings") {
    rows = [["Ref", "Event", "Status", "Method", "Total (RWF)", "Date"], ...rb.map((b) => [b.ref, eventById(b.eventId)?.title ?? "", b.status, b.paymentMethod, b.total, formatDate(b.createdAt)])];
  } else {
    rows = [["Event", "Date", "Status", "Tickets sold", "Capacity"], ...re.map((e) => [e.title, formatDate(e.date), e.status, e.tiers.reduce((n, t) => n + t.sold, 0), e.tiers.reduce((n, t) => n + t.capacity, 0)])];
  }
  const total = kind === "revenue" ? rows.slice(1).reduce((n, r) => n + Number(r[1]), 0) : rows.length - 1;

  return (
    <Card>
      <CardHeader className="no-print">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Report"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="revenue">Revenue</option><option value="bookings">Bookings</option><option value="events">Events</option></select></Field>
          <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Button variant="outline" onClick={() => downloadCsv(rows, `embs-${kind}-report.csv`)}><Download className="mr-2 size-4" />CSV</Button>
          <Button variant="outline" onClick={() => printArea("admin-report", "EMBS Report")}><Printer className="mr-2 size-4" />Print</Button>
        </div>
      </CardHeader>
      <CardContent id="admin-report">
        <h3 className="mb-1 text-lg font-semibold capitalize">{kind} report</h3>
        <p className="mb-4 text-sm text-muted-foreground">{from} to {to} · {kind === "revenue" ? `Total ${rwf(total)}` : `${total} records`}</p>
        <Table>
          <TableHeader><TableRow>{rows[0].map((h) => <TableHead key={String(h)}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {rows.slice(1).map((r, i) => (
              <TableRow key={i}>{r.map((c, j) => <TableCell key={j}>{typeof c === "number" && kind === "revenue" ? rwf(c) : c}</TableCell>)}</TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
