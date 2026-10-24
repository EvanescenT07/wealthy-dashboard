# Product Requirements Document (PRD)
## WealthyDashboard — Personal Finance & Multi-Wallet Analytics Dashboard

| Metadata Dokumen | Detail Spesifikasi |
| :--- | :--- |
| **Nama Produk** | WealthyDashboard |
| **Versi Dokumen** | 2.0.0 (Final Release) |
| **Tanggal Dokumen** | 24 Oktober 2026 |
| **Platform Target** | Responsive Web Application (Desktop, Tablet, Mobile) |
| **Package Manager & Runtime** | **Bun** (`bun` / `bunx`) |
| **Hosting & Database** | Vercel (Next.js Serverless + Edge) & Vercel Postgres (Neon) |
| **Tech Stack Utama** | Next.js 15 (App Router, Full-Stack TypeScript), Tailwind CSS, Motion (`framer-motion`), Prisma ORM, Recharts, SheetJS (`xlsx`), jsPDF + AutoTable, `jose` (JWT) |

---

## 1. Ringkasan Eksekutif & Tujuan Proyek

**WealthyDashboard** adalah aplikasi web *full-stack* responsif dengan animasi yang halus (*smooth*) untuk memvisualisasikan laporan keuangan pribadi (*Spending* dan *Income*), memantau target anggaran bulanan, serta mengelola saldo dari berbagai dompet digital dan rekening bank (*multi-wallet*) berdasarkan input file Excel.

### 1.1 Tujuan Utama
1. **Inisialisasi & Injeksi Data Excel Tanpa Kehilangan Data Lama (*Non-Destructive Import*):** Pengguna dapat melakukan *initial import* dari file Excel historis mereka, lalu di kemudian hari mengunggah file Excel baru untuk menambahkan (*inject*) transaksi baru tanpa menghapus histori transaksi lama di database PostgreSQL.
2. **Manajemen Saldo Hibrida (Manual Balance Override):** Memungkinkan pengguna mengatur saldo aktual (**Manual Balance** dalam format IDR) untuk setiap dompet digital/bank secara langsung, sambil tetap menampilkan ringkasan mutasi masuk/keluar berdasarkan histori transaksi Excel.
3. **Analitik Visual dengan Filter Berlapis:** Menyediakan **Global Filter** (mengontrol seluruh halaman) dan **Per-Chart Filter** (mengontrol grafik spesifik secara independen).
4. **Ekspor Laporan Siap Pakai:** Mendukung pengunduhan data dan laporan ke dalam format **PDF** dan **Excel (`.xlsx`)** sesuai filter yang sedang aktif, serta pengunduhan **Template Excel** langsung di dalam dialog impor tanpa memerlukan layanan *cloud blob storage*.
5. **Transisi Dark Mode Interaktif (*Origin-Based Circular Reveal*):** Animasi perpindahan tema terang ke gelap (atau sebaliknya) berjalan sangat *smooth* dengan titik awal gelombang ekspansi yang bermula persis dari koordinat klik pada ikon *Dark Mode toggle* di *top navigation bar*.

---

## 2. Instruksi Khusus untuk AI Coding Agent (Bun Runtime & Execution Rules)

Bagian ini merupakan instruksi wajib (*system guardrails*) yang harus dipatuhi oleh AI Coding Agent saat mengimplementasikan kode **WealthyDashboard**:

### 2.1 Aturan Penggunaan Package Manager (Wajib Bun)
* **Wajib menggunakan `bun` dan `bunx`** untuk seluruh instalasi paket, eksekusi skrip, dan pengelolaan ORM.
* **DILARANG** menggunakan `npm`, `npx`, `yarn`, atau `pnpm` dalam kondisi apa pun.
* Pastikan file *lock* yang digunakan hanya `bun.lockb` (atau `bun.lock`). Jangan membuat `package-lock.json` atau `yarn.lock`.

### 2.2 Batasan Eksekusi Server & Build (Strict Execution Boundary)
* **DILARANG MENJALANKAN `bun run dev`, `bun run build`, atau `bun start`:** AI Agent **tidak boleh** mengeksekusi server *development* maupun proses *production build* secara otomatis karena developer akan menjalankannya secara manual di terminal lokal.
* Untuk memverifikasi kebenaran kode dan tipe data setelah menulis file, AI Agent hanya diperbolehkan menjalankan pemeriksaan statis berikut:
  * Validasi skema Prisma: `bunx prisma validate`
  * Generate Prisma Client: `bunx prisma generate`
  * Pemeriksaan tipe TypeScript tanpa kompilasi build: `bunx tsc --noEmit`

