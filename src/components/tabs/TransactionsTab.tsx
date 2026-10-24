"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Flame,
  LayoutGrid,
  List,
  Receipt,
  Search,
  TrendingUp,
} from "lucide-react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import {
  EmptyStateCard,
  ErrorStateCard,
  SkeletonCard,
} from "@/components/ui/SkeletonCard";
import { GlobalFilterState } from "@/components/layout/GlobalFilterBar";
import { formatIdr } from "@/lib/utils";

interface TransactionRecord {
  id: string;
  externalHash: string;
  date: string;
  walletId: string;
  walletName: string;
  walletColor: string;
  walletIcon: string;
  category: string;
  subcategory: string | null;
  note: string | null;
  description: string | null;
  amountIdr: number;
  type: "INCOME" | "EXPENSE";
  currency: string;
}

interface TransactionsResponse {
  transactions: TransactionRecord[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  counts: {
    all: number;
    income: number;
    expense: number;
  };
  kpi: {
    totalTransactions: number;
    activeSpendingDays: number;
    highestSingleExpense: {
      amountIdr: number;
      category: string;
      subcategory: string | null;
      note: string | null;
      walletName: string;
      date: string;
    } | null;
    avgDailyExpense: number;
  };
}

interface TransactionsTabProps {
  globalFilters: GlobalFilterState;
  isMasked: boolean;
  refreshTrigger: number;
  onOpenImportExcel: () => void;
  onResetFilters: () => void;
}

export function TransactionsTab({
  globalFilters,
  isMasked,
  refreshTrigger,
  onOpenImportExcel,
  onResetFilters,
}: TransactionsTabProps) {
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pillType, setPillType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [page, setPage] = useState(1);

  // Sync pillType with global filter when global filter changes
  useEffect(() => {
    setPillType(globalFilters.type);
    setPage(1);
  }, [globalFilters.type]);

  // 300ms Debounce for search bar
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "25");
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      if (pillType !== "ALL") {
        params.set("type", pillType);
      }
      if (globalFilters.walletId) {
        params.set("walletId", globalFilters.walletId);
      }
      if (globalFilters.category) {
        params.set("categories", globalFilters.category);
      }
      if (globalFilters.from) {
        params.set("from", globalFilters.from);
      }
      if (globalFilters.to) {
        params.set("to", globalFilters.to);
      }

      const response = await fetch(`/api/transactions?${params.toString()}`);
      const json = (await response.json()) as TransactionsResponse & {
        error?: string;
      };

      if (!response.ok || !json.transactions) {
        setError(json.error ?? "Failed to load transactions.");
        return;
      }

