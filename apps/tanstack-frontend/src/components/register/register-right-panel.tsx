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
import { signUpSchema } from "@repo/sharedtypes";
import { useMutation } from "@tanstack/react-query";
import { signUpApi } from "#/api/auth.api";
import { terminalToast } from "#/components/ui/terminal-toast";

const inputClassName =
  "border-0 border-b border-border rounded-none bg-transparent h-12 shadow-none text-foreground focus-visible:ring-0 focus-visible:border-accent placeholder:text-input-label/30";

export function RegisterRightPanel() {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: signUpApi,
    onSuccess: (res) => {
      terminalToast.success("SUCCESS", res.message);
      navigate({ to: "/login" });
    },
    onError: (error) => {
      terminalToast.error(
        "ERROR",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    },
  });

  const registerForm = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      mutation.mutate({
        name: value.name,
        email: value.email,
        password: value.password,
      });
    },
  });

  return (
    <section className="flex-1">
      <div className="bg-surface border border-border p-8 md:p-12 relative">
        <div className="absolute top-0 right-0 w-2 h-2 bg-accent" />
        <form
          id="register-form"
          onSubmit={(e) => {
            e.preventDefault();
            registerForm.handleSubmit(e);
          }}
        >
          <FieldGroup className="flex flex-col gap-4">
            <registerForm.Field
              name="name"
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
                      FULL NAME
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="text"
                      value={field.state.value}
                      className={inputClassName}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="J. DOE"
                      autoComplete="name"
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

            <registerForm.Field
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

            <registerForm.Field
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
                      autoComplete="new-password"
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
            form="register-form"
            disabled={mutation.isPending}
            className="pl-0! text-2xl bg-transparent text-foreground tracking-widest font-black w-fit cursor-pointer"
          >
            {mutation.isPending ? "REGISTERING..." : "REGISTER"}
            <MoveRight strokeWidth={4} size={5} />
          </Button>
          <Link
            className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted hover:text-foreground"
            to="/login"
          >
            ALREADY REGISTERED? LOGIN
          </Link>
        </div>
        <div className="mt-12 pt-8 border-t border-border flex justify-between items-center text-input-label">
          <div className="flex flex-col">
            <span className="mono-label text-[10px]">Latency</span>
            <span className="font-mono text-sm font-bold text-foreground-muted">
              &lt; 5ms
            </span>
          </div>
          <div className="flex flex-col">
            <span className="mono-label text-[10px]">Uptime</span>
            <span className="font-mono text-sm font-bold text-foreground-muted">
              99.99%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="mono-label text-[10px]">Nodes</span>
            <span className="font-mono text-sm font-bold text-foreground-muted">
              GLOBAL
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