### 2.3 Daftar Perintah Standar Proyek (Bun Commands)
```bash
# 1. Instalasi seluruh dependencies
bun install

# 2. Menambahkan paket utama & devDependencies
bun add next react react-dom framer-motion recharts xlsx jspdf jspdf-autotable jose lucide-react clsx tailwind-merge date-fns
bun add -d typescript @types/node @types/react @types/react-dom prisma @prisma/client tailwindcss postcss autoprefixer eslint eslint-config-next

# 3. Operasi Database & Prisma ORM
bunx prisma validate
bunx prisma generate
bunx prisma db push
bun run db/seed.ts

# 4. Verifikasi Statis (Aman dijalankan AI Agent)
bunx tsc --noEmit
bun run lint

# 5. Eksekusi Manual (HANYA dijalankan manual oleh User/Developer)
# bun run dev
# bun run build
```

---

## 3. Arsitektur Input Excel & Mekanisme Non-Destructive Import

### 3.1 Struktur Standar Template Excel
Sistem menerima file `.xlsx` atau `.xls` (baik dari export aplikasi *Money Manager* maupun dari *Template Standar WealthyDashboard* yang diunduh di dalam dialog import) dengan struktur kolom berikut:

| Nama Kolom | Tipe Data | Wajib | Keterangan Penggunaan di Sistem |
| :--- | :--- | :--- | :--- |
| `Date` | Date / String | Ya | Tanggal & waktu transaksi (`MM/DD/YYYY HH:mm:ss` atau `YYYY-MM-DD`). |
| `Account` | String | Ya | Nama wallet/rekening (otomatis dibuat di DB secara dinamis jika belum ada). |
| `Category` | String | Ya | Kategori utama transaksi (misal: `Food`, `Salary`, `Transportation`). |
| `Subcategory` | String | Tidak | Sub-kategori transaksi (misal: `Coffee`, `Bensin`, `Daily`). |
| `Note` | String | Tidak | Catatan singkat transaksi. |
| `IDR` | Number | Ya | Nilai nominal utama dalam Rupiah (digunakan sebagai *Single Source of Truth*). |
| `Income/Expense` | Enum String | Ya | Jenis arus kas: `Income` (Pemasukan) atau `Expense` (Pengeluaran). |
| `Description` | String | Tidak | Deskripsi detail tambahan. |
| `Amount` | Number | Tidak | Nominal cadangan (jika kolom `IDR` kosong, sistem membaca kolom `Amount`). |
| `Currency` | String | Tidak | Default `IDR` (termasuk konversi langsung untuk Paypal ke IDR). |

*(Catatan Normalisasi: Jika file Excel memiliki kolom tambahan seperti `Account.1` di kolom ke-11 yang berisi nilai desimal konversi, parser wajib mengabaikannya dan hanya mengambil nilai bulat dari kolom `IDR`).*

### 3.2 Strategi Penyimpanan & Injeksi Data Baru (Data Lama 100% Aman)
Agar setiap kali pengguna melakukan *import* Excel baru data lama **tidak hilang** dan **tidak terjadi duplikasi** apabila file yang diunggah masih memuat sebagian transaksi lama, sistem menggunakan mekanisme **Deterministic Row Fingerprint (`externalHash`)**:

1. **Initial Import:** Saat pertama kali digunakan, pengguna mengunggah file Excel utama. Seluruh baris transaksi disimpan ke PostgreSQL dan seluruh nama `Account` di Excel otomatis terdaftar sebagai *Wallet* secara dinamis.
2. **Subsequent Import (Inject Data Baru):**
   * Saat pengguna mengunggah file Excel baru, sistem membuat kode unik SHA-256 (`externalHash`) untuk setiap baris berdasarkan normalisasi string:
     $$\text{externalHash} = \text{SHA256}(\text{ISO\_Date} \parallel \text{Account} \parallel \text{Category} \parallel \text{Subcategory} \parallel \text{AmountIDR} \parallel \text{Type} \parallel \text{Note} \parallel \text{RowOccurrenceIndex})$$
   * Penambahan `RowOccurrenceIndex` (indeks urutan untuk baris yang identik persis pada detik yang sama di dalam satu file) memastikan dua transaksi sah yang kembar di hari yang sama tetap tersimpan, namun tidak akan terduplikasi saat file yang sama diunggah ulang.
   * Sistem menjalankan operasi `prisma.transaction.createMany({ data: parsedRows, skipDuplicates: true })`.
   * **Hasil:** Seluruh data lama di database **100% tetap utuh**, baris lama yang sudah ada diabaikan secara otomatis, dan hanya transaksi baru yang di-*inject*.
