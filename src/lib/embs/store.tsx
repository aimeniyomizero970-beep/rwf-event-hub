import * as React from "react";
import { seedState } from "./seed";
import { bookingRef, randomId, ticketCode, txReference } from "./format";
import { api, getBackendStatus } from "@/lib/api/client";
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

function eventPayload(event: EventItem) {
  return {
    title: event.title,
    description: event.description,
    categoryId: event.categoryId,
    venueId: event.venueId,
    date: event.date,
    endTime: event.endTime,
    banner: event.banner,
    status: event.status,
    featured: event.featured,
    tiers: event.tiers.map((t) => ({ name: t.name, price: t.price, capacity: t.capacity })),
  };
}

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
  backendReady: boolean;
  setCurrentUser: (id: string | null) => void;
  switchRole: (role: Role) => void;
  registerUser: (input: { name: string; email: string; role: Role }) => User;
  signInWithApi: (email: string, password: string) => Promise<{ user?: User; error?: string }>;
  signUpWithApi: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ user?: User; error?: string; needsEmailConfirmation?: boolean }>;
  signOutWithApi: () => Promise<void>;
  refreshFromBackend: () => Promise<void>;
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
  const [backendReady, setBackendReady] = React.useState(false);

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

  const refreshFromBackend = React.useCallback(async () => {
    const status = await getBackendStatus(true);
    const ready = Boolean(status?.supabase);
    setBackendReady(ready);
    if (!ready) return;

    try {
      const [cats, vens, evs, revs, meRes] = await Promise.all([
        api.listCategories(),
        api.listVenues(),
        api.listEvents(),
        api.listReviews(),
        api.me(),
      ]);

      setState((s) => {
        const next: EmbsState = { ...s };
        if (cats.ok && Array.isArray(cats.data) && cats.data.length > 0) {
          next.categories = cats.data as Category[];
        }
        if (vens.ok && Array.isArray(vens.data) && vens.data.length > 0) {
          next.venues = vens.data as Venue[];
        }
        if (evs.ok && Array.isArray(evs.data)) {
          next.events = evs.data as EventItem[];
        }
        if (revs.ok && Array.isArray(revs.data) && revs.data.length > 0) {
          next.reviews = revs.data as Review[];
        }
        const apiUser = meRes.ok ? ((meRes.data as { user?: User } | null)?.user ?? null) : null;
        if (apiUser) {
          next.users = s.users.some((u) => u.id === apiUser.id)
            ? s.users.map((u) => (u.id === apiUser.id ? apiUser : u))
            : [apiUser, ...s.users];
          next.currentUserId = apiUser.id;
        }
        return next;
      });
    } catch {
      /* keep local state on failure */
    }
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    void refreshFromBackend();
  }, [hydrated, refreshFromBackend]);

  const value = React.useMemo<EmbsContextValue>(() => {
    const currentUser = state.users.find((u) => u.id === state.currentUserId) ?? null;

    return {
      ...state,
      currentUser,
      backendReady,
      refreshFromBackend,
      setCurrentUser: (id) => setState((s) => ({ ...s, currentUserId: id })),
      signInWithApi: async (email, password) => {
        const res = await api.login({ email, password });
        const user = res.ok ? ((res.data as { user?: User } | null)?.user ?? null) : null;
        if (!user) return { error: res.error ?? "Sign in failed" };
        setState((s) => ({
          ...s,
          users: s.users.some((u) => u.id === user.id)
            ? s.users.map((u) => (u.id === user.id ? user : u))
            : [user, ...s.users],
          currentUserId: user.id,
        }));
        return { user };
      },
      signUpWithApi: async ({ name, email, password }) => {
        const res = await api.register({ name, email, password });
        const payload = res.data as { user?: User; needsEmailConfirmation?: boolean } | null;
        if (!res.ok) return { error: res.error ?? "Registration failed" };
        const user = payload?.user ?? null;
        if (payload?.needsEmailConfirmation || !user) {
          return { user: user ?? undefined, needsEmailConfirmation: true };
        }
        setState((s) => ({
          ...s,
          users: s.users.some((u) => u.id === user.id)
            ? s.users.map((u) => (u.id === user.id ? user : u))
            : [user, ...s.users],
          currentUserId: user.id,
        }));
        return { user };
      },
      signOutWithApi: async () => {
        await api.logout();
        setState((s) => ({ ...s, currentUserId: null }));
      },
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
      saveEvent: (event) => {
        const exists = state.events.some((e) => e.id === event.id);
        setState((s) => ({
          ...s,
          events: exists
            ? s.events.map((e) => (e.id === event.id ? event : e))
            : [event, ...s.events],
        }));
        if (backendReady) {
          const payload = eventPayload(event);
          const call = exists ? api.updateEvent(event.id, payload) : api.createEvent(payload);
          void call.then(() => refreshFromBackend()).catch(() => {});
        }
      },
      deleteEvent: (id) => {
        setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
        if (backendReady) void api.deleteEvent(id).then(() => refreshFromBackend()).catch(() => {});
      },
      updateEventStatus: (id, status) => {
        setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, status } : e)) }));
        if (backendReady) void api.updateEvent(id, { status }).then(() => refreshFromBackend()).catch(() => {});
      },
      toggleFeatured: (id) => {
        const current = state.events.find((e) => e.id === id);
        setState((s) => ({
          ...s,
          events: s.events.map((e) => (e.id === id ? { ...e, featured: !e.featured } : e)),
        }));
        if (backendReady && current) {
          void api
            .updateEvent(id, { featured: !current.featured })
            .then(() => refreshFromBackend())
            .catch(() => {});
        }
      },
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
      saveCategory: (category) => {
        const exists = state.categories.some((c) => c.id === category.id);
        setState((s) => ({
          ...s,
          categories: exists
            ? s.categories.map((c) => (c.id === category.id ? category : c))
            : [...s.categories, category],
        }));
        if (backendReady) {
          const payload = {
            name: category.name,
            slug: category.slug,
            description: category.description,
            image: category.image,
          };
          const call = exists ? api.updateCategory(category.id, payload) : api.createCategory(payload);
          void call.then(() => refreshFromBackend()).catch(() => {});
        }
      },
      deleteCategory: (id) => {
        setState((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) }));
        if (backendReady) void api.deleteCategory(id).then(() => refreshFromBackend()).catch(() => {});
      },
      saveVenue: (venue) => {
        const exists = state.venues.some((v) => v.id === venue.id);
        setState((s) => ({
          ...s,
          venues: exists
            ? s.venues.map((v) => (v.id === venue.id ? venue : v))
            : [...s.venues, venue],
        }));
        if (backendReady) {
          const payload = {
            name: venue.name,
            city: venue.city,
            address: venue.address,
            capacity: venue.capacity,
            description: venue.description,
            image: venue.image,
          };
          const call = exists ? api.updateVenue(venue.id, payload) : api.createVenue(payload);
          void call.then(() => refreshFromBackend()).catch(() => {});
        }
      },
      deleteVenue: (id) => {
        setState((s) => ({ ...s, venues: s.venues.filter((v) => v.id !== id) }));
        if (backendReady) void api.deleteVenue(id).then(() => refreshFromBackend()).catch(() => {});
      },
      saveReview: (review) => {
        setState((s) => ({
          ...s,
          reviews: s.reviews.some((r) => r.id === review.id)
            ? s.reviews.map((r) => (r.id === review.id ? review : r))
            : [review, ...s.reviews],
        }));
        if (backendReady) {
          void api
            .createReview({ eventId: review.eventId, rating: review.rating, comment: review.comment })
            .then(() => refreshFromBackend())
            .catch(() => {});
        }
      },
      deleteReview: (id) => {
        setState((s) => ({ ...s, reviews: s.reviews.filter((r) => r.id !== id) }));
        if (backendReady) void api.deleteReview(id).then(() => refreshFromBackend()).catch(() => {});
      },
      categoryById: (id) => state.categories.find((c) => c.id === id),
      venueById: (id) => state.venues.find((v) => v.id === id),
      eventById: (id) => state.events.find((e) => e.id === id),
      userById: (id) => state.users.find((u) => u.id === id),
    };
  }, [state, backendReady, refreshFromBackend]);

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
