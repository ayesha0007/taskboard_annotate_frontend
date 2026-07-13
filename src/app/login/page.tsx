"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { tokenStorage } from "@/lib/auth";

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/login/`, { email, password });
      tokenStorage.setTokens(data.access, data.refresh);
      router.replace("/tasks");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-panel border border-border rounded-card p-8 flex flex-col gap-4"
      >
        <div className="mb-2">
          <h1 className="font-display font-bold text-2xl text-ink">Welcome back</h1>
          <p className="text-sm text-muted mt-1">Log in to manage your tasks and annotations.</p>
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">Email</label>
          <Input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">Password</label>
          <Input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </main>
  );
}
