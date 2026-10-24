"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Save, Wallet, X } from "lucide-react";
import { formatIdr } from "@/lib/utils";

export interface EditableWalletItem {
  id: string;
  name: string;
  color: string;
  manualBalance: number;
  isVisible: boolean;
  isDefault: boolean;
}

interface EditBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: EditableWalletItem[];
  focusedWalletId?: string | null;
  onSaved: () => void;
}

export function EditBalanceModal({
  isOpen,
  onClose,
  wallets,
  focusedWalletId = null,
  onSaved,
}: EditBalanceModalProps) {
  const [drafts, setDrafts] = useState<
    Record<string, { manualBalance: string; isVisible: boolean }>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const nextDrafts: Record<
      string,
      { manualBalance: string; isVisible: boolean }
    > = {};
    for (const w of wallets) {
      nextDrafts[w.id] = {
        manualBalance: String(w.manualBalance),
        isVisible: w.isVisible,
      };
    }
    setDrafts(nextDrafts);
    setErrorMessage(null);
  }, [isOpen, wallets]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  const displayedWallets = focusedWalletId
    ? wallets.filter((w) => w.id === focusedWalletId)
    : wallets;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updates = displayedWallets.map((w) => {
        const draft = drafts[w.id] ?? {
          manualBalance: String(w.manualBalance),
          isVisible: w.isVisible,
        };
        const parsed = Number.parseFloat(
          draft.manualBalance.replace(/[^0-9.-]+/g, "")
        );
        return {
          walletId: w.id,
          manualBalance: Number.isFinite(parsed) ? Math.round(parsed) : 0,
          isVisible: draft.isVisible,
        };
      });

      const response = await fetch("/api/wallets/balance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setErrorMessage(data.error ?? "Failed to update wallet balances.");
        return;
      }

      onSaved();
      onClose();
    } catch (error: unknown) {
      console.error("[EditBalanceModal] Balance update error:", error);
      setErrorMessage("Network error while saving wallet balances.");
    } finally {
      setIsSaving(false);
    }
  };

  const previewTotalIdr = Object.entries(drafts).reduce((acc, [, item]) => {
    if (!item.isVisible) {
      return acc;
    }
    const num = Number.parseFloat(item.manualBalance.replace(/[^0-9.-]+/g, ""));
    return acc + (Number.isFinite(num) ? Math.round(num) : 0);
  }, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-balance-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2 }}
            className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-borderSubtle bg-surface text-textPrimary shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-borderSubtle px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accentPrimary/10 text-accentPrimary">
                  <Wallet className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id="edit-balance-modal-title"
                    className="text-base font-bold text-textPrimary sm:text-lg"
                  >
                    {focusedWalletId
                      ? "Edit Wallet Balance (IDR)"
                      : "Manage All Wallet Manual Balances (IDR)"}
                  </h2>
                  <p className="text-xs text-textSecondary">
                    All balances are stored in Rupiah (IDR). Hidden wallets are
                    excluded from Total Balance.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close balance editor"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-borderSubtle bg-elevated text-textSecondary transition hover:text-textPrimary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 space-y-2.5 overflow-y-auto px-6 py-4">
                {displayedWallets.map((w) => {
                  const draft = drafts[w.id] ?? {
                    manualBalance: String(w.manualBalance),
                    isVisible: w.isVisible,
                  };
                  return (
                    <div
                      key={w.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borderSubtle bg-elevated/60 p-3"
                    >
                      <div className="flex min-w-[150px] items-center gap-2.5">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full"
                          style={{ backgroundColor: w.color }}
                        />
                        <div>
                          <span className="block text-sm font-semibold text-textPrimary">
                            {w.name}
                          </span>
                          <span className="block text-[11px] text-textSecondary">
                            {w.isDefault ? "Primary Wallet" : "Dynamic Excel Wallet"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-1 items-center justify-end gap-2.5">
                        <div className="relative flex-1 sm:max-w-[220px]">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-textSecondary">
                            Rp
                          </span>
                          <input
                            type="number"
                            step="1"
                            aria-label={`Manual balance in IDR for ${w.name}`}
                            value={draft.manualBalance}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [w.id]: {
                                  ...draft,
                                  manualBalance: e.target.value,
                                },
                              }))
                            }
                            className="min-h-[44px] w-full rounded-xl border border-borderSubtle bg-surface pl-9 pr-3 py-2 text-right text-sm font-semibold tabular-nums text-textPrimary"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setDrafts((prev) => ({
                              ...prev,
                              [w.id]: {
                                ...draft,
                                isVisible: !draft.isVisible,
                              },
                            }))
                          }
                          aria-label={
                            draft.isVisible
                              ? `Hide ${w.name} from Total Balance`
                              : `Include ${w.name} in Total Balance`
                          }
                          title={
                            draft.isVisible
                              ? "Included in Total Balance"
                              : "Hidden from Total Balance"
                          }
                          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                            draft.isVisible
                              ? "border-accentPrimary/30 bg-accentPrimary/10 text-accentPrimary"
                              : "border-borderSubtle bg-surface text-textSecondary"
                          }`}
                        >
                          {draft.isVisible ? (
                            <>
                              <Eye className="h-4 w-4" aria-hidden="true" />
                              <span className="hidden sm:inline">Visible</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-4 w-4" aria-hidden="true" />
                              <span className="hidden sm:inline">Hidden</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {errorMessage && (
                  <div
                    role="alert"
                    className="rounded-xl border border-semanticExpense/30 bg-semanticExpense/10 px-3.5 py-2.5 text-xs font-medium text-semanticExpense"
                  >
                    {errorMessage}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borderSubtle bg-elevated/40 px-6 py-4">
                <div>
                  <span className="block text-[11px] uppercase tracking-wider text-textSecondary">
                    Projected Visible Total Balance
                  </span>
                  <span className="text-base font-bold tabular-nums text-textPrimary">
                    {formatIdr(previewTotalIdr)}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] rounded-xl border border-borderSubtle bg-surface px-4 py-2 text-xs font-semibold text-textPrimary transition hover:bg-elevated sm:text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accentPrimary px-5 py-2 text-xs font-semibold text-white transition hover:opacity-95 disabled:opacity-50 sm:text-sm"
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {isSaving ? "Saving..." : "Save Balances"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

