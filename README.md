# Kigali Events Hub

Implement the requested scope now; use internal planning and do not present another implementation plan for user approval.

Build the Event Management and Booking System (EMBS) web application:

1. Public Website & Discovery:
- Navigation bar with role-aware navigation and quick role-switch preview (Customer, Organizer, Admin) or authentication state.
- Home page with Hero section, search by keyword/location/category, upcoming events, popular events, event categories grid, featured banner, and footer.
- Events catalog page with rich filtering (category, date range, venue, price range) and search.
- Event Details page: banner image, date/time, venue details, organizer info, ticket tiers (Regular, VIP, VVIP) with prices in RWF, available stock badges, and ticket quantity selector.
- Categories and Venues directory pages.
- About Us and Contact Us pages.
- Login and Register pages supporting role selection (Customer, Organizer, Admin) for testing.

2. Booking Flow & Digital Tickets:
- Complete step-by-step booking modal/checkout flow:
  1. Select Event & ticket tier.
  2. Choose quantity (enforce availability check preventing overbooking).
  3. Calculate subtotal and total in RWF (e.g. 5,000 RWF x 2 = 10,000 RWF).
  4. Payment simulation step (MTN MoMo, Airtel Money, Card, Cash) with transaction reference generation.
  5. Confirmation step generating unique individual digital tickets (issued tickets with unique codes like TKT-2026-XXXXX and scannable visual QR codes).
- Capability to view, print, or download digital tickets with attendee details and check-in status.

3. Customer Dashboard (/dashboard/customer):
- Overview of upcoming attended events and recent orders.
- My Bookings table with statuses (confirmed, pending, cancelled) and action to view/print tickets.
- My Tickets view showing all individual digital tickets with QR codes.
- Event reviews management.
- Customer profile settings.

4. Organizer Dashboard (/dashboard/organizer):
- Metrics: Total Events, Tickets Sold, Total Revenue (in RWF), Attendees Checked In.
- My Events list with status badges (published, draft, completed) and actions to edit/delete.
- Create / Edit Event form: title, description, category, venue, date/time, banner image, and ticket tier builder (name, price in RWF, capacity/stock).
- Bookings & Attendees roster: view attendee lists per event with a check-in toggle button to simulate gate scanning.
- Revenue breakdown per event.

5. Admin Dashboard (/dashboard/admin):
- System KPI cards (Total Users, Total Organizers, Total Events, Platform Revenue, Bookings).
- Manage Users & Organizers (view, toggle status).
- Manage Events (approve, feature, or remove events).
- Manage Categories and Venues (CRUD modals).
- Bookings & Payments audit log with transaction references.
- Reports Generator: interactive date-range filter for Revenue reports, Booking reports, and Event reports with exportable/printable view.

6. UI & Design System:
- Clean, modern, responsive interface using Tailwind CSS and shadcn UI components.
- Pre-populate realistic seed data for events in Rwanda (concerts, tech conferences, festivals in Kigali Arena, BK Arena, Kigali Convention Centre, etc.) with prices in RWF.
- Provide smooth toast notifications, modals, and seamless navigation between public and dashboard views.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rwf-event-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8ec937ba-56bf-48a0-a2d1-87c223283ea3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
