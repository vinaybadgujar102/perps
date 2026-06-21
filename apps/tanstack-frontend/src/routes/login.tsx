import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "#/components/common/site-header";
import { LoginLeftPanel } from "#/components/login/login-left-panel";
import { LoginRightPanel } from "#/components/login/login-right-panel";
import { redirectIfAuthenticated } from "#/lib/require-auth";

export const Route = createFileRoute("/login")({
  beforeLoad: redirectIfAuthenticated,
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex flex-1 items-center justify-center m-8">
        <LoginLeftPanel />
        <LoginRightPanel />
      </div>
    </div>
  );
}
