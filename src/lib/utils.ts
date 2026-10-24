import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatIdr(amount: number | bigint): string {
  const numeric = typeof amount === "bigint" ? Number(amount) : amount;
  if (!Number.isFinite(numeric)) {
    return "Rp 0";
  }
  return idrFormatter.format(Math.round(numeric));
}

export function formatCompactIdr(amount: number | bigint): string {
  const numeric = typeof amount === "bigint" ? Number(amount) : amount;
  const abs = Math.abs(numeric);
  const sign = numeric < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(1)}Jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${(abs / 1_000).toFixed(0)}Rb`;
  }
  return `${sign}Rp ${Math.round(abs)}`;
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

export function slugifyWalletName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const KNOWN_WALLET_STYLES: Record<
  string,
  { color: string; icon: string; isDefault: boolean; sortOrder: number }
> = {
  shopeepay: { color: "#EA580C", icon: "shopping-bag", isDefault: true, sortOrder: 1 },
  gopay: { color: "#0284C7", icon: "smartphone", isDefault: true, sortOrder: 2 },
  jago: { color: "#D97706", icon: "landmark", isDefault: true, sortOrder: 3 },
  blu: { color: "#0D9488", icon: "credit-card", isDefault: true, sortOrder: 4 },
  mandiri: { color: "#1D4ED8", icon: "building-2", isDefault: true, sortOrder: 5 },
  ovo: { color: "#7C3AED", icon: "wallet", isDefault: true, sortOrder: 6 },
  seabank: { color: "#E11D48", icon: "waves", isDefault: true, sortOrder: 7 },
  paypal: { color: "#2563EB", icon: "globe", isDefault: true, sortOrder: 8 },
  jenius: { color: "#059669", icon: "coins", isDefault: true, sortOrder: 9 },
};

const DYNAMIC_PALETTE = [
  "#1D4ED8",
  "#0D9488",
  "#7C3AED",
  "#D97706",
  "#E11D48",
  "#0284C7",
  "#059669",
  "#4F46E5",
];

export function resolveWalletStyle(name: string): {
  color: string;
  icon: string;
  isDefault: boolean;
  sortOrder: number;
} {
  const slug = slugifyWalletName(name);
  if (KNOWN_WALLET_STYLES[slug]) {
    return KNOWN_WALLET_STYLES[slug];
  }
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) % DYNAMIC_PALETTE.length;
  }
  return {
    color: DYNAMIC_PALETTE[Math.abs(hash) % DYNAMIC_PALETTE.length],
    icon: "wallet",
    isDefault: false,
    sortOrder: 99,
  };
}

export const PRIMARY_INCOME_CATEGORIES = new Set([
  "salary",
  "bonus",
  "thr",
  "part time",
  "part-time",
  "gaji",
]);

export function isPrimaryIncomeCategory(category: string): boolean {
  return PRIMARY_INCOME_CATEGORIES.has(category.trim().toLowerCase());
}

