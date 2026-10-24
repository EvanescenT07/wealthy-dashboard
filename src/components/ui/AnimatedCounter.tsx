"use client";

import React, { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { formatIdr } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  format?: "idr" | "number" | "percent";
  isMasked?: boolean;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({
  value,
  format = "idr",
  isMasked = false,
  className = "",
  prefix = "",
  suffix = "",
}: AnimatedCounterProps) {
  const springValue = useSpring(value, {
    stiffness: 140,
    damping: 24,
    mass: 0.8,
  });

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  const displayValue = useTransform(springValue, (latest) => {
    if (format === "idr") {
      return `${prefix}${formatIdr(Math.round(latest))}${suffix}`;
    }
    if (format === "percent") {
      return `${prefix}${latest.toFixed(1)}%${suffix}`;
    }
    return `${prefix}${Math.round(latest).toLocaleString("id-ID")}${suffix}`;
  });

  if (isMasked) {
    return (
      <span className={`tabular-nums tracking-wider ${className}`}>
        Rp •••••••••
      </span>
    );
  }

  return (
    <motion.span className={`tabular-nums ${className}`}>
      {displayValue}
    </motion.span>
  );
}