3. **Proteksi Saldo Manual:** Proses import Excel hanya melakukan `upsert` nama *Wallet* baru dan **tidak akan pernah mereset atau mengubah** nilai `manualBalance` yang sudah diatur pengguna pada masing-masing wallet.

### 3.3 Pengelolaan Template Excel Tanpa Blob Storage
Fitur unduh template di dalam dialog import **tidak membutuhkan layanan cloud storage tambahan (seperti Vercel Blob atau AWS S3)**. Sistem menyediakan tombol dan tautan unduh di dalam modal dialog Import Excel melalui:
* **Dynamic In-Memory Endpoint (`GET /api/template/excel`):** Menghasilkan file `WealthyDashboard_Import_Template.xlsx` secara *on-the-fly* di memori server menggunakan library `xlsx` yang berisi header kolom standar beserta 3 baris contoh pengisian.
* **Fallback Static Asset (`/public/templates/WealthyDashboard_Import_Template.xlsx`):** Disajikan instan melalui CDN Vercel menggunakan atribut `<a href="/api/template/excel" download="WealthyDashboard_Import_Template.xlsx">`.

---

## 4. Sistem Desain, UI/UX, & Spesifikasi Animasi

Desain mengadaptasi tata letak bersih, *high-contrast*, dan *card-based* sesuai dengan 3 gambar referensi desain yang telah ditentukan:

### 4.1 Palet Warna & Tema (Light & Dark Mode)

| Token Warna | Light Mode | Dark Mode | Penggunaan UI |
| :--- | :--- | :--- | :--- |
| `bg-canvas` | `#F4F5F7` | `#0B0F17` | Latar belakang utama aplikasi |
| `bg-surface` | `#FFFFFF` | `#151C28` | Kartu komponen, tabel, dan dialog modal |
| `bg-elevated` | `#F8FAFC` | `#1E293B` | Hover state baris tabel, pill filter inaktif, input field |
| `text-primary` | `#0F172A` | `#F8FAFC` | Judul, angka KPI utama (Kontras WCAG AA $\ge 4.5:1$) |
| `text-secondary` | `#64748B` | `#94A3B8` | Label metrik, sub-judul, sumbu koordinat grafik |
| `accent-primary` | `#1D4ED8` | `#3B82F6` | Hero KPI Card (*Royal Blue*), grafik utama, tombol aksi primer |
| `accent-lime` | `#A3E635` | `#BEF264` | Aksen sekunder pada bar chart bertumpuk & grafik donat |
| `semantic-income` | `#22C55E` | `#4ADE80` | Indikator *Income*, badge pertumbuhan positif (`+12%`) |
| `semantic-expense` | `#EF4444` | `#F87171` | Indikator *Expense*, badge pengeluaran & peringatan |

### 4.2 Tipografi & Format Angka
* **Font Family:** `Plus Jakarta Sans` atau `Inter` untuk seluruh antarmuka; `JetBrains Mono` untuk kode hash/log.
* **Tabular Numerals:** Seluruh elemen yang menampilkan nominal mata uang (`Rp 50.763.980`) dan persentase (`+9.1%`) wajib menggunakan kelas utilitas `tabular-nums` (`font-variant-numeric: tabular-nums`) agar posisi digit sejajar secara vertikal dan tidak bergeser saat animasi *counter* berjalan.

### 4.3 Spesifikasi Animasi Transisi Dark Mode (*Origin-Based Circular Reveal*)
Saat pengguna mengklik tombol ikon *Dark Mode / Light Mode* di *top navigation bar*, perubahan tema tidak menggunakan *fade* biasa, melainkan memancar secara melingkar (*smooth circular reveal*) tepat dari titik koordinat ikon yang diklik:

1. **Deteksi Koordinat Klik (`x`, `y`):**
   * Saat *onClick* dipicu pada tombol tema, sistem mengambil koordinat pusat tombol menggunakan `event.currentTarget.getBoundingClientRect()` atau `(event.clientX, event.clientY)`.
2. **Perhitungan Radius Maksimum Layar ($R_{\max}$):**
   * Sistem menghitung jarak terjauh dari titik klik $(x, y)$ ke sudut terjauh *viewport* $(W, H)$ menggunakan rumus Pythagoras:
     $$R_{\max} = \sqrt{\max(x, W - x)^2 + \max(y, H - y)^2}$$
