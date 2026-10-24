import { createHash } from "crypto";
import * as XLSX from "xlsx";

export interface ParsedExcelRow {
  externalHash: string;
  date: Date;
  account: string;
  category: string;
  subcategory: string | null;
  note: string | null;
  description: string | null;
  amountIdr: bigint;
  type: "INCOME" | "EXPENSE";
  currency: string;
}

export interface ExcelExportRow {
  Date: string;
  Account: string;
  Category: string;
  Subcategory: string;
  Note: string;
  IDR: number;
  "Income/Expense": "Income" | "Expense";
  Description: string;
  Amount: number;
  Currency: string;
}

function parseExcelDate(rawDate: unknown): Date | null {
  if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
    return rawDate;
  }
  if (typeof rawDate === "number") {
    const parsed = XLSX.SSF.parse_date_code(rawDate);
    if (parsed) {
      return new Date(
        Date.UTC(
          parsed.y,
          parsed.m - 1,
          parsed.d,
          parsed.H || 0,
          parsed.M || 0,
          Math.floor(parsed.S || 0)
        )
      );
    }
  }
  if (typeof rawDate === "string") {
    const trimmed = rawDate.trim();
    if (!trimmed) {
      return null;
    }
    const direct = new Date(trimmed);
    if (!Number.isNaN(direct.getTime())) {
      return direct;
    }
    // Support DD/MM/YYYY or MM/DD/YYYY with optional time
    const match = trimmed.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
    );
    if (match) {
      const part1 = Number(match[1]);
      const part2 = Number(match[2]);
      const year = Number(match[3]);
      const hours = Number(match[4] ?? 0);
      const minutes = Number(match[5] ?? 0);
      const seconds = Number(match[6] ?? 0);
      const month = part1 > 12 ? part2 - 1 : part1 - 1;
      const day = part1 > 12 ? part1 : part2;
      const constructed = new Date(year, month, day, hours, minutes, seconds);
      if (!Number.isNaN(constructed.getTime())) {
        return constructed;
      }
    }
  }
  return null;
}

function parseIntegerIdr(rawIdr: unknown, rawFallbackAmount: unknown): bigint {
  const candidate =
    rawIdr !== undefined && rawIdr !== null && String(rawIdr).trim() !== ""
      ? rawIdr
      : rawFallbackAmount;

  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return BigInt(Math.round(Math.abs(candidate)));
  }
  if (typeof candidate === "bigint") {
    return candidate < BigInt(0) ? -candidate : candidate;
  }
  if (typeof candidate === "string") {
    const cleaned = candidate.replace(/[^0-9.-]+/g, "");
    const numeric = Number.parseFloat(cleaned);
    if (Number.isFinite(numeric)) {
      return BigInt(Math.round(Math.abs(numeric)));
    }
  }
  return BigInt(0);
}

function normalizeTransactionType(rawType: unknown): "INCOME" | "EXPENSE" | null {
  if (typeof rawType !== "string") {
    return null;
  }
  const normalized = rawType.trim().toLowerCase();
  if (normalized === "income" || normalized === "pemasukan" || normalized === "in") {
    return "INCOME";
  }
  if (
    normalized === "expense" ||
    normalized === "expenses" ||
    normalized === "pengeluaran" ||
    normalized === "out"
  ) {
    return "EXPENSE";
  }
  return null;
}

function cleanOptionalText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

export function computeRowExternalHash(params: {
  isoDate: string;
  account: string;
  category: string;
  subcategory: string | null;
  amountIdr: bigint;
  type: "INCOME" | "EXPENSE";
  note: string | null;
  occurrenceIndex: number;
}): string {
  const canonical = [
    params.isoDate,
    params.account.trim().toLowerCase(),
    params.category.trim().toLowerCase(),
    (params.subcategory ?? "").trim().toLowerCase(),
    params.amountIdr.toString(),
    params.type,
    (params.note ?? "").trim().toLowerCase(),
    String(params.occurrenceIndex),
  ].join("||");

  return createHash("sha256").update(canonical).digest("hex");
}

