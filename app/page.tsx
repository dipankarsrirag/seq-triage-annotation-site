"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Login failed");
        setSubmitting(false);
        return;
      }

      const data = await res.json();
      router.push(data.role === "admin" ? "/admin" : "/annotate");
      router.refresh();
    } catch (err: any) {
      setError(String(err?.message ?? err));
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Triage Acuity Annotation</h1>
        <p className="subtitle">
          You will review 50 simulated nurse-patient triage conversations. At
          several points during each conversation you can either commit an
          acuity label (ESI 1-5) or defer to see more of the conversation
          first. After you commit, you will see the full conversation and can
          confirm or change your answer.
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && <div className="error-banner">{error}</div>}

          <button
            type="submit"
            className="primary-button"
            disabled={submitting || !username || !password}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