3. **Eksekusi View Transitions API + Clip-Path Animation:**
   * Menggunakan `document.startViewTransition(() => toggleThemeState())`.
   * Pada pseudo-element `::view-transition-new(root)`, diterapkan animasi `clip-path` menggunakan `document.documentElement.animate()`:
     * **Frame Awal (`0%`):** `clipPath: circle(0px at ${x}px ${y}px)`
     * **Frame Akhir (`100%`):** `clipPath: circle(${R_max}px at ${x}px ${y}px)`
     * **Timing & Easing:** Durasi `550ms`, kurva `cubic-bezier(0.22, 1, 0.36, 1)`, dengan `::view-transition-old(root)` dan `::view-transition-new(root)` diatur ke `animation: none; mix-blend-mode: normal;`.
   * **Fallback Browser:** Jika peramban tidak mendukung `document.startViewTransition`, sistem otomatis menggunakan *overlay* `motion.div` dari Framer Motion yang menganimasikan `clipPath` dengan titik pusat dan kurva *easing* yang sama.

### 4.4 Spesifikasi Animasi Komponen (`motion` / Framer Motion)
1. **Floating Navigation Pill:** Menggunakan `layoutId="activeNavPill"` dengan konfigurasi pegas (`type: "spring", stiffness: 380, damping: 30`) sehingga indikator hitam/biru berpindah secara mulus antar-tab (`Dashboard`, `Wallets`, `Transactions`, `Analytics`, `Reports`).
2. **Animated Number Counter:** Angka pada kartu KPI dan Total Balance menggunakan `useSpring` dan `useTransform` untuk bertransisi mulus saat rentang tanggal atau filter diubah.
3. **Staggered Card Entrance:** Kartu-kartu pada halaman muncul berurutan saat tab berpindah (`staggerChildren: 0.05, delayChildren: 0.02`).
4. **Cakupan State UI:** Setiap komponen data wajib memiliki **Loading State** (kerangka *shimmer* sesuai bentuk kartu), **Empty State** (ilustrasi bersih + tombol *Reset Filter* atau *Import Excel* ketika data kosong), dan **Error State** (pesan kesalahan + tombol *Retry*).

---

## 5. Arsitektur Navigasi Multi-Tab & Spesifikasi Fitur Detail

```
+---------------------------------------------------------------------------------------+
| [Logo] WealthyDashboard   ( Dashboard | Wallets | Transactions | Analytics | Reports ) |
|                           [Global Filter: Periode | Wallet | Kategori | Tipe] [🌙][🔒] |
+---------------------------------------------------------------------------------------+
```

### 5.1 Tab 1: `Dashboard` (Adaptasi Gambar Referensi 2)
1. **Hero Card — Total Balance (Kiri Atas):**
   * Menampilkan **Total Balance (IDR)** yang merupakan penjumlahan dari `manualBalance` seluruh wallet yang aktif/visibel.
   * Dilengkapi tombol ikon mata (*Privacy Masking Toggle*) untuk menyembunyikan angka menjadi `Rp •••••••••` (tersimpan di `localStorage`).
   * Menampilkan grafik matriks kotak warna-warni di sisi kanan kartu yang merepresentasikan proporsi saldo antar-wallet.
   * Memiliki 3 tombol aksi cepat di bagian bawah kartu:
     * **`+ Edit Balance`**: Membuka modal untuk mengubah saldo manual per wallet.
     * **`↑ Import Excel`**: Membuka modal unggah file Excel (lengkap dengan tautan unduh template Excel).
     * **`↓ Export Report`**: Membuka menu unduh cepat PDF / Excel.
2. **Summary Card — Total Income (Tengah Atas):**
   * Menampilkan ikon panah hijau ke bawah, total pemasukan pada periode aktif, *badge* selisih nominal & persentase dibanding periode sebelumnya, serta pembagian nominal antara **Primary Income** (`Salary`, `Bonus`, `THR`, `Part Time`) dan **Other Income** (`Allowance`, `Investment`, `Other`).
   * Memiliki *dropdown filter periode* mandiri di pojok kanan atas kartu.
3. **Summary Card — Total Expense (Kanan Atas):**
   * Menampilkan ikon panah merah ke atas, total pengeluaran pada periode aktif, *badge* perbandingan terhadap bulan lalu, serta *horizontal stacked bar* yang merinci proporsi **Top 3 Kategori Pengeluaran** (misal: `Food`, `Paylater`, `Transportation`).
