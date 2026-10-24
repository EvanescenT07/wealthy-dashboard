"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

export function ThemeToggleCircular() {
  const [isDark, setIsDark] = useState(false);
  const [fallbackClip, setFallbackClip] = useState<{
    active: boolean;
    x: number;
    y: number;
    rMax: number;
    targetDark: boolean;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("wealthy_theme");
    const prefersDark =
      saved === "dark" ||
      (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  const applyThemeDom = (nextDark: boolean) => {
    setIsDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("wealthy_theme", nextDark ? "dark" : "light");
  };

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX =
      event.clientX > 0 ? event.clientX : rect.left + rect.width / 2;
    const clickY =
      event.clientY > 0 ? event.clientY : rect.top + rect.height / 2;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const maxDx = Math.max(clickX, viewportW - clickX);
    const maxDy = Math.max(clickY, viewportH - clickY);
    const rMax = Math.hypot(maxDx, maxDy);

    const nextDark = !isDark;
    const docWithTransition = document as ViewTransitionDocument;

    if (typeof docWithTransition.startViewTransition === "function") {
      const transition = docWithTransition.startViewTransition(() => {
        applyThemeDom(nextDark);
      });

      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${clickX}px ${clickY}px)`,
                `circle(${rMax}px at ${clickX}px ${clickY}px)`,
              ],
            },
            {
              duration: 550,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        })
        .catch((error: unknown) => {
          console.warn("[ThemeToggleCircular] ViewTransition animation interrupted:", error);
        });
    } else {
      setFallbackClip({
        active: true,
        x: clickX,
        y: clickY,
        rMax,
        targetDark: nextDark,
      });
      setTimeout(() => {
        applyThemeDom(nextDark);
      }, 260);
      setTimeout(() => {
        setFallbackClip(null);
      }, 560);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-borderSubtle bg-surface text-textPrimary transition hover:bg-elevated"
      >
        {isDark ? (
          <Sun className="h-5 w-5 text-accentLime" aria-hidden="true" />
        ) : (
          <Moon className="h-5 w-5 text-textPrimary" aria-hidden="true" />
        )}
      </button>

      <AnimatePresence>
        {fallbackClip?.active && (
          <motion.div
            key="theme-fallback-overlay"
            initial={{
              clipPath: `circle(0px at ${fallbackClip.x}px ${fallbackClip.y}px)`,
            }}
            animate={{
              clipPath: `circle(${fallbackClip.rMax}px at ${fallbackClip.x}px ${fallbackClip.y}px)`,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              backgroundColor: fallbackClip.targetDark ? "#0B0F17" : "#F4F5F7",
            }}
            className="pointer-events-none fixed inset-0 z-[9999]"
          />
        )}
      </AnimatePresence>
    </>
  );
}