      setData(json);
    } catch (err: unknown) {
      console.error("[TransactionsTab] Error loading transactions:", err);
      setError("Network error while loading transactions.");
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    debouncedSearch,
    pillType,
    globalFilters.walletId,
    globalFilters.category,
    globalFilters.from,
    globalFilters.to,
  ]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshTrigger]);

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} heightClass="h-32" />
          ))}
        </div>
        <SkeletonCard heightClass="h-96" label="Loading transactions table" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorStateCard
        message={error ?? "Unable to load transactions."}
        onRetry={fetchTransactions}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-borderSubtle bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary">
              Total Transactions
            </span>
            <Receipt className="h-4 w-4 text-accentPrimary" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-textPrimary">
            <AnimatedCounter
              value={data.kpi.totalTransactions}
              format="number"
            />
          </div>
          <p className="mt-1 text-[11px] text-textSecondary">
            Matching active filter criteria
          </p>
        </article>

        <article className="rounded-2xl border border-borderSubtle bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary">
              Active Spending Days
            </span>
            <CalendarCheck
              className="h-4 w-4 text-semanticIncome"
              aria-hidden="true"
            />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-textPrimary">
            <AnimatedCounter
              value={data.kpi.activeSpendingDays}
              format="number"
              suffix=" Days"
            />
          </div>
          <p className="mt-1 text-[11px] text-textSecondary">
            Unique calendar dates with expense activity
          </p>
        </article>

        <article className="rounded-2xl border border-borderSubtle bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary">
              Highest Single Expense
            </span>
            <Flame className="h-4 w-4 text-semanticExpense" aria-hidden="true" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-textPrimary sm:text-2xl">
            <AnimatedCounter
              value={data.kpi.highestSingleExpense?.amountIdr ?? 0}
              format="idr"
              isMasked={isMasked}
            />
          </div>
          <p className="mt-1 truncate text-[11px] text-textSecondary">
            {data.kpi.highestSingleExpense
              ? `${data.kpi.highestSingleExpense.category}${
                  data.kpi.highestSingleExpense.note
                    ? ` (${data.kpi.highestSingleExpense.note})`
                    : ""
                }`
              : "No expense recorded in period"}
          </p>
        </article>

        <article className="rounded-2xl border border-borderSubtle bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary">
              Avg. Daily Expense
            </span>
            <TrendingUp
              className="h-4 w-4 text-accentPrimary"
              aria-hidden="true"
            />
          </div>
          <div className="mt-2 text-xl font-extrabold text-textPrimary sm:text-2xl">
            <AnimatedCounter
              value={data.kpi.avgDailyExpense}
              format="idr"
              isMasked={isMasked}
            />
          </div>
          <p className="mt-1 text-[11px] text-textSecondary">
            Average per active spending day
          </p>
        </article>
      </div>

      {/* Filter Pills, Search Bar (300ms debounce), & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-borderSubtle bg-surface p-4">
        <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-elevated p-1">
          <button
            type="button"
            onClick={() => {
              setPillType("ALL");
              setPage(1);
            }}
            className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-semibold tabular-nums transition ${
              pillType === "ALL"
                ? "bg-accentPrimary text-white"
                : "text-textSecondary hover:text-textPrimary"
            }`}
          >
            All ({data.counts.all})
          </button>
          <button
            type="button"
            onClick={() => {
              setPillType("INCOME");
              setPage(1);
            }}
            className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-semibold tabular-nums transition ${
              pillType === "INCOME"
                ? "bg-semanticIncome text-white"
                : "text-textSecondary hover:text-textPrimary"
            }`}
          >
            Income ({data.counts.income})
          </button>
          <button
            type="button"
            onClick={() => {
              setPillType("EXPENSE");
              setPage(1);
            }}
            className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-semibold tabular-nums transition ${
              pillType === "EXPENSE"
                ? "bg-semanticExpense text-white"
                : "text-textSecondary hover:text-textPrimary"
            }`}
          >
            Expense ({data.counts.expense})
          </button>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search note, category, wallet..."
              aria-label="Search transactions"
              className="min-h-[42px] w-full rounded-xl border border-borderSubtle bg-elevated pl-9 pr-3 py-2 text-xs text-textPrimary sm:text-sm"
            />
          </div>

          <div className="inline-flex rounded-xl border border-borderSubtle bg-elevated p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Table View"
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                viewMode === "table"
                  ? "bg-surface text-textPrimary shadow-sm"
                  : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Table View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              aria-label="Cards View"
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                viewMode === "cards"
                  ? "bg-surface text-textPrimary shadow-sm"
                  : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Cards View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Content */}
      {data.transactions.length === 0 ? (
        <EmptyStateCard
          title="No transactions found"
          description="Upload an Excel spreadsheet or clear your search and filter parameters to view transactions."
          onImportClick={onOpenImportExcel}
          onResetFilterClick={() => {
            setSearchInput("");
            setPillType("ALL");
            onResetFilters();
          }}
        />
      ) : viewMode === "table" ? (
        <div className="overflow-hidden rounded-2xl border border-borderSubtle bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-borderSubtle bg-elevated/60 text-[11px] font-semibold uppercase tracking-wider text-textSecondary">
                  <th className="py-3.5 pl-5 pr-3">Date &amp; Time</th>
                  <th className="py-3.5 px-3">Wallet</th>
                  <th className="py-3.5 px-3">Category / Subcategory</th>
                  <th className="py-3.5 px-3">Note / Description</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Amount (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSubtle">
                {data.transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="transition hover:bg-elevated/70"
                  >
                    <td className="whitespace-nowrap py-3.5 pl-5 pr-3 text-xs tabular-nums text-textSecondary">
                      {new Date(tx.date).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-2 font-semibold text-textPrimary">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white"
                          style={{ backgroundColor: tx.walletColor }}
                        >
                          {tx.walletName.slice(0, 2).toUpperCase()}
                        </span>
                        {tx.walletName}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-textPrimary">
                        {tx.category}
                      </span>
                      {tx.subcategory && (
                        <span className="block text-xs text-textSecondary">
                          {tx.subcategory}
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs truncate py-3.5 px-3 text-xs text-textSecondary">
                      {tx.note ?? tx.description ?? "-"}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${
                          tx.type === "INCOME"
                            ? "bg-semanticIncome/15 text-semanticIncome"
                            : "bg-semanticExpense/15 text-semanticExpense"
                        }`}
                      >
                        {tx.type === "INCOME" ? "Income" : "Expense"}
                      </span>
                    </td>
                    <td
                      className={`whitespace-nowrap py-3.5 pl-3 pr-5 text-right font-bold tabular-nums ${
                        tx.type === "INCOME"
                          ? "text-semanticIncome"
                          : "text-semanticExpense"
                      }`}
                    >
                      {isMasked
                        ? "Rp ••••••"
                        : `${tx.type === "INCOME" ? "+" : "-"}${formatIdr(
                            tx.amountIdr
                          )}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.transactions.map((tx, idx) => (
            <motion.article
              key={tx.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.02 }}
              className="flex flex-col justify-between rounded-2xl border border-borderSubtle bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white"
                    style={{ backgroundColor: tx.walletColor }}
                  >
                    {tx.walletName.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-textPrimary">
                      {tx.category}
                    </h3>
                    <span className="text-xs text-textSecondary">
                      {tx.walletName}
                      {tx.subcategory ? ` • ${tx.subcategory}` : ""}
                    </span>
                  </div>
                </div>
                <span
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                    tx.type === "INCOME"
                      ? "bg-semanticIncome/15 text-semanticIncome"
                      : "bg-semanticExpense/15 text-semanticExpense"
                  }`}
                >
                  {tx.type}
                </span>
              </div>

              <p className="mt-3 text-xs text-textSecondary">
                {tx.note ?? tx.description ?? "No note attached"}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-borderSubtle pt-3">
                <span className="text-[11px] tabular-nums text-textSecondary">
                  {new Date(tx.date).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span
                  className={`text-sm font-extrabold tabular-nums ${
                    tx.type === "INCOME"
                      ? "text-semanticIncome"
                      : "text-semanticExpense"
                  }`}
                >
                  {isMasked
                    ? "Rp ••••••"
                    : `${tx.type === "INCOME" ? "+" : "-"}${formatIdr(
                        tx.amountIdr
                      )}`}
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {data.pagination.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-borderSubtle bg-surface px-5 py-3.5">
          <span className="text-xs text-textSecondary tabular-nums">
            Page <strong>{data.pagination.page}</strong> of{" "}
            <strong>{data.pagination.totalPages}</strong> (
            {data.pagination.totalCount} total rows)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-borderSubtle bg-elevated px-3.5 py-1.5 text-xs font-semibold text-textPrimary transition hover:bg-canvas disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </button>
            <button
              type="button"
              disabled={page >= data.pagination.totalPages}
              onClick={() =>
                setPage((p) => Math.min(data.pagination.totalPages, p + 1))
              }
              className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-borderSubtle bg-elevated px-3.5 py-1.5 text-xs font-semibold text-textPrimary transition hover:bg-canvas disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

