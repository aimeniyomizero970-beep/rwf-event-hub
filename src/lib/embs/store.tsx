import * as React from "react";
import { seedState } from "./seed";
import { bookingRef, randomId, ticketCode, txReference } from "./format";
import type {
  Booking,
  BookingItem,
  Category,
  EmbsState,
  EventItem,
  PaymentMethod,
  Review,
  Role,
  Ticket,
  User,
  Venue,
} from "./types";

const STORAGE_KEY = "embs-state-v1";

interface CheckoutInput {
  eventId: string;
  items: BookingItem[];
  paymentMethod: PaymentMethod;
  attendeeName: string;
}

interface CheckoutResult {
  booking: Booking;
  tickets: Ticket[];
}

interface EmbsContextValue extends EmbsState {
  currentUser: User | null;
  setCurrentUser: (id: string | null) => void;
  switchRole: (role: Role) => void;
  registerUser: (input: { name: string; email: string; role: Role }) => User;
  checkout: (input: CheckoutInput) => CheckoutResult;
  cancelBooking: (bookingId: string) => void;
  toggleCheckIn: (ticketId: string) => void;
  saveEvent: (event: EventItem) => void;
  deleteEvent: (id: string) => void;
  updateEventStatus: (id: string, status: EventItem["status"]) => void;
  toggleFeatured: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  updateProfile: (patch: Partial<User>) => void;
  saveCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  saveVenue: (venue: Venue) => void;
  deleteVenue: (id: string) => void;
  saveReview: (review: Review) => void;
  deleteReview: (id: string) => void;
  // helpers
  categoryById: (id: string) => Category | undefined;
  venueById: (id: string) => Venue | undefined;
  eventById: (id: string) => EventItem | undefined;
  userById: (id: string) => User | undefined;
}

const EmbsContext = React.createContext<EmbsContextValue | null>(null);

export function EmbsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<EmbsState>(() => seedState());
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as EmbsState);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const value = React.useMemo<EmbsContextValue>(() => {
    const currentUser = state.users.find((u) => u.id === state.currentUserId) ?? null;

    return {
      ...state,
      currentUser,
      setCurrentUser: (id) => setState((s) => ({ ...s, currentUserId: id })),
      switchRole: (role) =>
        setState((s) => {
          const target = s.users.find((u) => u.role === role && u.status === "active");
          return target ? { ...s, currentUserId: target.id } : s;
        }),
      registerUser: ({ name, email, role }) => {
        const user: User = {
          id: randomId("usr"),
          name,
          email,
          role,
          status: "active",
          createdAt: new Date().toISOString(),
        };
        setState((s) => ({ ...s, users: [...s.users, user], currentUserId: user.id }));
        return user;
      },
      checkout: ({ eventId, items, paymentMethod, attendeeName }) => {
        const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
        const booking: Booking = {
          id: randomId("bkg"),
          ref: bookingRef(),
          userId: state.currentUserId ?? "usr-cust",
          eventId,
          items,
          total,
          status: "confirmed",
          paymentMethod,
          txRef: txReference(paymentMethod),
          createdAt: new Date().toISOString(),
        };
        const issued: Ticket[] = [];
        items.forEach((item) => {
          for (let i = 0; i < item.qty; i += 1) {
            issued.push({
              id: randomId("tk"),
              code: ticketCode(),
              bookingId: booking.id,
              eventId,
              tierName: item.tierName,
              attendeeName,
              price: item.price,
              checkedIn: false,
            });
          }
        });
        setState((s) => ({
          ...s,
          bookings: [booking, ...s.bookings],
          tickets: [...issued, ...s.tickets],
          events: s.events.map((e) =>
            e.id !== eventId
              ? e
              : {
                  ...e,
                  tiers: e.tiers.map((t) => {
                    const item = items.find((i) => i.tierId === t.id);
                    return item ? { ...t, sold: t.sold + item.qty } : t;
                  }),
                },
          ),
        }));
        return { booking, tickets: issued };
      },
      cancelBooking: (bookingId) =>
        setState((s) => ({
          ...s,
          bookings: s.bookings.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b)),
        })),
      toggleCheckIn: (ticketId) =>
        setState((s) => ({
          ...s,
          tickets: s.tickets.map((t) => (t.id === ticketId ? { ...t, checkedIn: !t.checkedIn } : t)),
        })),
      saveEvent: (event) =>
        setState((s) => ({
          ...s,
          events: s.events.some((e) => e.id === event.id)
            ? s.events.map((e) => (e.id === event.id ? event : e))
            : [event, ...s.events],
        })),
      deleteEvent: (id) => setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) })),
      updateEventStatus: (id, status) =>
        setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, status } : e)) })),
      toggleFeatured: (id) =>
        setState((s) => ({
          ...s,
          events: s.events.map((e) => (e.id === id ? { ...e, featured: !e.featured } : e)),
        })),
      toggleUserStatus: (id) =>
        setState((s) => ({
          ...s,
          users: s.users.map((u) =>
            u.id === id ? { ...u, status: u.status === "active" ? "suspended" : "active" } : u,
          ),
        })),
      updateProfile: (patch) =>
        setState((s) => ({
          ...s,
          users: s.users.map((u) => (u.id === s.currentUserId ? { ...u, ...patch } : u)),
        })),
      saveCategory: (category) =>
        setState((s) => ({
          ...s,
          categories: s.categories.some((c) => c.id === category.id)
            ? s.categories.map((c) => (c.id === category.id ? category : c))
            : [...s.categories, category],
        })),
      deleteCategory: (id) =>
        setState((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) })),
      saveVenue: (venue) =>
        setState((s) => ({
          ...s,
          venues: s.venues.some((v) => v.id === venue.id)
            ? s.venues.map((v) => (v.id === venue.id ? venue : v))
            : [...s.venues, venue],
        })),
      deleteVenue: (id) => setState((s) => ({ ...s, venues: s.venues.filter((v) => v.id !== id) })),
      saveReview: (review) =>
        setState((s) => ({
          ...s,
          reviews: s.reviews.some((r) => r.id === review.id)
            ? s.reviews.map((r) => (r.id === review.id ? review : r))
            : [review, ...s.reviews],
        })),
      deleteReview: (id) => setState((s) => ({ ...s, reviews: s.reviews.filter((r) => r.id !== id) })),
      categoryById: (id) => state.categories.find((c) => c.id === id),
      venueById: (id) => state.venues.find((v) => v.id === id),
      eventById: (id) => state.events.find((e) => e.id === id),
      userById: (id) => state.users.find((u) => u.id === id),
    };
  }, [state]);

  return <EmbsContext.Provider value={value}>{children}</EmbsContext.Provider>;
}

export function useEmbs(): EmbsContextValue {
  const ctx = React.useContext(EmbsContext);
  if (!ctx) throw new Error("useEmbs must be used inside EmbsProvider");
  return ctx;
}

export function tierAvailable(tier: { capacity: number; sold: number }) {
  return Math.max(0, tier.capacity - tier.sold);
}
