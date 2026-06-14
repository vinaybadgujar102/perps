import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "#/components/landing/landing-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "PERPS.IO | The Future of Perpetuals" }],
  }),
  component: LandingPage,
});
