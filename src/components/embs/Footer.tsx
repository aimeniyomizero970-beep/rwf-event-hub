import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, Phone, Ticket, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t bg-sidebar text-sidebar-foreground no-print">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Ticket className="size-5" />
            </span>
            <span className="text-lg font-bold">EMBS.rw</span>
          </div>
          <p className="mt-4 text-sm text-sidebar-foreground/70">
            Rwanda's event management and booking system — discover events, book tickets in RWF and
            check in with a digital QR pass.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide">Explore</h4>
          <ul className="mt-4 space-y-2 text-sm text-sidebar-foreground/70">
            <li>
              <Link to="/events" className="hover:text-sidebar-primary">
                All events
              </Link>
            </li>
            <li>
              <Link to="/categories" className="hover:text-sidebar-primary">
                Categories
              </Link>
            </li>
            <li>
              <Link to="/venues" className="hover:text-sidebar-primary">
                Venues
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide">Company</h4>
          <ul className="mt-4 space-y-2 text-sm text-sidebar-foreground/70">
            <li>
              <Link to="/about" className="hover:text-sidebar-primary">
                About us
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-sidebar-primary">
                Contact us
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-sidebar-primary">
                Become an organizer
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide">Get in touch</h4>
          <ul className="mt-4 space-y-3 text-sm text-sidebar-foreground/70">
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" /> KG 7 Ave, Kigali, Rwanda
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0" /> +250 788 000 111
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 shrink-0" /> hello@embs.rw
            </li>
          </ul>
          <div className="mt-4 flex gap-3 text-sidebar-foreground/70">
            <Twitter className="size-4" />
            <Instagram className="size-4" />
            <Facebook className="size-4" />
          </div>
        </div>
      </div>
      <div className="border-t border-sidebar-border py-5 text-center text-xs text-sidebar-foreground/60">
        © {new Date().getFullYear()} EMBS Rwanda. All prices in Rwandan Francs (RWF).
      </div>
    </footer>
  );
}
