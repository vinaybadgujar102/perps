import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Link, useNavigate } from "@tanstack/react-router";
import { MoveRight } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { loginSchema } from "@repo/sharedtypes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginApi } from "#/api/auth.api";
import { terminalToast } from "#/components/ui/terminal-toast";
import { useUser } from "#/context/user-context";

const inputClassName =
  "border-0 border-b border-border rounded-none bg-transparent h-12 shadow-none text-foreground focus-visible:ring-0 focus-visible:border-accent placeholder:text-input-label/30";

const DEMO_EMAIL = "demo@perps.local";
const DEMO_PASSWORD = "demo1234";

export function LoginRightPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setSession } = useUser();
  const mutation = useMutation({
    mutationFn: loginApi,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["login"] });
      setSession({
        token: res.data!.token,
        user: res.data!.user,
      });
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
      mutation.mutate({ email: value.email, password: value.password });
    },
  });

  return (
    <section className="flex-1">
      <div className="bg-surface border border-border p-8 md:p-12 relative">
        <div className="absolute top-0 right-0 w-2 h-2 bg-accent" />
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
                    className="group flex flex-col gap-1.5"
                    data-invalid={isInvalid}
                  >
                    <FieldLabel
                      htmlFor={field.name}
                      className="mono-label text-input-label group-focus-within:text-accent"
                    >
                      EMAIL ADDRESS
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      className={inputClassName}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="TRADER@PERPS.IO"
                      autoComplete="email"
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
                    className="group flex flex-col gap-1.5"
                    data-invalid={isInvalid}
                  >
                    <FieldLabel
                      htmlFor={field.name}
                      className="mono-label text-input-label group-focus-within:text-accent"
                    >
                      PASSWORD
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className={inputClassName}
                      onBlur={field.handleBlur}
                      aria-invalid={isInvalid}
                      placeholder="••••••••"
                      autoComplete="current-password"
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
        <div className="pt-6 flex flex-col gap-6">
          <Button
            type="submit"
            form="login-form"
            disabled={mutation.isPending}
            className="pl-0! text-2xl bg-transparent text-foreground tracking-widest font-black w-fit cursor-pointer"
          >
            {mutation.isPending ? "LOGGING IN..." : "LOGIN"}
            <MoveRight strokeWidth={4} size={5} />
          </Button>
          <p className="font-mono text-[10px] tracking-widest text-foreground-muted lowercase">
            demo: {DEMO_EMAIL} / {DEMO_PASSWORD}
          </p>
          <Link
            className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted hover:text-foreground"
            to="/register"
          >
            NO ACCOUNT? CREATE ONE
          </Link>
        </div>
      </div>
    </section>
  );
}
