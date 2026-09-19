import { QRCodeSVG } from "qrcode.react";
import { CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, rwf } from "@/lib/embs/format";
import { useEmbs } from "@/lib/embs/store";
import type { Ticket } from "@/lib/embs/types";

export function TicketCard({ ticket }: { ticket: Ticket }) {
  const { eventById, venueById } = useEmbs();
  const event = eventById(ticket.eventId);
  const venue = event ? venueById(event.venueId) : undefined;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm sm:flex-row">
      <div className="flex-1 space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Digital ticket</p>
            <h3 className="mt-1 text-base font-semibold leading-snug">{event?.title ?? "Event"}</h3>
          </div>
          <Badge variant={ticket.checkedIn ? "default" : "secondary"}>
            {ticket.checkedIn ? "Checked in" : "Not checked in"}
          </Badge>
        </div>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          {event ? (
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4" /> {formatDateTime(event.date)}
            </p>
          ) : null}
          {venue ? (
            <p className="flex items-center gap-2">
              <MapPin className="size-4" /> {venue.name}, {venue.address}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-3 border-t pt-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Attendee</p>
            <p className="font-medium">{ticket.attendeeName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tier</p>
            <p className="font-medium">{ticket.tierName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="font-medium">{rwf(ticket.price)}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center gap-2 border-t bg-secondary/40 p-5 sm:border-l sm:border-t-0">
        <div className="rounded-lg bg-white p-2">
          <QRCodeSVG value={ticket.code} size={104} level="M" />
        </div>
        <p className="font-mono text-xs font-semibold tracking-wider">{ticket.code}</p>
      </div>
    </div>
  );
}
