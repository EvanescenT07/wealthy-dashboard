"use client";

import React from "react";
import { Calendar, Filter, RotateCcw } from "lucide-react";

export interface GlobalFilterState {
  preset:
    | "all"
    | "this_month"
    | "last_month"
    | "last_3_months"
    | "this_year"
    | "custom";
  from: string;
  to: string;
  walletId: string;
  category: string;
  type: "ALL" | "INCOME" | "EXPENSE";
}

interface GlobalFilterBarProps {
  filters: GlobalFilterState;
  onChange: (next: GlobalFilterState) => void;
  onReset: () => void;
  wallets: Array<{ id: string; name: string }>;
  categories: string[];
}

export function GlobalFilterBar({
  filters,
  onChange,
  onReset,
  wallets,
  categories,
}: GlobalFilterBarProps) {
  const handlePresetChange = (preset: GlobalFilterState["preset"]) => {
    const now = new Date();
    let from = "";
    let to = "";

    if (preset === "this_month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
    } else if (preset === "last_month") {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .slice(0, 10);
      to = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString()
        .slice(0, 10);
    } else if (preset === "last_3_months") {
      from = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        .toISOString()
        .slice(0, 10);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
    } else if (preset === "this_year") {
      from = `${now.getFullYear()}-01-01`;
      to = `${now.getFullYear()}-12-31`;
    }

    onChange({
      ...filters,
      preset,
      from: preset === "custom" ? filters.from : from,
      to: preset === "custom" ? filters.to : to,
    });
  };

  const hasActiveFilter =
    filters.preset !== "all" ||
    filters.from !== "" ||
    filters.to !== "" ||
    filters.walletId !== "" ||
    filters.category !== "" ||
    filters.type !== "ALL";

  return (
    <section
      aria-label="Global dashboard filters"
      className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-borderSubtle bg-surface p-3 sm:px-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-textSecondary">
          <Filter className="h-4 w-4 text-accentPrimary" aria-hidden="true" />
          <span>Global Filter</span>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2.5 sm:justify-end">
          {/* Period Preset */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="global-period-select" className="sr-only">
              Period Preset
            </label>
            <Calendar
              className="hidden h-4 w-4 text-textSecondary sm:inline"
              aria-hidden="true"
            />
            <select
              id="global-period-select"
              value={filters.preset}
              onChange={(e) =>
                handlePresetChange(
                  e.target.value as GlobalFilterState["preset"]
                )
              }
              className="min-h-[44px] rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-xs font-medium text-textPrimary sm:text-sm"
            >
              <option value="all">All Periods</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {filters.preset === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                aria-label="Start date"
                value={filters.from}
                onChange={(e) =>
                  onChange({ ...filters, from: e.target.value })
                }
                className="min-h-[44px] rounded-xl border border-borderSubtle bg-elevated px-3 py-1.5 text-xs text-textPrimary sm:text-sm"
              />
              <span className="text-xs text-textSecondary">to</span>
              <input
                type="date"
                aria-label="End date"
                value={filters.to}
                onChange={(e) => onChange({ ...filters, to: e.target.value })}
                className="min-h-[44px] rounded-xl border border-borderSubtle bg-elevated px-3 py-1.5 text-xs text-textPrimary sm:text-sm"
              />
            </div>
          )}

          {/* Wallet Filter */}
          <div>
            <label htmlFor="global-wallet-select" className="sr-only">
              Filter by Wallet
            </label>
            <select
              id="global-wallet-select"
              value={filters.walletId}
              onChange={(e) =>
                onChange({ ...filters, walletId: e.target.value })
              }
              className="min-h-[44px] rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-xs font-medium text-textPrimary sm:text-sm"
            >
              <option value="">All Wallets</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label htmlFor="global-category-select" className="sr-only">
              Filter by Category
            </label>
            <select
              id="global-category-select"
              value={filters.category}
              onChange={(e) =>
                onChange({ ...filters, category: e.target.value })
              }
              className="min-h-[44px] rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-xs font-medium text-textPrimary sm:text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Type Filter */}
          <div>
            <label htmlFor="global-type-select" className="sr-only">
              Filter by Cashflow Type
            </label>
            <select
              id="global-type-select"
              value={filters.type}
              onChange={(e) =>
                onChange({
                  ...filters,
                  type: e.target.value as GlobalFilterState["type"],
                })
              }
              className="min-h-[44px] rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-xs font-medium text-textPrimary sm:text-sm"
            >
              <option value="ALL">All Cashflow</option>
              <option value="INCOME">Income Only</option>
              <option value="EXPENSE">Expense Only</option>
            </select>
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-borderSubtle bg-canvas px-3 py-2 text-xs font-semibold text-textPrimary transition hover:bg-elevated sm:text-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