4. **Monthly Budget Target Gauge (Kiri Bawah):**
   * Kartu berlatar gelap (*dark card*) dengan grafik setengah lingkaran (*circular arc gauge*) yang menampilkan realisasi pengeluaran bulan berjalan dibandingkan dengan **Target/Limit Anggaran Bulanan** (`monthlyLimitIdr`), disertai tombol edit target.
   * Di bawah gauge terdapat daftar *progress bar* persentase pengeluaran untuk kategori prioritas.
5. **Monthly Income vs Expense Overview Chart (Tengah Bawah):**
   * *Interactive Stacked/Grouped Bar Chart* bulanan (`JAN` s/d `DEC`) dengan *floating dark tooltip* saat di-*hover* yang menampilkan nominal `Income`, `Expense`, dan `Net Cashflow`.
   * **Per-Chart Filter:** Dilengkapi *dropdown* pemilih **Tahun** (dinamis sesuai tahun yang ada di database) dan **Rentang Bulan** (`6 Month` / `12 Month`).
6. **Quick Export Card & Recent Transactions Table (Kanan Bawah & Bawah):**
   * Kartu *Track & Print Report* untuk mencetak laporan PDF satu klik, serta tabel **Recent Transactions** (10 transaksi terbaru) lengkap dengan kolom pencarian cepat (*instant search*) dan indikator status.

### 5.2 Tab 2: `Wallets` (Manajemen Multi-Wallet & Manual Balance)
* **9 Pre-seeded Wallets + Dynamic Excel Wallets:**
  * Saat inisialisasi database (`seed`), sistem menyediakan 9 wallet utama: **`Shopeepay`**, **`Gopay`**, **`Jago`**, **`Blu`**, **`Mandiri`**, **`Ovo`**, **`Seabank`**, **`Paypal`**, dan **`Jenius`**.
  * Seluruh nama `Account` lain yang ditemukan saat import Excel (seperti `Accounts`, `Cash`, `Rdn Stockbit`, `Jago - Paylater`, `BCA`, `Card`, `Other`) otomatis ditambahkan dan ditampilkan secara dinamis.
* **Mekanisme Saldo Opsi A (Manual Override dalam IDR):**
  * Semua wallet (termasuk `Paypal`) disimpan dan ditampilkan dalam mata uang **IDR (Rupiah)**.
  * Angka utama pada setiap kartu wallet adalah **Manual Balance** yang dapat diedit kapan saja oleh pengguna (mengatasi ketiadaan pencatatan transfer antar-rekening di histori Excel).
  * Di bagian bawah kartu wallet tetap ditampilkan informasi analitik dari Excel: `Total Income (Excel)`, `Total Expense (Excel)`, dan `Net Cashflow (Excel)` sebagai informasi pendamping.
* **Fitur Edit Balance & Visibility Toggle:**
  * Pengguna dapat mengedit saldo satu per satu langsung dari kartu wallet atau menggunakan modal **Bulk Edit All Balances**.
  * Pengguna dapat menyembunyikan/menampilkan akun historis tertentu (seperti akun `Accounts`) dari perhitungan *Total Balance* utama menggunakan sakelar `isVisible`.

### 5.3 Tab 3: `Transactions` (Adaptasi Gambar Referensi 3)
* **4 KPI Summary Cards di Atas:**
  1. `Total Transactions`: Jumlah baris transaksi pada filter aktif.
  2. `Active Spending Days`: Jumlah hari unik terdapat transaksi pada periode aktif.
  3. `Highest Single Expense`: Nominal pengeluaran terbesar beserta kategori dan catatannya.
  4. `Avg. Daily Expense`: Rata-rata pengeluaran harian pada periode aktif.
* **Filter Pills, Search, & View Switcher:**
  * Filter *pill* cepat: `All (Count)`, `Income (Count)`, `Expense (Count)`.
  * *Search Bar* dengan *debounce* `300ms` untuk mencari berdasarkan `Note`, `Description`, `Category`, `Subcategory`, atau nama `Wallet`.
  * Tombol pengubah tampilan: **`Table View`** (tabel lengkap) dan **`Cards View`** (grid kartu transaksi responsif).
* **Tabel Transaksi Berpaginasi:** Menampilkan avatar/ikon wallet berwarna, nama kategori & subkategori, catatan transaksi, *badge* tipe (`Income` hijau / `Expense` merah), nominal dalam format `Rp`, dan waktu transaksi.

### 5.4 Tab 4: `Analytics` (Adaptasi Gambar Referensi 1)
* **4 Top Analytic KPI Cards:**
  * Kartu ke-1 menggunakan latar **Royal Blue (`#1D4ED8`)** untuk menampilkan **Net Cashflow (IDR)** beserta persentase perubahan bulanan.
  * Kartu ke-2, ke-3, dan ke-4 berlatar putih/surface menampilkan **Total Transactions Count**, **Savings Rate (%)** ($\frac{\text{Income} - \text{Expense}}{\text{Income}} \times 100\%$), dan **Average Transaction Size (IDR)**.
