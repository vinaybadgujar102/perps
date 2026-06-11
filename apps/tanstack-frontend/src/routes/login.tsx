import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MoveRight } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { loginSchema } from "@repo/sharedtypes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { loginApi } from "#/api/auth.api";
import { terminalToast } from "#/components/ui/terminal-toast";
export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: loginApi,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["login"] });
      localStorage.setItem("auth-token", res.data!.token);
      navigate({ to: "/dashboard" });
      terminalToast.success("SUCCESS", res.message);
    },
    onError: (error) => {
      terminalToast.error(
        "ERROR",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    },
  });

  const loginForm = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      console.log("form submitted", value);
      mutation.mutate({ email: value.email, password: value.password });
    },
  });

  return (
    <div className="flex h-screen items-center justify-center m-8">
      {/* Left Part */}
      <section className="flex-2">
        <div className="flex flex-col gap-14">
          <div className="gap-4 flex flex-col">
            <div>
              <h3 className="text-[#ff3d00] mono-label">TERMINAL.V2.0</h3>
            </div>
            <div className="display-xl text-foreground">
              <h1>ACCESS</h1>
              <h1>TERMINAL</h1>
            </div>
            <div className="text-negative mono-label text-2xl">
              <h4>Sign in to your high-performance trading dashboard. </h4>
              <h4> Absolute precision and security in every execution.</h4>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <p className="mono-label text-negative">Liquidity Score: 99.8%</p>
            <div className="h-px w-20 bg-foreground" />
            <p className="mono-label text-negative">Latency: 2MS</p>
          </div>
        </div>
      </section>

      {/* Form Part Right */}
      <section className="flex-1 border-l-foreground-muted border-l">
        {/* Form */}
        <div className="p-8 flex flex-col gap-4 grow-0">
          <form
            id="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              loginForm.handleSubmit(e);
            }}
          >
            <FieldGroup className="flex flex-col gap-4">
              <loginForm.Field
                name="email"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field
                      className="flex flex-col gap-1.5"
                      data-invalid={isInvalid}
                    >
                      <FieldLabel
                        htmlFor={field.name}
                        className="text-neutral-400 tracking-wider text-xs"
                      >
                        EMAIL
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        className="bg-foreground h-12 placeholder:text-gray-400"
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="USER@PERPS.IO"
                        autoComplete="off"
                      />
                      {isInvalid && (
                        <FieldError
                          className="text-accent"
                          errors={field.state.meta.errors}
                        />
                      )}
                    </Field>
                  );
                }}
              />

              <loginForm.Field
                name="password"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field
                      className="flex flex-col gap-1.5"
                      data-invalid={isInvalid}
                    >
                      <FieldLabel
                        htmlFor={field.name}
                        className="text-neutral-400 tracking-wider text-xs"
                      >
                        PASSWORD
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="bg-foreground h-12 placeholder:text-gray-400"
                        onBlur={field.handleBlur}
                        aria-invalid={isInvalid}
                        placeholder="USER@PERPS.IO"
                        autoComplete="off"
                      />
                      {isInvalid && (
                        <FieldError
                          className="text-accent"
                          errors={field.state.meta.errors}
                        />
                      )}
                    </Field>
                  );
                }}
              />
            </FieldGroup>
          </form>
          <Button
            type="submit"
            form="login-form"
            className="pl-0! text-xl bg-transparent text-foreground tracking-widest font-extrabold w-fit cursor-pointer"
          >
            LOGIN
            <MoveRight strokeWidth={4} size={5} />
          </Button>
          <Link
            className="text-neutral-600 text-xs hover:underline-offset-4 hover:underline hover:text-foreground"
            to="/register"
          >
            NO ACCOUNT? CREATE ONE
          </Link>
        </div>

        {/* Bottom animating line */}
        <div className="relative w-full h-px overflow-hidden bg-border mb-4">
          <div className="absolute top-0 left-0 h-px w-24 bg-accent animate-shimmer" />
        </div>
      </section>
    </div>
  );
}
