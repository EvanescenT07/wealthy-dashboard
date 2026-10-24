"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, ShieldCheck } from "lucide-react";
import { ThemeToggleCircular } from "@/components/layout/ThemeToggleCircular";

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passcode.trim()) {
      setErrorMessage("Enter your dashboard passcode.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      const data = (await response.json()) as {
        authenticated?: boolean;
        error?: string;
      };

      if (!response.ok || !data.authenticated) {
        setErrorMessage(
          data.error ?? "Invalid passcode. Please verify your APP_PASSCODE."
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error: unknown) {
      console.error("[LoginPage] Login request failed:", error);
      setErrorMessage("Network error while verifying passcode.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-12">
      <div className="fixed right-5 top-5 z-20">
        <ThemeToggleCircular />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        aria-labelledby="login-heading"
        className="w-full max-w-md rounded-2xl border border-borderSubtle bg-surface p-7 shadow-lg sm:p-8"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accentPrimary text-lg font-extrabold text-white">
            W
          </div>
          <div>
            <h1
              id="login-heading"
              className="text-xl font-extrabold tracking-tight text-textPrimary"
            >
              WealthyDashboard
            </h1>
            <p className="text-xs text-textSecondary">
              Protected Personal Finance &amp; Multi-Wallet Ledger
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label
              htmlFor="dashboard-passcode-input"
              className="block text-xs font-semibold uppercase tracking-wider text-textSecondary"
            >
              Access Passcode
            </label>
            <div className="relative mt-2">
              <KeyRound
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary"
                aria-hidden="true"
              />
              <input
                id="dashboard-passcode-input"
                type="password"
                autoComplete="current-password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode..."
                className="min-h-[46px] w-full rounded-xl border border-borderSubtle bg-elevated pl-10 pr-4 py-2.5 text-sm font-semibold tracking-widest text-textPrimary"
              />
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-semanticExpense/30 bg-semanticExpense/10 px-3.5 py-2.5 text-xs font-medium text-semanticExpense"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-accentPrimary px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>
              {isSubmitting ? "Verifying Session..." : "Unlock Dashboard"}
            </span>
          </button>
        </form>
      </motion.section>
    </main>
  );
}

