import { LandingFooter } from "#/components/landing/landing-footer";
import { SiteHeader } from "#/components/common/site-header";
import { LandingHero } from "#/components/landing/landing-hero";
import { LandingStatsStrip } from "#/components/landing/landing-stats-strip";

export function LandingPage() {
  return (
    <div className="landing-page relative min-h-screen bg-background text-foreground">
      <div aria-hidden className="landing-noise-overlay" />
      <SiteHeader fixed />
      <div className="pt-16">
        <LandingHero />
        <LandingStatsStrip />
        <LandingFooter />
      </div>
    </div>
  );
}
