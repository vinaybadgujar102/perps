import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "../context/auth-context";

export const LoginScreen = () => {
  const navigate = useNavigate();
  const { registered } = useSearch({ from: "/login" });
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      await login(email, password);
      await navigate({ to: "/trade/$symbol", params: { symbol: "BTC" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <main className="auth-screen">
      <div className="panel auth-card">
        <div className="auth-card-header">
          <span className="brand-mark">MM</span>
          <h1>Sign in</h1>
          <p>Access your Market Maker account</p>
        </div>

        {registered === "1" ? (
          <p className="auth-banner" role="status">
            Account created. Sign in to continue.
          </p>
        ) : null}

        <form className="trade-form auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="primary-button" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-footer">
          No account?{" "}
          <Link to="/signup" className="auth-link">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
};
