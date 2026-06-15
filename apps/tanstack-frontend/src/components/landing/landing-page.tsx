import { LandingFooter } from "#/components/landing/landing-footer";
import { LandingHeader } from "#/components/landing/landing-header";
import { LandingHero } from "#/components/landing/landing-hero";
import { LandingStatsStrip } from "#/components/landing/landing-stats-strip";

export function LandingPage() {
  return (
    <div className="landing-page relative h-screen overflow-hidden bg-background text-foreground">
      <div aria-hidden className="landing-noise-overlay" />
      <LandingHeader />
      <LandingHero />
      <LandingStatsStrip />
      <LandingFooter />
    </div>
  );
}