* **Cashflow Trend Spline Chart (Kiri Tengah — Per-Chart Filter):**
  * Grafik kurva halus (*Area Spline Chart*) dengan gradasi warna biru di bawah garis dan *floating dark badge* pada titik puncak/aktif.
  * Memiliki filter independen untuk memilih metrik (`Expense`, `Income`, atau `Net Cashflow`) dan granularitas waktu (`Daily`, `Weekly`, `Monthly`).
* **Spending vs Target Line Chart (Kanan Tengah — Per-Chart Filter):**
  * Grafik garis yang membandingkan akumulasi pengeluaran aktual (garis biru) terhadap garis lurus batas anggaran (*Target Line* hitam/abu-abu).
* **3 Bottom Breakdown Cards:**
  1. **Category Share (Donut Chart):** Menampilkan persentase dan nominal per kategori (dilengkapi toggle `Expense` vs `Income`).
  2. **Expense Funnel / Allocation Progress:** Menampilkan distribusi pengeluaran dari kelompok terbesar hingga terkecil dengan *horizontal pill bars* dan persentase terhadap total.
  3. **Top Wallets & Subcategories (Horizontal Bars):** Menampilkan peringkat dompet atau subkategori dengan pengeluaran tertinggi beserta nilai Rupiah dan *progress bar* proporsional.

### 5.5 Tab 5: `Reports` (Pusat Ekspor PDF/Excel & Riwayat Impor)
* **Panel Kustomisasi Ekspor:** Pengguna dapat memilih rentang tanggal spesifik, memilih wallet tertentu, dan memilih jenis transaksi sebelum menekan tombol **Export to PDF** atau **Export to Excel (`.xlsx`)**.
* **Tabel Riwayat Impor Excel (`ImportLog`):** Menampilkan daftar waktu unggah file Excel sebelumnya, nama file, jumlah baris yang dibaca, jumlah transaksi baru yang berhasil di-*inject*, dan jumlah baris duplikat yang dilewati.

---

## 6. Skema Database (Prisma ORM + Vercel Postgres)

File `prisma/schema.prisma` dirancang untuk kompatibel penuh dengan **Vercel Postgres (Neon)** menggunakan koneksi *pooled* dan *non-pooling*:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}

generator client {
  provider = "prisma-client-js"
}

enum TransactionType {
  INCOME
  EXPENSE
}

model Wallet {
  id            String        @id @default(cuid())
  name          String        @unique
  slug          String        @unique
  manualBalance BigInt        @default(0) // Disimpan dalam IDR (Opsi A: Manual Override)
  color         String        @default("#1D4ED8")
  icon          String        @default("wallet")
  isDefault     Boolean       @default(false) // true untuk 9 wallet utama
  isVisible     Boolean       @default(true)  // kontrol tampil/sembunyi dari Total Balance
  sortOrder     Int           @default(99)
  updatedAt     DateTime      @updatedAt
  createdAt     DateTime      @default(now())
  transactions  Transaction[]

  @@index([isVisible, sortOrder])
}

model Transaction {
  id           String          @id @default(cuid())
  externalHash String          @unique // SHA-256 fingerprint untuk mencegah duplikasi saat inject Excel
  date         DateTime        @db.Timestamptz(3)
  walletId     String
  wallet       Wallet          @relation(fields: [walletId], references: [id], onDelete: Cascade)
  category     String
  subcategory  String?
  note         String?
  description  String?
  amountIdr    BigInt          // Diambil dari kolom 'IDR' di Excel
  type         TransactionType // INCOME atau EXPENSE
  currency     String          @default("IDR")
  createdAt    DateTime        @default(now())

  @@index([date(sort: Desc)])
  @@index([walletId, date])
  @@index([type, category])
}

model BudgetSetting {
  id              String   @id @default("default")
  monthlyLimitIdr BigInt   @default(5000000)
  updatedAt       DateTime @updatedAt
}

