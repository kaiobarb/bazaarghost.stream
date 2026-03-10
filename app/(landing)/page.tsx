import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  Monitor,
  Search,
  Bot,
  Radio,
  Users,
  Shield,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getGlobalStats } from "@/lib/server-utils";

export const revalidate = 3600; // ISR: 1 hour

export default async function LandingPage() {
  const stats = await getGlobalStats();

  return (
    <main className="min-h-screen">
      {/* ----------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Subtle gradient backdrop */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-24 text-center">
          <div className="mx-auto mb-6 flex items-center justify-center">
            <Image
              src="/logo.svg"
              alt="BazaarGhost logo"
              width={72}
              height={45}
              className="object-contain"
              priority
            />
          </div>

          <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            See who&rsquo;s ghosting your
            <br className="hidden sm:block" /> favorite streamers
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            BazaarGhost watches thousands of Bazaar streams on Twitch, detects
            opponent usernames from matchup screens, and lets you search across
            every VOD &mdash; instantly.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2 text-base">
              <Link href="/search">
                <Search className="size-4" />
                Start searching
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="gap-2 text-base"
            >
              <a
                href="https://discord.gg/a5wRFRe6m3"
                target="_blank"
                rel="noopener noreferrer"
              >
                Join the Discord
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* How It Works                                                      */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-5xl px-6">
          <SectionHeading
            title="How it works"
            subtitle="From live stream to searchable matchup in three steps."
          />

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            <Step
              number={1}
              icon={<Monitor className="size-5" />}
              title="We watch"
              description="Our system monitors Bazaar streams on Twitch around the clock. When a new VOD appears, it gets queued for processing."
            />
            <Step
              number={2}
              icon={<Eye className="size-5" />}
              title="We detect"
              description="We scan matchup screens and use OCR to extract opponent usernames, timestamps, and confidence scores from every frame that matters."
            />
            <Step
              number={3}
              icon={<Search className="size-5" />}
              title="You search"
              description="Find any player across thousands of VODs. See when they appeared, against whom, and jump straight to the moment in the stream."
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Discord Bot                                                       */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-b border-border bg-card/30 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <SectionHeading
            title="The Discord bot"
            subtitle="Get ghost alerts delivered straight to your server."
          />

          <div className="mt-14 grid items-center gap-12 lg:grid-cols-2">
            {/* Mock Discord message */}
            <div className="rounded-xl border border-border bg-[#2b2d31] p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <Bot className="size-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary">
                      BazaarGhost
                    </span>
                    <span className="rounded bg-primary/20 px-1 py-0.5 text-[10px] font-medium text-primary">
                      BOT
                    </span>
                    <span className="text-xs text-[#949ba4]">
                      Today at 3:42 PM
                    </span>
                  </div>
                  {/* Embed card */}
                  <div className="mt-2 rounded border-l-4 border-primary bg-[#1e1f22] p-3">
                    <p className="text-xs font-semibold text-[#f2f3f5]">
                      Ghost Detected
                    </p>
                    <p className="mt-1 text-xs text-[#dbdee1]">
                      <span className="font-medium text-[#f2f3f5]">
                        PlayerName
                      </span>{" "}
                      spotted in{" "}
                      <span className="font-medium text-[#f2f3f5]">
                        StreamerName
                      </span>
                      &apos;s stream
                    </p>
                    <p className="mt-1.5 text-[11px] text-[#949ba4]">
                      VOD 2345678901 &middot; 01:23:45 &middot; Confidence: 94%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature list */}
            <div className="space-y-6">
              <Feature
                icon={<Radio className="size-4" />}
                title="Real-time alerts"
                description="Get notified the moment a ghost is detected in a live or recent stream. No more manually checking VODs."
              />
              <Feature
                icon={<Users className="size-4" />}
                title="Per-channel watchlists"
                description="Configure which streamers or players each channel tracks. Dedicated channels for different communities."
              />
              <Feature
                icon={<MessageSquare className="size-4" />}
                title="Slash commands"
                description="Look up any player's ghost history, check streamer stats, or manage your watchlist — all from Discord."
              />
              <div className="pt-2">
                <Button asChild variant="outline" className="gap-2">
                  <a
                    href="https://discord.gg/a5wRFRe6m3"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg
                      role="img"
                      viewBox="0 0 24 24"
                      className="size-4"
                      fill="currentColor"
                    >
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                    </svg>
                    Join the Discord
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* For Streamers                                                     */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-5xl px-6">
          <SectionHeading
            title="For streamers"
            subtitle="Curious who's sniping your games? We've got you covered."
          />

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Eye className="size-5 text-primary" />
                </div>
                <h3 className="font-serif text-lg font-semibold">
                  Your ghost history
                </h3>
                <p className="text-sm text-muted-foreground">
                  See every opponent detected across all your VODs. Filter by
                  player, date, or VOD to find repeat offenders.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="size-5 text-primary" />
                </div>
                <h3 className="font-serif text-lg font-semibold">
                  Request tracking
                </h3>
                <p className="text-sm text-muted-foreground">
                  Not in our system yet? Reach out and we&rsquo;ll add your
                  channel. We process your VOD backlog automatically.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card sm:col-span-2 lg:col-span-1">
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Bot className="size-5 text-primary" />
                </div>
                <h3 className="font-serif text-lg font-semibold">
                  Discord integration
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add the bot to your server and get real-time alerts when a
                  known player appears in your stream.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 text-center">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/contact">
                Get in touch
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Final CTA                                                         */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to find some ghosts?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Search across {stats.matchups.toLocaleString()} matchups from{" "}
            {stats.vods.toLocaleString()} VODs. Free, no account required.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2 text-base">
              <Link href="/search">
                <Search className="size-4" />
                Start searching
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="gap-2 text-base"
            >
              <Link href="/donate">
                Support the project
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Footer                                                            */}
      {/* ----------------------------------------------------------------- */}
      <footer className="border-t border-border bg-card/30 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 text-center text-sm text-muted-foreground">
          <div className="flex items-center gap-6">
            <Link
              href="/how-it-works"
              className="hover:text-foreground transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/contact"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/donate"
              className="hover:text-foreground transition-colors"
            >
              Donate
            </Link>
            <a
              href="https://discord.gg/a5wRFRe6m3"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Discord
            </a>
          </div>
          <p>
            Built by{" "}
            <a
              href="https://discord.gg/a5wRFRe6m3"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground/80 hover:text-foreground"
            >
              Liftaris
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components (co-located — landing page only)                            */
/* -------------------------------------------------------------------------- */

/** Section heading with title and optional subtitle. */
function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center">
      <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Numbered step card for the "How it works" section. */
function Step({
  number,
  icon,
  title,
  description,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm">
        {icon}
      </div>
      <span className="mb-1 font-mono text-xs text-muted-foreground">
        Step {number}
      </span>
      <h3 className="font-serif text-xl font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

/** Feature item for the Discord bot section. */
function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
