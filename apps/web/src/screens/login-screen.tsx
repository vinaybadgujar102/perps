import { BrandMark } from "@/components/layout/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/stores/auth-store";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginScreen = () => {
  const navigate = useNavigate();
  const { registered } = useSearch({ from: "/login" });
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginForm) => {
    try {
      await login(values.email, values.password);
      await navigate({ to: "/trade/$symbol", params: { symbol: "BTC" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to sign in");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <BrandMark className="mb-2 size-10 text-sm" />
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Access your Market Maker account</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {registered === "1" ? (
            <Alert>
              <AlertDescription>Account created. Sign in to continue.</AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            No account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Create one
            </Link>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
};
