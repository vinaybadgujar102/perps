import { createFileRoute } from "@tanstack/react-router";
import { RegisterLeftPanel } from "#/components/register/register-left-panel";
import { RegisterRightPanel } from "#/components/register/register-right-panel";

export const Route = createFileRoute("/register")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex h-screen items-center justify-center m-8">
      <RegisterLeftPanel />
      <RegisterRightPanel />
    </div>
  );
}
