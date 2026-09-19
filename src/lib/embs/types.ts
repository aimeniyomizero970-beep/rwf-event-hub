export type Role = "customer" | "organizer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  status: "active" | "suspended";
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  capacity: number;
  description: string;
  image: string;
}

export type TierName = "Regular" | "VIP" | "VVIP";

export interface TicketTier {
  id: string;
  name: TierName | string;
  price: number;
  capacity: number;
  sold: number;
}

export type EventStatus = "published" | "draft" | "completed" | "pending";

export interface EventItem {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  venueId: string;
  organizerId: string;
  date: string;
  endTime: string;
  banner: string;
  status: EventStatus;
  featured: boolean;
  tiers: TicketTier[];
}

export type PaymentMethod = "MTN MoMo" | "Airtel Money" | "Card" | "Cash";
export type BookingStatus = "confirmed" | "pending" | "cancelled";

export interface BookingItem {
  tierId: string;
  tierName: string;
  qty: number;
  price: number;
}

export interface Booking {
  id: string;
  ref: string;
  userId: string;
  eventId: string;
  items: BookingItem[];
  total: number;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  txRef: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  code: string;
  bookingId: string;
  eventId: string;
  tierName: string;
  attendeeName: string;
  price: number;
  checkedIn: boolean;
}

export interface Review {
  id: string;
  eventId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface EmbsState {
  users: User[];
  categories: Category[];
  venues: Venue[];
  events: EventItem[];
  bookings: Booking[];
  tickets: Ticket[];
  reviews: Review[];
  currentUserId: string | null;
}
