"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import { ThemeToggleCircular } from "@/components/layout/ThemeToggleCircular";
import { BrandLogoSvg } from "@/components/ui/BrandAssets";
import { SlidingTabs } from "@/components/ui/sliding-tabs";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      setErrorMessage("Username and password are required.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || undefined,
          username: username.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = (await response.json()) as {
        authenticated?: boolean;
        error?: string;
      };

      if (!response.ok || !data.authenticated) {
        setErrorMessage(
          data.error ?? "Registration failed. Please check your inputs."
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error: unknown) {
      console.error("[RegisterPage] Registration request failed:", error);
      setErrorMessage("Network error while creating your account.");
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
        aria-labelledby="register-heading"
        className="w-full max-w-md rounded-2xl border border-borderSubtle bg-surface p-7 shadow-lg sm:p-8"
      >
        <div className="flex items-center gap-3.5">
          <BrandLogoSvg className="h-12 w-12 shrink-0 shadow-sm" />
          <div>
            <h1
              id="register-heading"
              className="text-xl font-extrabold tracking-tight text-textPrimary"
            >
              Create Account
            </h1>
            <p className="text-xs text-textSecondary">
              Register your WealthyDashboard workspace credentials
            </p>
          </div>
        </div>

        {/* Route Switcher between /login and /register */}
        <div className="mt-6">
          <SlidingTabs
            layoutGroupId="authRouteSlide"
            value="register"
            onChange={(next) => {
              if (next === "login") {
                router.push("/login");
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
              htmlFor="register-displayname-input"
              className="block text-xs font-semibold uppercase tracking-wider text-textSecondary"
            >
              Display Name
            </label>
            <div className="relative mt-1.5">
              <BadgeCheck
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary"
                aria-hidden="true"
              />
              <input
                id="register-displayname-input"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Fikar"
                className="min-h-[46px] w-full rounded-xl border border-borderSubtle bg-elevated pl-10 pr-4 py-2.5 text-sm font-medium text-textPrimary"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="register-username-input"
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
                id="register-username-input"
                type="text"
                autoComplete="username"
                required
                minLength={3}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username (min. 3 chars)"
                className="min-h-[46px] w-full rounded-xl border border-borderSubtle bg-elevated pl-10 pr-4 py-2.5 text-sm font-semibold text-textPrimary"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="register-password-input"
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
                id="register-password-input"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password (min. 6 chars)"
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

          <div>
            <label
              htmlFor="register-confirm-password-input"
              className="block text-xs font-semibold uppercase tracking-wider text-textSecondary"
            >
              Confirm Password
            </label>
            <div className="relative mt-1.5">
              <KeyRound
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary"
                aria-hidden="true"
              />
              <input
                id="register-confirm-password-input"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="min-h-[46px] w-full rounded-xl border border-borderSubtle bg-elevated pl-10 pr-4 py-2.5 text-sm font-semibold text-textPrimary"
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
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            <span>
              {isSubmitting
                ? "Creating Account..."
                : "Register & Open Dashboard"}
            </span>
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-textSecondary">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold text-accentPrimary hover:underline"
          >
            Sign in here
          </Link>
        </p>
      </motion.section>
    </main>
  );
}