export function parseExcelTransactions(buffer: ArrayBuffer): {
  rows: ParsedExcelRow[];
  totalRowsRead: number;
} {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { rows: [], totalRowsRead: 0 };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawObjects = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });

  const occurrenceCounter = new Map<string, number>();
  const parsedRows: ParsedExcelRow[] = [];

  for (const raw of rawObjects) {
    // Explicitly ignore trailing conversion columns like Account.1
    const dateValue = parseExcelDate(raw["Date"] ?? raw["date"]);
    const accountRaw = cleanOptionalText(raw["Account"] ?? raw["account"]);
    const categoryRaw = cleanOptionalText(raw["Category"] ?? raw["category"]);
    const typeValue = normalizeTransactionType(
      raw["Income/Expense"] ?? raw["Type"] ?? raw["type"]
    );
    const amountIdr = parseIntegerIdr(
      raw["IDR"] ?? raw["idr"],
      raw["Amount"] ?? raw["amount"]
    );

    if (!dateValue || !accountRaw || !categoryRaw || !typeValue || amountIdr <= BigInt(0)) {
      continue;
    }

    const subcategory = cleanOptionalText(raw["Subcategory"] ?? raw["subcategory"]);
    const note = cleanOptionalText(raw["Note"] ?? raw["note"]);
    const description = cleanOptionalText(raw["Description"] ?? raw["description"]);
    const isoDate = dateValue.toISOString();

    const baseKey = [
      isoDate,
      accountRaw.toLowerCase(),
      categoryRaw.toLowerCase(),
      (subcategory ?? "").toLowerCase(),
      amountIdr.toString(),
      typeValue,
      (note ?? "").toLowerCase(),
    ].join("|");

    const currentOccurrence = (occurrenceCounter.get(baseKey) ?? 0) + 1;
    occurrenceCounter.set(baseKey, currentOccurrence);

    const externalHash = computeRowExternalHash({
      isoDate,
      account: accountRaw,
      category: categoryRaw,
      subcategory,
      amountIdr,
      type: typeValue,
      note,
      occurrenceIndex: currentOccurrence,
    });

    parsedRows.push({
      externalHash,
      date: dateValue,
      account: accountRaw,
      category: categoryRaw,
      subcategory,
      note,
      description,
      amountIdr,
      type: typeValue,
      currency: "IDR",
    });
  }

  return {
    rows: parsedRows,
    totalRowsRead: rawObjects.length,
  };
}

export function generateExcelTemplateBuffer(): Uint8Array {
  const sampleRows: ExcelExportRow[] = [
    {
      Date: "2026-10-01 09:00:00",
      Account: "Mandiri",
      Category: "Salary",
      Subcategory: "Monthly Payroll",
      Note: "October Payroll",
      IDR: 15000000,
      "Income/Expense": "Income",
      Description: "Primary monthly salary credit",
      Amount: 15000000,
      Currency: "IDR",
    },
    {
      Date: "2026-10-02 12:30:00",
      Account: "Gopay",
      Category: "Food",
      Subcategory: "Lunch",
      Note: "Nasi Padang & Es Teh",
      IDR: 45000,
      "Income/Expense": "Expense",
      Description: "Weekday lunch",
      Amount: 45000,
      Currency: "IDR",
    },
    {
      Date: "2026-10-03 18:15:00",
      Account: "Jago",
      Category: "Transportation",
      Subcategory: "Fuel",
      Note: "Pertamax Full Tank",
      IDR: 120000,
      "Income/Expense": "Expense",
      Description: "Commute fuel refill",
      Amount: 120000,
      Currency: "IDR",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows, {
    header: [
      "Date",
      "Account",
      "Category",
      "Subcategory",
      "Note",
      "IDR",
      "Income/Expense",
      "Description",
      "Amount",
      "Currency",
    ],
  });

  worksheet["!cols"] = [
    { wch: 22 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 26 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
    { wch: 16 },
    { wch: 10 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

  const out = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Uint8Array(out);
}

export function generateExcelExportBuffer(params: {
  transactions: Array<{
    date: string | Date;
    walletName: string;
    category: string;
    subcategory: string | null;
    note: string | null;
    description: string | null;
    amountIdr: number;
    type: "INCOME" | "EXPENSE";
    currency: string;
  }>;
  wallets: Array<{
    name: string;
    manualBalance: number;
    excelIncome: number;
    excelExpense: number;
    netCashflow: number;
  }>;
}): Uint8Array {
  const txRows: ExcelExportRow[] = params.transactions.map((tx) => {
    const d = typeof tx.date === "string" ? new Date(tx.date) : tx.date;
    const formattedDate = d.toISOString().replace("T", " ").slice(0, 19);
    return {
      Date: formattedDate,
      Account: tx.walletName,
      Category: tx.category,
      Subcategory: tx.subcategory ?? "",
      Note: tx.note ?? "",
      IDR: tx.amountIdr,
      "Income/Expense": tx.type === "INCOME" ? "Income" : "Expense",
      Description: tx.description ?? "",
      Amount: tx.amountIdr,
      Currency: tx.currency || "IDR",
    };
  });

  const txSheet = XLSX.utils.json_to_sheet(txRows, {
    header: [
      "Date",
      "Account",
      "Category",
      "Subcategory",
      "Note",
      "IDR",
      "Income/Expense",
      "Description",
      "Amount",
      "Currency",
    ],
  });

  const walletSheet = XLSX.utils.json_to_sheet(
    params.wallets.map((w) => ({
      Wallet: w.name,
      "Manual Balance (IDR)": w.manualBalance,
      "Total Income Excel (IDR)": w.excelIncome,
      "Total Expense Excel (IDR)": w.excelExpense,
      "Net Cashflow Excel (IDR)": w.netCashflow,
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, txSheet, "Transactions");
  XLSX.utils.book_append_sheet(workbook, walletSheet, "Wallets Summary");

  const out = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Uint8Array(out);
}