model ImportLog {
  id            String   @id @default(cuid())
  fileName      String
  totalRowsRead Int
  insertedCount Int
  skippedCount  Int
  importedAt    DateTime @default(now())
}
```

---

## 7. Kontrak API & Keamanan Autentikasi (Passcode + JWT)

### 7.1 Daftar Endpoint API (Next.js App Router)

| Method & Endpoint | Deskripsi Fungsi | Parameter / Payload |
| :--- | :--- | :--- |
| `POST /api/auth/login` | Memvalidasi *passcode* & menerbitkan *cookie* JWT `httpOnly` | `{ passcode: string }` |
| `POST /api/auth/logout` | Menghapus *cookie* sesi JWT | - |
| `GET /api/template/excel` | Mengunduh file `.xlsx` template standar secara *in-memory* | - |
| `POST /api/transactions/import` | Memvalidasi file Excel & menjalankan *non-destructive inject* (`skipDuplicates: true`) | `FormData (file: .xlsx)` |
| `GET /api/dashboard/summary` | Mengambil agregat KPI, data grafik bulanan, dan distribusi kategori | `?from=&to=&wallets=&type=&categories=&chartYear=` |
| `GET /api/transactions` | Mengambil daftar transaksi dengan paginasi, filter *pill*, dan *search* | `?page=1&limit=25&search=&type=&walletId=&from=&to=` |
| `GET /api/wallets` | Mengambil semua wallet (9 utama + dinamis) beserta ringkasan mutasi Excel | `?from=&to=` |
| `PATCH /api/wallets/balance` | Memperbarui `manualBalance` (satuan atau *bulk*) dan status `isVisible` | `{ updates: [{ walletId, manualBalance, isVisible? }] }` |
| `PATCH /api/settings/budget` | Memperbarui target pengeluaran bulanan (`monthlyLimitIdr`) | `{ monthlyLimitIdr: number }` |
| `GET /api/export/excel` | Menghasilkan & mengunduh laporan `.xlsx` berdasarkan filter aktif | `?from=&to=&wallets=&type=&categories=` |

### 7.2 Spesifikasi Autentikasi Passcode & JWT (`jose`)
* **Variabel Lingkungan (`.env`):**
  * `POSTGRES_PRISMA_URL`: URL koneksi *pooled* Vercel Postgres.
  * `POSTGRES_URL_NON_POOLING`: URL koneksi *direct* Vercel Postgres.
  * `APP_PASSCODE`: Passcode akses dashboard (contoh: `123456` atau string rahasia pengguna).
  * `JWT_SECRET`: Kunci rahasia minimal 32 karakter untuk penandatanganan token HMAC-SHA256 (`HS256`).
* **Alur Kerja Proteksi (`middleware.ts`):**
  * Berjalan di *Next.js Edge Runtime*.
  * Memeriksa keberadaan dan validitas cookie `wealthy_session` menggunakan fungsi `jwtVerify` dari library `jose`.
  * Jika pengguna belum terautentikasi dan mengakses halaman selain `/login`, otomatis diarahkan (*redirect*) ke `/login`.
  * Jika permintaan ke `/api/*` (selain `/api/auth/login` dan `/api/template/excel`) tidak memiliki JWT yang valid, server mengembalikan status `401 Unauthorized`.

---

## 8. Konfigurasi CI/CD GitHub Actions (Bun Workflow)

Proyek dilengkapi dengan pipeline **GitHub Actions** di `.github/workflows/ci.yml` yang menggunakan **Bun** secara penuh untuk memastikan setiap *push* dan *pull request* ke branch `main` atau `develop` tervalidasi skema Prisma, *linting*, dan tipe TypeScript-nya:

```yaml
name: WealthyDashboard CI Pipeline (Bun)

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality-and-typecheck:
    name: Validate Prisma, Lint & TypeScript (Bun)
    runs-on: ubuntu-latest

    env:
      POSTGRES_PRISMA_URL: "postgresql://dummy:dummy@localhost:5432/wealthydb?schema=public"
      POSTGRES_URL_NON_POOLING: "postgresql://dummy:dummy@localhost:5432/wealthydb?schema=public"
      JWT_SECRET: "ci_dummy_jwt_secret_key_minimum_32_characters_long"
      APP_PASSCODE: "123456"

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Bun Runtime
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Cache Bun Dependencies
        uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb', '**/bun.lock', 'package.json') }}
          restore-keys: |
            ${{ runner.os }}-bun-

      - name: Install Dependencies with Bun
        run: bun install --frozen-lockfile

      - name: Validate Prisma Schema
        run: bunx prisma validate

      - name: Generate Prisma Client
        run: bunx prisma generate

      - name: Run Next.js ESLint
        run: bun run lint

      - name: Run TypeScript Compiler Check
        run: bunx tsc --noEmit
