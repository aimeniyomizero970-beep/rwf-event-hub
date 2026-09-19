import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SiteLayout } from "@/components/embs/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact EMBS Rwanda" },
      {
        name: "description",
        content: "Reach the EMBS Rwanda team in Kigali for ticketing support, partnerships and organizer onboarding.",
      },
      { property: "og:title", content: "Contact EMBS Rwanda" },
      { property: "og:description", content: "Talk to our Kigali team about tickets, events and partnerships." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sending, setSending] = React.useState(false);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      (e.target as HTMLFormElement).reset();
      toast.success("Message sent — our team replies within one business day.");
    }, 800);
  };

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Contact us"
        title="Talk to the EMBS team"
        subtitle="Questions about a booking, an event listing or a partnership? We're in Kigali and happy to help."
      />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="p-6">
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required placeholder="you@example.com" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" required placeholder="How can we help?" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" required rows={6} placeholder="Tell us more…" />
              </div>
              <Button type="submit" disabled={sending} className="sm:col-span-2 sm:w-fit">
                {sending ? "Sending…" : "Send message"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {[
            { icon: MapPin, label: "Office", value: "KG 7 Ave, Kacyiru, Kigali, Rwanda" },
            { icon: Phone, label: "Phone", value: "+250 788 000 111" },
            { icon: Mail, label: "Email", value: "hello@embs.rw" },
            { icon: Clock, label: "Hours", value: "Mon–Fri, 08:00 – 18:00 CAT" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="flex items-start gap-3 p-5">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="size-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="font-medium">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
