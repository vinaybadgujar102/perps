import { createFileRoute } from "@tanstack/react-router";
import { LoginLeftPanel } from "#/components/login/login-left-panel";
import { LoginRightPanel } from "#/components/login/login-right-panel";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex h-screen items-center justify-center m-8">
      <LoginLeftPanel />
      <LoginRightPanel />
    </div>
  );
}
