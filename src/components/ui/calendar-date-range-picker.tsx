"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
  isBefore,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CalendarDateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  className?: string;
}

export function CalendarDateRangePicker({
  from,
  to,
  onChange,
  className,
}: CalendarDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() =>
    from ? parseISO(from) : new Date()
  );
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [rangeStart, setRangeStart] = useState<Date | null>(() =>
    from ? parseISO(from) : null
  );

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRangeStart(from ? parseISO(from) : null);
    if (from) {
      setCurrentMonth(parseISO(from));
    }
  }, [from, to]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayIndex = monthStart.getDay();

  const parsedFrom = from ? parseISO(from) : null;
  const parsedTo = to ? parseISO(to) : null;

  const handleDayClick = (day: Date) => {
    if (!rangeStart || (rangeStart && parsedTo)) {
      setRangeStart(day);
      onChange(format(day, "yyyy-MM-dd"), "");
    } else {
      if (isBefore(day, rangeStart)) {
        setRangeStart(day);
        onChange(format(day, "yyyy-MM-dd"), format(rangeStart, "yyyy-MM-dd"));
      } else {
        onChange(format(rangeStart, "yyyy-MM-dd"), format(day, "yyyy-MM-dd"));
      }
      setIsOpen(false);
    }
  };

  const formattedLabel =
    parsedFrom && parsedTo
      ? `${format(parsedFrom, "dd MMM yyyy")} - ${format(parsedTo, "dd MMM yyyy")}`
      : parsedFrom
      ? `${format(parsedFrom, "dd MMM yyyy")} - Select end date`
      : "Select date range";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex min-h-[40px] items-center gap-2 rounded-xl border border-borderSubtle bg-elevated px-3 py-1.5 text-xs font-medium text-textPrimary transition hover:border-accentPrimary hover:bg-surface sm:text-sm"
      >
        <CalendarIcon
          className="h-4 w-4 shrink-0 text-accentPrimary"
          aria-hidden="true"
        />
        <span className="tabular-nums">{formattedLabel}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-textSecondary transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 top-full z-50 mt-2 w-[300px] rounded-2xl border border-borderSubtle bg-surface p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3">
              <span className="text-sm font-bold text-textPrimary">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                  aria-label="Previous month"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-borderSubtle bg-elevated text-textPrimary transition hover:bg-surface"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                  aria-label="Next month"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-borderSubtle bg-elevated text-textPrimary transition hover:bg-surface"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-semibold text-textSecondary">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-8 w-8" />
              ))}
              {daysInMonth.map((day) => {
                const isStart = parsedFrom && isSameDay(day, parsedFrom);
                const isEnd = parsedTo && isSameDay(day, parsedTo);
                const isInRange =
                  parsedFrom &&
                  parsedTo &&
                  isWithinInterval(day, { start: parsedFrom, end: parsedTo });
                const isHoverHighlight =
                  rangeStart &&
                  !parsedTo &&
                  hoverDate &&
                  !isBefore(hoverDate, rangeStart) &&
                  isWithinInterval(day, { start: rangeStart, end: hoverDate });

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => setHoverDate(day)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold tabular-nums transition",
                      isStart || isEnd
                        ? "bg-accentPrimary font-bold text-white"
                        : isInRange || isHoverHighlight
                        ? "bg-accentPrimary/15 text-accentPrimary"
                        : "text-textPrimary hover:bg-elevated"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            {(from || to) && (
              <div className="mt-3 flex items-center justify-end border-t border-borderSubtle pt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onChange("", "");
                    setIsOpen(false);
                  }}
                  className="text-xs font-semibold text-semanticExpense hover:underline"
                >
                  Clear Range
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

