"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SlidingTabOption<T extends string> {
  value: T;
  label: React.ReactNode;
  tone?: "primary" | "income" | "expense";
}

interface SlidingTabsProps<T extends string> {
  layoutGroupId: string;
  options: SlidingTabOption<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}

export function SlidingTabs<T extends string>({
  layoutGroupId,
  options,
  value,
  onChange,
  className,
}: SlidingTabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-xl border border-borderSubtle bg-elevated p-1",
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const activeBg =
          opt.tone === "income"
            ? "bg-semanticIncome"
            : opt.tone === "expense"
            ? "bg-semanticExpense"
            : "bg-accentPrimary";

        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              isActive
                ? "text-white"
                : "text-textSecondary hover:text-textPrimary"
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutGroupId}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 32,
                }}
                className={cn("absolute inset-0 rounded-lg shadow-sm", activeBg)}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
