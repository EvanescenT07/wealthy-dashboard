import React from "react";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-dvh bg-canvas text-textPrimary">{children}</div>;
}

