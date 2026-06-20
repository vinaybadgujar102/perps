import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "#/components/landing/landing-page";
import { redirectIfAuthenticated } from "#/lib/require-auth";

export const Route = createFileRoute("/")({
  beforeLoad: redirectIfAuthenticated,
  head: () => ({
    meta: [{ title: "PERPS.IO | The Future of Perpetuals" }],
  }),
  component: LandingPage,
});
