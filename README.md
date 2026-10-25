# WealthyDashboard

A responsive personal finance and multi-wallet analytics dashboard built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Bun**.

WealthyDashboard visualizes personal cashflow (*Inbound Income* vs *Outbound Expenses*), monitors monthly budget targets via arc gauges, and manages liquidity across digital wallets and bank accounts through non-destructive Excel imports and manual balance overrides.

---

## 🌟 Key Features

### 1. Multi-Wallet Liquidity & Manual Balance Override
- **9 Pre-Seeded Primary Wallets:** Shopeepay, Gopay, Jago, Blu, Mandiri, Ovo, Seabank, Paypal, and Jenius.
- **Dynamic Excel Wallets:** Automatically detects and indexes any new account found in uploaded spreadsheets (e.g., BCA, Rdn Stockbit, Cash).
- **Manual Balance Override in IDR:** Store and update actual real-world balances directly with single-wallet or bulk editing modal dialogs.
- **Visibility Toggle:** Exclude specific legacy or intermediate accounts from total liquidity calculations.

### 2. Non-Destructive Excel Data Injection
- **Deterministic SHA-256 Fingerprint (`externalHash`):** Hashes each row with `RowOccurrenceIndex` to eliminate duplicate rows on re-uploads without losing historical transactions.
- **In-Memory Template Generator:** Download the standard `.xlsx` template on-the-fly (`GET /api/template/excel`) or from static CDN fallback without third-party cloud blob storage.
- **Import Audit History:** Tracks uploaded files, total rows processed, inserted records, and skipped duplicates in `ImportLog`.

### 3. Layered Filtering System
- **Toolbar Filter:** Select period presets (`This Month`, `Last Month`, `Last 3 Months`, `This Year`, `All Periods`) or input exact custom `From` / `To` date ranges with full 24-hour end-of-day inclusion.
- **Independent Card Filters:** Total Income and Total Expense summary cards feature standalone period selectors defaulting to `This Month`.
- **Per-Chart Year & Granularity:** Explore multi-year bar charts (`6M` or `12M`) and toggle area spline charts across `Daily`, `Weekly`, or `Monthly` views.

### 4. Interactive Visual Design & High-Performance UI
- **Swiss Financial Aesthetic:** High-contrast typography with `tabular-nums`, Royal Blue `#1D4ED8` primary accents, and Lime `#A3E635` highlights.
- **Origin-Based Circular Reveal Dark Mode:** Smooth transition using View Transitions API originating from the exact click coordinates of the theme toggle.
- **Shadcn UI & Radix Primitives:** Accessible slider limits, switches, and Framer Motion sliding tabs with spring physics.
- **Privacy Masking:** Toggle balance visibility to `Rp •••••••••` with persistence in `localStorage`.
- **Export Formats:** Generate printable PDF reports with `jspdf-autotable` or multi-sheet Excel workbooks (`.xlsx`).

---

## 🛠️ Tech Stack

