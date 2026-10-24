"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, ShieldCheck, User, UserPlus } from "lucide-react";
import { ThemeToggleCircular } from "@/components/layout/ThemeToggleCircular";
import { BrandLogoSvg } from "@/components/ui/BrandAssets";
import { SlidingTabs } from "@/components/ui/sliding-tabs";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage("Please enter both your username and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          mode: "login",
        }),
      });

      const data = (await response.json()) as {
        authenticated?: boolean;
        error?: string;
      };

      if (!response.ok || !data.authenticated) {
        setErrorMessage(
          data.error ?? "Authentication failed. Please check your credentials."
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error: unknown) {
      console.error("[LoginPage] Authentication request failed:", error);
      setErrorMessage("Network error while verifying credentials.");
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
        <div className="flex items-center gap-3.5">
          <BrandLogoSvg className="h-12 w-12 shrink-0 shadow-sm" />
          <div>
            <h1
              id="login-heading"
              className="text-xl font-extrabold tracking-tight text-textPrimary"
            >
              WealthyDashboard
            </h1>
            <p className="text-xs text-textSecondary">
              Personal Finance &amp; Multi-Wallet Analytics
            </p>
          </div>
        </div>

        {/* Route Switcher between /login and /register */}
        <div className="mt-6">
          <SlidingTabs
            layoutGroupId="authRouteSlide"
            value="login"
            onChange={(next) => {
              if (next === "register") {
                router.push("/register");
              }
            }}
            className="grid w-full grid-cols-2"
            options={[
              {
                value: "login",
                label: (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Sign In</span>
                  </>
                ),
              },
              {
                value: "register",
                label: (
                  <>
                    <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Register</span>
                  </>
                ),
              },
            ]}
          />
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="dashboard-username-input"
              className="block text-xs font-semibold uppercase tracking-wider text-textSecondary"
            >
              Username
            </label>
            <div className="relative mt-1.5">
              <User
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary"
                aria-hidden="true"
              />
              <input
                id="dashboard-username-input"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (e.g. admin)"
                className="min-h-[46px] w-full rounded-xl border border-borderSubtle bg-elevated pl-10 pr-4 py-2.5 text-sm font-semibold text-textPrimary"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="dashboard-password-input"
              className="block text-xs font-semibold uppercase tracking-wider text-textSecondary"
            >
              Password
            </label>
            <div className="relative mt-1.5">
              <KeyRound
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary"
                aria-hidden="true"
              />
              <input
                id="dashboard-password-input"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="min-h-[46px] w-full rounded-xl border border-borderSubtle bg-elevated pl-10 pr-11 py-2.5 text-sm font-semibold text-textPrimary"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-textSecondary transition hover:bg-surface hover:text-textPrimary"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
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
              {isSubmitting ? "Signing In..." : "Sign In to Dashboard"}
            </span>
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-textSecondary">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/register"
            className="font-bold text-accentPrimary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </motion.section>
    </main>
  );
}
