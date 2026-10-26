
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Login failed. Please check your details."
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError(
        "Backend se connection nahi ho raha. Check karo backend running hai."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">MOTIVUS</div>

        <p className="login-eyebrow">
          LOGISTICS OPERATIONS PLATFORM
        </p>

        <h1>Welcome back</h1>

        <p className="login-description">
          Sign in to access your logistics workspace.
        </p>

        <form onSubmit={handleLogin} className="login-form">
          <label htmlFor="email">Email address</label>

          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <div className="password-label-row">
            <label htmlFor="password">Password</label>

            <Link
              href="/forgot-password"
              className="forgot-password-link"
            >
              Forgot password?
            </Link>
          </div>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="login-footer">
          Authorized users only. Contact your administrator if you need
          access.
        </p>
      </section>
    </main>
  );
}
