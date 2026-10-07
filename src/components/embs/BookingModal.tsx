import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Check, CreditCard, Download, Landmark, Minus, Plus, Printer, Smartphone, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { formatDateTime, rwf } from "@/lib/embs/format";
import { tierAvailable, useEmbs } from "@/lib/embs/store";
import type { Booking, EventItem, PaymentMethod, Ticket } from "@/lib/embs/types";
import { downloadArea, printArea } from "@/lib/embs/print";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

const STEPS = ["Ticket tier", "Quantity", "Summary", "Payment", "Confirmation"];

const bankName = import.meta.env.VITE_BANK_NAME ?? "BK";
const bankAccount = import.meta.env.VITE_BANK_ACCOUNT ?? "100258706767";
const momoAccount = import.meta.env.VITE_MOMO_ACCOUNT ?? "1256231";
const momoPhone = import.meta.env.VITE_MOMO_PHONE ?? "0798528250";

const METHODS: { value: PaymentMethod; hint: string; icon: React.ReactNode }[] = [
  { value: "MTN MoMo", hint: "Mobile money prompt to your MTN line", icon: <Smartphone className="size-4" /> },
  { value: "Airtel Money", hint: "Mobile money prompt to your Airtel line", icon: <Smartphone className="size-4" /> },
  {
    value: "Bank transfer",
    hint: `Transfer to ${bankName} account ${bankAccount}`,
    icon: <Landmark className="size-4" />,
  },
  {
    value: "MoMo Pay",
    hint: `MoMo account ${momoAccount} / ${momoPhone}`,
    icon: <Wallet className="size-4" />,
  },
  { value: "Card", hint: "Visa / Mastercard secure checkout", icon: <CreditCard className="size-4" /> },
  { value: "Cash", hint: "Pay at an authorised EMBS agent", icon: <Wallet className="size-4" /> },
];

