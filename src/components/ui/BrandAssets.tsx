import React from "react";

export function BrandLogoSvg({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" fill="#1D4ED8" />
      <rect
        x="7"
        y="7"
        width="50"
        height="50"
        rx="12"
        stroke="#FFFFFF"
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
      <path
        d="M15 23L23.5 44L32 27L40.5 44L49 23"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="49" cy="18" r="5" fill="#A3E635" />
    </svg>
  );
}

export function EmptyLedgerIllustrationSvg({
  className = "h-24 w-32",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 160 112"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="16"
        y="16"
        width="128"
        height="80"
        rx="14"
        fill="var(--bg-elevated)"
        stroke="var(--border-subtle)"
        strokeWidth="2"
      />
      <rect x="30" y="30" width="44" height="10" rx="5" fill="#1D4ED8" />
      <rect
        x="30"
        y="48"
        width="72"
        height="8"
        rx="4"
        fill="var(--border-subtle)"
      />
      <rect
        x="30"
        y="64"
        width="56"
        height="8"
        rx="4"
        fill="var(--border-subtle)"
      />
      <rect x="104" y="54" width="12" height="24" rx="4" fill="#1D4ED8" />
      <rect x="120" y="40" width="12" height="38" rx="4" fill="#A3E635" />
    </svg>
  );
}
