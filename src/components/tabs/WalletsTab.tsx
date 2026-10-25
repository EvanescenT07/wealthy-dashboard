"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Edit3,
  Layers,
  Sliders,
  Wallet as WalletIcon,
} from "lucide-react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import {
  EmptyStateCard,
  ErrorStateCard,
  SkeletonCard,
} from "@/components/ui/SkeletonCard";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { Switch } from "@/components/ui/switch";
import { formatIdr } from "@/lib/utils";

export interface EnrichedWallet {
  id: string;
  name: string;
  slug: string;
  manualBalance: number;
  color: string;
  icon: string;
  isDefault: boolean;
  isVisible: boolean;
  sortOrder: number;
  updatedAt: string;
  excelIncome: number;
  excelExpense: number;
  netCashflow: number;
  transactionCount: number;
}

interface WalletsTabProps {
  from: string;
  to: string;
  isMasked: boolean;
  refreshTrigger: number;
  onOpenBulkEdit: () => void;
  onOpenSingleEdit: (walletId: string) => void;
  onOpenImportExcel: () => void;
  onWalletsMutated: () => void;
}

export function WalletsTab({
  from,
  to,
  isMasked,
  refreshTrigger,
  onOpenBulkEdit,
  onOpenSingleEdit,
  onOpenImportExcel,
  onWalletsMutated,
}: WalletsTabProps) {
  const [wallets, setWallets] = useState<EnrichedWallet[]>([]);
  const [totalManualBalance, setTotalManualBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<
    "all" | "default" | "dynamic" | "hidden"
  >("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchWallets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) {
        params.set("from", from);
      }
      if (to) {
        params.set("to", to);
      }
      const response = await fetch(`/api/wallets?${params.toString()}`);
      const data = (await response.json()) as {
        wallets?: EnrichedWallet[];
        totalManualBalance?: number;
        error?: string;
      };

      if (!response.ok || !data.wallets) {
        setError(data.error ?? "Failed to load wallets.");
        return;
      }

      setWallets(data.wallets);
      setTotalManualBalance(data.totalManualBalance ?? 0);
    } catch (err: unknown) {
      console.error("[WalletsTab] Failed to fetch wallets:", err);
      setError("Network error while loading wallets.");
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets, refreshTrigger]);

  const handleToggleVisibility = async (wallet: EnrichedWallet) => {
    setTogglingId(wallet.id);
    try {
      const response = await fetch("/api/wallets/balance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [
            {
              walletId: wallet.id,
              isVisible: !wallet.isVisible,
            },
          ],
        }),
      });
      if (response.ok) {
        await fetchWallets();
        onWalletsMutated();
      }
    } catch (err: unknown) {
      console.error("[WalletsTab] Failed to toggle visibility:", err);
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <SkeletonCard
            key={idx}
            heightClass="h-56"
            label="Loading wallet card"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorStateCard message={error} onRetry={fetchWallets} />;
  }

  const displayedWallets = wallets.filter((w) => {
    if (filterMode === "default") {
      return w.isDefault;
    }
    if (filterMode === "dynamic") {
      return !w.isDefault;
    }
    if (filterMode === "hidden") {
      return !w.isVisible;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-borderSubtle bg-surface p-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-textSecondary">
            Active Multi-Wallet Liquidity (Manual Override IDR)
          </span>
          <div className="mt-1 text-2xl font-extrabold text-textPrimary sm:text-3xl">
            <AnimatedCounter
              value={totalManualBalance}
              format="idr"
              isMasked={isMasked}
            />
          </div>
          <p className="mt-1 text-xs text-textSecondary">
            Showing {wallets.filter((w) => w.isVisible).length} visible wallets
            of {wallets.length} total accounts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <SlidingTabs
            layoutGroupId="walletFilterModeSlide"
            value={filterMode}
            onChange={setFilterMode}
            options={[
              { value: "all", label: `All (${wallets.length})` },
              {
                value: "default",
                label: `Primary (${wallets.filter((w) => w.isDefault).length})`,
              },
              {
                value: "dynamic",
                label: `Excel Dynamic (${wallets.filter((w) => !w.isDefault).length})`,
              },
              {
                value: "hidden",
                label: `Hidden (${wallets.filter((w) => !w.isVisible).length})`,
              },
            ]}
          />

          <button
            type="button"
            onClick={onOpenBulkEdit}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accentPrimary px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-95 sm:text-sm"
          >
            <Sliders className="h-4 w-4" aria-hidden="true" />
            <span>Bulk Edit All Balances</span>
          </button>
        </div>
      </div>

      {displayedWallets.length === 0 ? (
        <EmptyStateCard
          title="No wallets match this filter"
          description="Switch the wallet filter above or import an Excel sheet to register new dynamic accounts."
          onImportClick={onOpenImportExcel}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {displayedWallets.map((wallet, index) => (
            <motion.article
              key={wallet.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
              className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                wallet.isVisible
                  ? "border-borderSubtle bg-surface"
                  : "border-dashed border-borderSubtle bg-surface/60 opacity-75"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl font-bold text-white shadow-sm"
                      style={{ backgroundColor: wallet.color }}
                    >
                      <WalletIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-textPrimary">
                          {wallet.name}
                        </h3>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            wallet.isDefault
                              ? "bg-accentPrimary/10 text-accentPrimary"
                              : "bg-elevated text-textSecondary"
                          }`}
                        >
                          {wallet.isDefault ? "Primary" : "Dynamic"}
                        </span>
                      </div>
                      <span className="text-xs text-textSecondary tabular-nums">
                        {wallet.transactionCount} recorded Excel transactions
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={wallet.isVisible}
                        disabled={togglingId === wallet.id}
                        onCheckedChange={() => handleToggleVisibility(wallet)}
                        aria-label={`Include ${wallet.name} in Total Balance`}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenSingleEdit(wallet.id)}
                      aria-label={`Edit manual balance for ${wallet.name}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-borderSubtle bg-elevated text-textPrimary transition hover:bg-accentPrimary hover:text-white"
                    >
                      <Edit3 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Actual Manual Balance (Option A: Single Source of Liquidity) */}
                <div className="mt-5 rounded-xl bg-elevated p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-textSecondary">
                      Manual Balance (IDR)
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenSingleEdit(wallet.id)}
                      className="text-xs font-semibold text-accentPrimary hover:underline"
                    >
                      Set Balance
                    </button>
                  </div>
                  <div className="mt-1 text-xl font-extrabold text-textPrimary sm:text-2xl">
                    <AnimatedCounter
                      value={wallet.manualBalance}
                      format="idr"
                      isMasked={isMasked}
                    />
                  </div>
                </div>
              </div>

              {/* Analytical Companion from Excel History */}
              <div className="mt-4 space-y-2 border-t border-borderSubtle pt-3.5 text-xs">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-textSecondary">
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Excel Historical Mutation Summary</span>
                </div>
                <div className="grid grid-cols-3 gap-2 tabular-nums">
                  <div>
                    <span className="block text-[10px] text-textSecondary">
                      Income (Excel)
                    </span>
                    <span className="font-bold text-semanticIncome">
                      {isMasked ? "Rp ••••" : formatIdr(wallet.excelIncome)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-textSecondary">
                      Expense (Excel)
                    </span>
                    <span className="font-bold text-semanticExpense">
                      {isMasked ? "Rp ••••" : formatIdr(wallet.excelExpense)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-textSecondary">
                      Net Flow (Excel)
                    </span>
                    <span
                      className={`font-bold ${
                        wallet.netCashflow >= 0
                          ? "text-semanticIncome"
                          : "text-semanticExpense"
                      }`}
                    >
                      {isMasked ? "Rp ••••" : formatIdr(wallet.netCashflow)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}
