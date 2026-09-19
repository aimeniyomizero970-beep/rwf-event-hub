import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { CalendarCheck, Download, Printer, QrCode, Receipt, Star, Ticket as TicketIcon, Wallet } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { DashboardShell, EmptyState, StatCard } from "@/components/embs/DashboardShell";
import { TicketCard } from "@/components/embs/TicketCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatDateTime, randomId, rwf } from "@/lib/embs/format";
import { downloadArea, printArea } from "@/lib/embs/print";
import { useEmbs } from "@/lib/embs/store";
import type { BookingStatus } from "@/lib/embs/types";

export const Route = createFileRoute("/dashboard/customer")({
  head: () => ({
    meta: [
      { title: "Customer Dashboard — EMBS Rwanda" },
      { name: "description", content: "Your upcoming events, bookings, digital tickets and reviews on EMBS." },
      { property: "og:title", content: "Customer Dashboard — EMBS Rwanda" },
      { property: "og:description", content: "Manage your EMBS bookings and digital QR tickets." },
    ],
  }),
  component: CustomerDashboard,
});

const statusVariant: Record<BookingStatus, "default" | "secondary" | "destructive"> = {
  confirmed: "default",
  pending: "secondary",
  cancelled: "destructive",
};

function CustomerDashboard() {
  const {
    currentUser,
    bookings,
    tickets,
    events,
    reviews,
    eventById,
    cancelBooking,
    saveReview,
    deleteReview,
    updateProfile,
  } = useEmbs();

  const [reviewEvent, setReviewEvent] = React.useState("");
  const [rating, setRating] = React.useState("5");
  const [comment, setComment] = React.useState("");

  if (!currentUser) {
    return (
      <DashboardShell title="Customer dashboard">
        <EmptyState
          title="You're signed out"
          description="Sign in as a customer to see bookings and tickets."
          cta={{ to: "/login", label: "Sign in" }}
        />
      </DashboardShell>
    );
  }

  const myBookings = bookings.filter((b) => b.userId === currentUser.id);
  const myBookingIds = new Set(myBookings.map((b) => b.id));
  const myTickets = tickets.filter((t) => myBookingIds.has(t.bookingId));
  const myReviews = reviews.filter((r) => r.userId === currentUser.id);
  const upcoming = myBookings
    .filter((b) => b.status !== "cancelled")
    .map((b) => eventById(b.eventId))
    .filter((e): e is NonNullable<typeof e> => !!e && new Date(e.date) > new Date())
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const spent = myBookings.filter((b) => b.status !== "cancelled").reduce((s, b) => s + b.total, 0);

  return (
    <DashboardShell
      title={`Hello, ${currentUser.name.split(" ")[0]}`}
      subtitle="Your events, bookings and digital tickets in one place."
      actions={
        <Button asChild>
          <Link to="/events">Browse events</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Upcoming events" value={String(upcoming.length)} icon={<CalendarCheck className="size-5" />} />
        <StatCard label="Total bookings" value={String(myBookings.length)} icon={<Receipt className="size-5" />} tone="accent" />
        <StatCard label="Digital tickets" value={String(myTickets.length)} icon={<TicketIcon className="size-5" />} tone="success" />
        <StatCard label="Total spent" value={rwf(spent)} icon={<Wallet className="size-5" />} tone="muted" />
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">My bookings</TabsTrigger>
          <TabsTrigger value="tickets">My tickets</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming events you're attending</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcoming.length ? (
                upcoming.map((e) => (
                  <Link
                    key={e.id}
                    to="/events/$eventId"
                    params={{ eventId: e.id }}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-secondary/60"
                  >
                    <img src={e.banner} alt="" loading="lazy" className="size-14 rounded-md object-cover" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(e.date)}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming events yet.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {myBookings.slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{eventById(b.eventId)?.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">{b.ref}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{rwf(b.total)}</p>
                    <Badge variant={statusVariant[b.status]} className="capitalize">
                      {b.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {!myBookings.length ? <p className="text-sm text-muted-foreground">No orders yet.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="mt-5">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myBookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.ref}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{eventById(b.eventId)?.title}</TableCell>
                      <TableCell>{b.items.reduce((s, i) => s + i.qty, 0)}</TableCell>
                      <TableCell className="font-medium">{rwf(b.total)}</TableCell>
                      <TableCell className="text-xs">
                        {b.paymentMethod}
                        <br />
                        <span className="font-mono text-muted-foreground">{b.txRef}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[b.status]} className="capitalize">
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => printArea(`booking-print-${b.id}`, b.ref)}
                        >
                          <Printer className="mr-1 size-3.5" /> Tickets
                        </Button>
                        {b.status === "confirmed" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              cancelBooking(b.id);
                              toast.success("Booking cancelled");
                            }}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!myBookings.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        No bookings yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Hidden printable areas per booking */}
          <div className="hidden">
            {myBookings.map((b) => (
              <div key={b.id} id={`booking-print-${b.id}`}>
                {tickets
                  .filter((t) => t.bookingId === b.id)
                  .map((t) => (
                    <div key={t.id} className="ticket">
                      <div>
                        <h3>{eventById(t.eventId)?.title}</h3>
                        <p>{formatDateTime(eventById(t.eventId)?.date ?? new Date().toISOString())}</p>
                        <p>
                          {t.tierName} · {t.attendeeName} · {rwf(t.price)}
                        </p>
                        <p className="code">{t.code}</p>
                        <p>{t.checkedIn ? "Checked in" : "Not checked in"}</p>
                      </div>
                      <QRCodeSVG value={t.code} size={88} level="M" />
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-2 no-print">
            <Button variant="outline" onClick={() => printArea("all-tickets", "My EMBS tickets")}>
              <Printer className="mr-2 size-4" /> Print all
            </Button>
            <Button variant="outline" onClick={() => downloadArea("all-tickets", "embs-my-tickets.html")}>
              <Download className="mr-2 size-4" /> Download all
            </Button>
          </div>
          {myTickets.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {myTickets.map((t) => (
                <TicketCard key={t.id} ticket={t} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No tickets yet"
              description="Book an event and your digital QR tickets will appear here."
              cta={{ to: "/events", label: "Find an event" }}
            />
          )}
          <div className="hidden">
            <div id="all-tickets">
              {myTickets.map((t) => (
                <div key={t.id} className="ticket">
                  <div>
                    <h3>{eventById(t.eventId)?.title}</h3>
                    <p>
                      {t.tierName} · {t.attendeeName} · {rwf(t.price)}
                    </p>
                    <p className="code">{t.code}</p>
                  </div>
                  <QRCodeSVG value={t.code} size={88} level="M" />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-5 grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Write a review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Event</Label>
                <Select value={reviewEvent} onValueChange={setReviewEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rating</Label>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} star{n > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Comment</Label>
                <Textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!reviewEvent || !comment.trim()) {
                    toast.error("Pick an event and write a comment");
                    return;
                  }
                  saveReview({
                    id: randomId("rev"),
                    eventId: reviewEvent,
                    userId: currentUser.id,
                    rating: Number(rating),
                    comment: comment.trim(),
                    createdAt: new Date().toISOString(),
                  });
                  setComment("");
                  toast.success("Review published");
                }}
              >
                Publish review
              </Button>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {myReviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-start justify-between gap-4 p-5">
                  <div>
                    <p className="font-medium">{eventById(r.eventId)?.title}</p>
                    <div className="mt-1 flex items-center gap-1 text-accent">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="size-4 fill-current" />
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      deleteReview(r.id);
                      toast.success("Review deleted");
                    }}
                  >
                    Delete
                  </Button>
                </CardContent>
              </Card>
            ))}
            {!myReviews.length ? (
              <p className="text-sm text-muted-foreground">You haven't reviewed any events yet.</p>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="profile" className="mt-5">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle className="text-base">Profile settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pname">Full name</Label>
                <Input
                  id="pname"
                  defaultValue={currentUser.name}
                  onBlur={(e) => updateProfile({ name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pemail">Email</Label>
                <Input
                  id="pemail"
                  defaultValue={currentUser.email}
                  onBlur={(e) => updateProfile({ email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pphone">Phone</Label>
                <Input
                  id="pphone"
                  defaultValue={currentUser.phone ?? ""}
                  placeholder="+250 7…"
                  onBlur={(e) => updateProfile({ phone: e.target.value })}
                />
              </div>
              <Button onClick={() => toast.success("Profile saved")}>
                <QrCode className="mr-2 size-4" /> Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