- **Runtime & Package Manager:** [Bun](https://bun.sh) (`bun`, `bunx`)
- **Framework:** [Next.js 15](https://nextjs.org) (App Router, Server Components & Route Handlers)
- **Language:** TypeScript 5 (Strict Mode)
- **Database & ORM:** PostgreSQL with [Prisma ORM](https://www.prisma.io)
- **Styling:** [Tailwind CSS 3](https://tailwindcss.com) + PostCSS + Autoprefixer
- **UI Components & Animation:** [Radix UI](https://www.radix-ui.com), [Framer Motion](https://www.framer.com/motion), [Lucide React](https://lucide.dev)
- **Data Visualization:** [Recharts](https://recharts.org)
- **Spreadsheets & Documents:** [SheetJS (xlsx)](https://sheetjs.com), [jsPDF](https://github.com/parallax/jsPDF) & AutoTable
- **Authentication:** Scrypt salted password hashing + [jose](https://github.com/panva/jose) HS256 JWT in Edge Middleware

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.2+ recommended)
- A running PostgreSQL database instance (Neon, Vercel Postgres, Supabase, or local PostgreSQL)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/wealthy-dashboard.git
cd wealthy-dashboard

# Install dependencies using Bun
bun install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your database credentials:

```bash
cp .env.example .env
```

Required variables:

```env
# PostgreSQL connection strings
DATABASE_PRISMA_DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public&sslmode=require"
DATABASE_POSTGRES_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# JWT Secret (minimum 32 characters)
JWT_SECRET="your_secure_random_jwt_secret_key_minimum_32_characters"

# Default admin credentials for seeding
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin_secure_password"
```

### 3. Initialize Database & Seed Default Wallets

Apply database migrations and populate the 9 primary wallets and default budget settings:

```bash
# Validate Prisma schema
bunx prisma validate

# Generate Prisma Client
bunx prisma generate

# Apply migrations
bunx prisma migrate dev

# Seed primary wallets and initial admin user
bun run db:seed
```

### 4. Run Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Default login credentials:
- **Username:** `admin` (or defined in `.env`)
- **Password:** `admin_secure_password` (or defined in `.env`)

---

## 📁 Project Structure

```text
wealthy-dashboard/
├── .github/workflows/ci.yml       # GitHub Actions CI with Bun
├── prisma/
│   ├── schema.prisma              # PostgreSQL schema (User, Wallet, Transaction, Budget, ImportLog)
│   ├── seed.ts                    # Seeder for primary wallets & admin user
│   └── migrations/                # Version-controlled SQL migrations
├── public/
│   ├── logo.svg                   # Brand mark vector asset
│   └── templates/                 # Fallback static Excel template
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx     # Standalone login interface
│   │   │   └── register/page.tsx  # Standalone registration interface
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         # Dashboard layout wrapper
│   │   │   └── page.tsx           # Multi-tab view coordinator & filter state
│   │   ├── api/
│   │   │   ├── auth/              # Login, register, logout endpoints
│   │   │   ├── dashboard/summary/ # Aggregated KPI & monthly analytics
│   │   │   ├── export/excel/      # Multi-sheet Excel workbook generator
│   │   │   ├── settings/budget/   # Monthly budget target mutations
│   │   │   ├── template/excel/    # On-the-fly sample Excel builder
│   │   │   ├── transactions/      # Paginated transactions & Excel import injector
│   │   │   └── wallets/           # Wallet listing & manual balance update
│   │   ├── globals.css            # Tailwind directives, theme variables, date picker styles
│   │   └── layout.tsx             # Root layout with SVG favicon & metadata
│   ├── components/
│   │   ├── layout/
│   │   │   ├── GlobalFilterBar.tsx        # Filter toolbar with inline date range picker
│   │   │   ├── ThemeToggleCircular.tsx    # Origin-based circular reveal toggle
│   │   │   └── TopPillNavbar.tsx          # Spring sliding navigation pill
│   │   ├── modals/
│   │   │   ├── EditBalanceModal.tsx       # Single & bulk wallet balance editor
│   │   │   └── ImportExcelModal.tsx       # Drag-and-drop Excel upload modal
│   │   ├── tabs/
│   │   │   ├── DashboardTab.tsx           # KPI cards, arc gauge, overview chart
│   │   │   ├── WalletsTab.tsx             # Multi-wallet liquidity & visibility
│   │   │   ├── TransactionsTab.tsx        # Paginated table & card switch views
│   │   │   ├── AnalyticsTab.tsx           # Cashflow trend, spending vs target, category share
│   │   │   └── ReportsTab.tsx             # Export hub & upload log records
│   │   └── ui/                            # Shadcn sliders, switches, counters, skeleton cards
│   ├── lib/                               # Auth, Excel parser, PDF generator, Prisma client
│   └── middleware.ts                      # Edge route protection via jose JWT
├── package.json
└── tsconfig.json
```

---

## 🧪 Verification & Static Checks

```bash
# Type check without compilation
bunx tsc --noEmit

# ESLint analysis
bun run lint

# Prisma schema validation
bunx prisma validate
```

---

## 📄 License

Private and proprietary. All rights reserved.