```

---

## 9. Struktur Direktori Proyek & Tahapan Implementasi

### 9.1 Struktur Direktori Standar
```text
wealthy-dashboard/
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions CI dengan Bun
├── prisma/
│   ├── schema.prisma               # Skema PostgreSQL (Wallet, Transaction, BudgetSetting, ImportLog)
│   └── seed.ts                     # Seeder 9 Wallet Utama & Default Budget
├── public/
│   └── templates/                  # Fallback lokasi template statis jika diperlukan
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx      # Halaman Passcode Login
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Top Pill Navbar, Global Filter Bar, Theme Reveal Provider
│   │   │   ├── page.tsx            # Multi-Tab Container (Dashboard, Wallets, Transactions, Analytics, Reports)
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   └── logout/route.ts
│   │   │   ├── dashboard/
│   │   │   │   └── summary/route.ts
│   │   │   ├── export/
│   │   │   │   └── excel/route.ts
│   │   │   ├── settings/
│   │   │   │   └── budget/route.ts
│   │   │   ├── template/
│   │   │   │   └── excel/route.ts  # Generator template Excel in-memory
│   │   │   ├── transactions/
│   │   │   │   ├── route.ts
│   │   │   │   └── import/route.ts # Non-destructive Excel parser & injector
│   │   │   └── wallets/
│   │   │       ├── route.ts
│   │   │       └── balance/route.ts
│   │   ├── globals.css             # Tailwind + View Transitions CSS rules
│   │   └── layout.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopPillNavbar.tsx
│   │   │   ├── ThemeToggleCircular.tsx # Origin-based circular reveal dark mode button
│   │   │   └── GlobalFilterBar.tsx
│   │   ├── modals/
│   │   │   ├── ImportExcelModal.tsx    # Drag & drop Excel + tombol Download Template
│   │   │   └── EditBalanceModal.tsx    # Modal edit manual balance per wallet / bulk
│   │   ├── tabs/
│   │   │   ├── DashboardTab.tsx
│   │   │   ├── WalletsTab.tsx
│   │   │   ├── TransactionsTab.tsx
│   │   │   ├── AnalyticsTab.tsx
│   │   │   └── ReportsTab.tsx
│   │   └── ui/
│   │       ├── AnimatedCounter.tsx
│   │       └── SkeletonCard.tsx
│   ├── lib/
│   │   ├── auth.ts                 # Helper JWT sign & verify (jose)
│   │   ├── excel.ts                # SheetJS parser, SHA-256 row hashing, & exporter
│   │   ├── pdf.ts                  # jsPDF + AutoTable report generator
│   │   ├── prisma.ts               # PrismaClient singleton + BigInt JSON serializer
│   │   └── utils.ts                # Formatter Rupiah (IDR) & kalkulasi persentase
│   └── middleware.ts               # Proteksi route dengan JWT
├── .env.example
├── package.json
└── tsconfig.json
```

### 9.2 Tahapan Implementasi untuk AI Agent (Milestones)
1. **Milestone 1 — Inisialisasi Bun, Prisma Schema, & Seeding:**
   * Menyiapkan `package.json`, `prisma/schema.prisma`, `prisma/seed.ts` (untuk 9 wallet utama: `Shopeepay`, `Gopay`, `Jago`, `Blu`, `Mandiri`, `Ovo`, `Seabank`, `Paypal`, `Jenius`), dan konfigurasi `.github/workflows/ci.yml`.
2. **Milestone 2 — Autentikasi JWT & Pipeline Excel Non-Destructive:**
   * Membangun `middleware.ts`, halaman `/login`, endpoint `/api/template/excel`, dan endpoint `/api/transactions/import` dengan hashing SHA-256 (`skipDuplicates: true`).
3. **Milestone 3 — Sistem Desain, Circular Dark Mode Reveal, & Multi-Tab UI:**
   * Mengimplementasikan `ThemeToggleCircular.tsx` (View Transitions API dari koordinat ikon), `TopPillNavbar.tsx` dengan animasi `layoutId`, serta kelima tampilan tab (`Dashboard`, `Wallets`, `Transactions`, `Analytics`, `Reports`) sesuai gambar referensi.
4. **Milestone 4 — Integrasi Filter Berlapis, Edit Manual Balance, & Ekspor PDF/Excel:**
   * Menghubungkan Global Filter & Per-Chart Filter ke API PostgreSQL, mengaktifkan fitur *Edit Manual Balance* (IDR), serta memfinalisasi fitur ekspor PDF dan Excel.
5. **Milestone 5 — Verifikasi Statis (Tanpa `dev`/`build`):**
   * Menjalankan `bunx prisma validate`, `bunx prisma generate`, dan `bunx tsc --noEmit` hingga bebas dari error.