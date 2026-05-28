import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { signup } from "../lib/auth-api";

export const SignupScreen = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      await signup({ name, email, password });
      await navigate({ to: "/login", search: { registered: "1" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <main className="auth-screen">
      <div className="panel auth-card">
        <div className="auth-card-header">
          <span className="brand-mark">MM</span>
          <h1>Create account</h1>
          <p>Start trading on Market Maker</p>
        </div>

        <form className="trade-form auth-form" onSubmit={handleSubmit}>
          <label htmlFor="signup-name">Name</label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />

          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="primary-button" disabled={isPending}>
            {isPending ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
};
