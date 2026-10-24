# WealthyDashboard Design System & Antislop Direction

## Identity & Mood
- **Product:** WealthyDashboard (Personal Finance & Multi-Wallet Analytics)
- **Visual Language:** High-contrast Swiss financial card interface with crisp tabular numerals, dark-slate / royal-blue focal anchoring, and responsive multi-tab navigation.
- **Dials:** `ENERGY 2 / RHYTHM 2 / MOTION 2`

## Color Palette (2 Core + 1 Accent + Semantic Cashflow)
| Token | Light Mode | Dark Mode | WCAG AA Purpose |
| :--- | :--- | :--- | :--- |
| `bg-canvas` | `#F4F5F7` | `#0B0F17` | Main application background |
| `bg-surface` | `#FFFFFF` | `#151C28` | Card, table, and modal container surface |
| `bg-elevated` | `#F8FAFC` | `#1E293B` | Interactive row hover, filter pills, inputs |
| `text-primary` | `#0F172A` | `#F8FAFC` | Primary headings & KPI figures (17.85:1 light / 16.34:1 dark) |
| `text-secondary` | `#475569` | `#94A3B8` | Labels, axes, and metadata (6.95:1 light / 6.67:1 dark) |
| `accent-primary` | `#1D4ED8` | `#3B82F6` | Focal Hero KPI card, primary CTA, active spline curve |
| `accent-lime` | `#A3E635` | `#BEF264` | Secondary chart series contrast against Royal Blue |
| `semantic-income` | `#15803D` / `#22C55E` | `#4ADE80` | Positive cashflow & income indicators |
| `semantic-expense` | `#B91C1C` / `#EF4444` | `#F87171` | Negative cashflow, expense alerts & budget threshold |

## One-Line Purpose Log (R-31 & Purpose-Gate)
- **Color (`#1D4ED8` Royal Blue Hero Card):** Anchors the single primary focal point on the Dashboard and Analytics views so the eye lands on Total Balance / Net Cashflow first (R-01).
- **Typography (`Plus Jakarta Sans` + `JetBrains Mono` + `tabular-nums`):** `Plus Jakarta Sans` provides clear geometric legibility for dense financial labels, `JetBrains Mono` distinguishes SHA-256 import hashes, and `tabular-nums` prevents horizontal jitter during spring counter transitions (R-06).
- **Layout (5-Tab Financial Workspace):** Separates executive summary (`Dashboard`), manual balance control (`Wallets`), line-item ledger (`Transactions`), deep trend inspection (`Analytics`), and export/audit history (`Reports`) around distinct user decisions (R-05, C-3).
- **Card Hierarchy (Asymmetric Hero + 2 Summary + 3 Bottom Breakdown):** Differentiates total liquidity from period flows and category breakdowns instead of repeating identical cards (R-14).
- **Icons (`lucide-react` domain icons):** Every icon maps directly to a concrete financial action (wallet, arrow-down-left for income, arrow-up-right for expense, eye/eye-off for privacy mask, file-spreadsheet for Excel import) with zero decorative sparkles or AI glyphs (R-04).
- **Motion (Origin-based circular theme reveal + `activeNavPill` spring + `AnimatedCounter`):** Theme reveal radiates from the clicked button coordinates (`550ms cubic-bezier(0.22, 1, 0.36, 1)`) to provide spatial continuity, and spring counters communicate magnitude changes on filter updates (R-19).
- **Shadows & Borders (`1px` subtle border + elevation on floating tooltips/modals only):** Keeps data cards grounded on the canvas while reserving shadow elevation strictly for overlays and active pills (R-12).

