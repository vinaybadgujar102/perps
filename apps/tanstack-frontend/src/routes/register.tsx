import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "#/components/common/site-header";
import { RegisterLeftPanel } from "#/components/register/register-left-panel";
import { RegisterRightPanel } from "#/components/register/register-right-panel";
import { redirectIfAuthenticated } from "#/lib/require-auth";

export const Route = createFileRoute("/register")({
  beforeLoad: redirectIfAuthenticated,
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex flex-1 items-center justify-center m-8">
        <RegisterLeftPanel />
        <RegisterRightPanel />
      </div>
    </div>
  );
}