export function BookingModal({
  event,
  open,
  onOpenChange,
  initialTierId,
}: {
  event: EventItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTierId?: string;
}) {
  const { checkout, currentUser, venueById } = useEmbs();
  const venue = venueById(event.venueId);
  const [step, setStep] = React.useState(0);
  const [tierId, setTierId] = React.useState(initialTierId ?? event.tiers[0]?.id ?? "");
  const [qty, setQty] = React.useState(1);
  const [method, setMethod] = React.useState<PaymentMethod>("MTN MoMo");
  const [attendee, setAttendee] = React.useState(currentUser?.name ?? "");
  const [processing, setProcessing] = React.useState(false);
  const [paymentNotice, setPaymentNotice] = React.useState<{ status: string; message: string; instructions?: string } | null>(null);
  const [result, setResult] = React.useState<{ booking: Booking; tickets: Ticket[] } | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setStep(0);
    setTierId(initialTierId ?? event.tiers[0]?.id ?? "");
    setQty(1);
    setMethod("MTN MoMo");
    setAttendee(currentUser?.name ?? "");
    setResult(null);
    setProcessing(false);
    setPaymentNotice(null);
  }, [open, initialTierId, event.tiers, currentUser?.name]);

  const tier = event.tiers.find((t) => t.id === tierId);
  const available = tier ? tierAvailable(tier) : 0;
  const subtotal = (tier?.price ?? 0) * qty;
  const fee = Math.round(subtotal * 0.03);
  const total = subtotal + fee;

  const confirm = async () => {
    if (!tier) return;
    if (qty > available) {
      toast.error("Not enough tickets available in this tier");
      return;
    }

    setProcessing(true);
    setPaymentNotice(null);

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          amount: total,
          currency: "RWF",
          paymentMethod: method,
          attendeeName: attendee.trim() || currentUser?.name || "Guest",
          tierName: tier.name,
          qty,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status === "failed") {
        const message = data.message ?? "Payment could not be processed.";
        setPaymentNotice({ status: data.status ?? "failed", message });
        toast.error(message);
        setProcessing(false);
        return;
      }

      if (data.status === "pending_manual_confirmation" || data.status === "pending_provider_setup") {
        setPaymentNotice({
          status: data.status,
          message: data.message,
          instructions: data.instructions,
        });
        toast.info(data.message);
        setProcessing(false);
        return;
      }

      if (data.status === "approved") {
        const res = checkout({
          eventId: event.id,
          items: [{ tierId: tier.id, tierName: tier.name, qty, price: tier.price }],
          paymentMethod: method,
          attendeeName: attendee.trim() || currentUser?.name || "Guest",
        });
        setResult(res);
        setProcessing(false);
        setStep(4);
        toast.success(`Payment approved — ${res.tickets.length} ticket(s) issued`);
        return;
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to process payment right now.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Book: {event.title}</DialogTitle>
          <DialogDescription>
            {formatDateTime(event.date)} · {venue?.name}, {venue?.city}
          </DialogDescription>
        </DialogHeader>

        <ol className="flex items-center gap-1 text-xs">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-1">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                  i < step && "border-primary bg-primary text-primary-foreground",
                  i === step && "border-primary text-primary",
                  i > step && "border-border text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              <span className={cn("hidden truncate sm:inline", i === step ? "font-medium" : "text-muted-foreground")}>
                {label}
              </span>
            </li>
          ))}
        </ol>
        <Separator />

        {step === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose a ticket tier.</p>
            <RadioGroup value={tierId} onValueChange={setTierId} className="space-y-2">
              {event.tiers.map((t) => {
                const left = tierAvailable(t);
                return (
                  <Label
                    key={t.id}
                    htmlFor={`tier-${t.id}`}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg border p-4",
                      tierId === t.id && "border-primary bg-primary/5",
                      left === 0 && "pointer-events-none opacity-50",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem id={`tier-${t.id}`} value={t.id} disabled={left === 0} />
                      <div>
                        <p className="font-semibold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {left > 0 ? `${left.toLocaleString()} of ${t.capacity.toLocaleString()} available` : "Sold out"}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-primary">{rwf(t.price)}</span>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              How many <strong>{tier?.name}</strong> tickets? {available.toLocaleString()} available.
            </p>
            <div className="flex items-center justify-center gap-6 rounded-lg border p-6">
              <Button variant="outline" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                <Minus className="size-4" />
              </Button>
              <span className="w-16 text-center text-3xl font-bold">{qty}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setQty((q) => {
                    if (q + 1 > available) {
                      toast.error("Only " + available + " tickets left in this tier");
                      return q;
                    }
                    return Math.min(10, q + 1);
                  })
                }
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendee">Attendee name on tickets</Label>
              <Input id="attendee" value={attendee} onChange={(e) => setAttendee(e.target.value)} placeholder="Full name" />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3 rounded-lg border p-5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {tier?.name} · {rwf(tier?.price ?? 0)} × {qty}
              </span>
              <span className="font-medium">{rwf(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service fee (3%)</span>
              <span className="font-medium">{rwf(fee)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-primary">{rwf(total)}</span>
            </div>
            <p className="pt-2 text-xs text-muted-foreground">Attendee: {attendee || currentUser?.name || "Guest"}</p>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select a payment method to process the reservation.</p>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="space-y-2">
              {METHODS.map((m) => (
                <Label
                  key={m.value}
                  htmlFor={`pm-${m.value}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-4",
                    method === m.value && "border-primary bg-primary/5",
                  )}
                >
                  <RadioGroupItem id={`pm-${m.value}`} value={m.value} />
                  {m.icon}
                  <div>
                    <p className="font-medium">{m.value}</p>
                    <p className="text-xs text-muted-foreground">{m.hint}</p>
                  </div>
                  <span className="ml-auto font-bold text-primary">{rwf(total)}</span>
                </Label>
              ))}
            </RadioGroup>

            {paymentNotice ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
                <p className="font-semibold text-amber-700">{paymentNotice.message}</p>
                {paymentNotice.instructions ? (
                  <p className="mt-2 text-xs text-muted-foreground">{paymentNotice.instructions}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 4 && result ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm">
              <p className="font-semibold text-success">Payment successful</p>
              <p className="text-muted-foreground">
                Booking {result.booking.ref} · Transaction ref{" "}
                <span className="font-mono">{result.booking.txRef}</span> · {result.booking.paymentMethod}
              </p>
            </div>
            <div id="booking-tickets" className="space-y-3">
              {result.tickets.map((t) => (
                <div key={t.id} className="ticket flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    <p>
                      {formatDateTime(event.date)} · {venue?.name}
                    </p>
                    <p>
                      {t.tierName} · {t.attendeeName} · {rwf(t.price)}
                    </p>
                    <p className="code mt-1 font-mono text-sm font-bold">{t.code}</p>
                    <Badge variant="secondary" className="mt-1">
                      Not checked in
                    </Badge>
                  </div>
                  <div className="rounded bg-white p-1">
                    <QRCodeSVG value={t.code} size={88} level="M" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => printArea("booking-tickets", "EMBS Tickets")}>
                <Printer className="mr-2 size-4" /> Print
              </Button>
              <Button variant="outline" onClick={() => downloadArea("booking-tickets", `${result.booking.ref}.html`)}>
                <Download className="mr-2 size-4" /> Download
              </Button>
              <Button asChild className="ml-auto">
                <Link to="/dashboard/customer" onClick={() => onOpenChange(false)}>
                  Go to my tickets
                </Link>
              </Button>
            </div>
          </div>
        ) : null}

        {step < 4 ? (
          <div className="flex justify-between gap-2 pt-2">
            <Button variant="ghost" onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}>
              {step === 0 ? "Cancel" : "Back"}
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => {
                  if (step === 0 && !tier) return toast.error("Select a ticket tier");
                  if (step === 1 && qty > available) return toast.error("Not enough tickets available");
                  setStep(step + 1);
                }}
              >
                Continue
              </Button>
            ) : (
              <Button onClick={confirm} disabled={processing}>
                {processing ? "Processing payment…" : `Pay ${rwf(total)}`}
              </Button>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
