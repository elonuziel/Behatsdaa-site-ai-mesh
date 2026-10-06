# Behatsdaa Participating Stores, Changing Deals & Billing Discounts Catalog 💳🎁🏷️

> **Live Web Application:** [https://elonuziel.github.io/stores-list/](https://elonuziel.github.io/stores-list/)

A fast, interactive web catalog and automated pipeline for:
1. **Rechargeable Card Stores**: All stores, chains, restaurants, fashion brands, and attractions participating in **[Behatsdaa](https://www.behatsdaa.org.il/card/chargingCard)** recharge cards (Club Cards, Fighter Card, Restaurants, Carrefour, Online Grocery, etc.).
2. **Rotating Deals, Coupons & Vouchers**: Dedicated consumer goods (holiday specials, electronics, home goods), attraction tickets, and food vouchers that rotate weekly/monthly.
3. **Statement Discounts (הנחות במעמד החיוב)**: Over 10,600 local businesses, shops, and services granting automatic statement discounts when paying with a Behatsdaa credit card (Max), powered by **[Be-Plus](https://be-plus.co.il/)**.

---

## 🚀 Live Demo & Key Features

Explore the catalog live at: **[https://elonuziel.github.io/stores-list/](https://elonuziel.github.io/stores-list/)**

- 🗂️ **Tri-Tab Dashboard**:
  - **Tab 1: רשתות וכרטיסים נטענים**: Search & filter 980+ participating store chains across 8 rechargeable wallets with accurate percentage discounts.
  - **Tab 2: מבצעים ושוברים ייעודיים**: Explore rotating, time-limited consumer deals, holiday specials, food vouchers, and attraction tickets with live pricing, savings calculation, and stock limits.
  - **Tab 3: הנחות במעמד החיוב**: Search & filter 10,600+ businesses across Israel granting automatic discounts (up to 20%+) at billing on Behatsdaa credit cards.
- ⚡ **High-Performance MiniSearch & Static API Architecture**:
  - **Sub-Millisecond Search**: Integrated MiniSearch engine delivers `< 1ms` average query latency across 10,600+ records.
  - **Optimized Initial Payload**: Initial `search-index.json` is compressed to under 400KB for lightning-fast First Contentful Paint.
  - **On-Demand Dynamic Loading**: Full modal details and deal specs are fetched lazily as dedicated static JSON endpoints (`/data/stores/[slug].json`, `/data/deals/[id].json`).
  - **Hebrew Normalization**: Full Hebrew normalization supporting final letters (`ך/כ`, `ם/מ`, `ן/נ`, `ף/פ`, `ץ/צ`), diacritics, and flexible multi-token matching.
- 🔗 **Smart Tri-Directional Pre-Computed Cross-Linking**:
  - Store cards in Tab 1 display badges when an active voucher (Tab 2) or a statement discount (Tab 3) exists for that merchant.
  - Deal cards in Tab 2 display badges when the supplier is also accepted on rechargeable wallets or grants credit card billing discounts.
  - Billing cards in Tab 3 link directly back to cards and vouchers.
  - Cross-linking is 100% pre-computed at build time for zero runtime overhead.
- 🏙️ **City & Location Filters**: Filter billing merchants by specific cities across Israel (Tel Aviv, Jerusalem, Haifa, Rishon LeZion, etc.) or nationwide online websites.
- 🎯 **Comprehensive Deal & Category Filters**: Filter by campaign tags ("מבצעי חג", "הכי משתלם"), product category chips, maximum price presets (עד 100 ₪, עד 300 ₪, הכל), and sort by discount %, price, or title.
- 🔍 **Rich Details Modals**: Inspect full specifications, multi-variant price options, purchase limits per member, addresses, and official redemption links.
- 🕒 **Independent "Last Scraped" Timestamps**: Every tab displays its own distinct "עודכן לאחרונה" timestamp banner pulled directly from its respective JSON metadata, providing complete transparency on data freshness.
- 🌙 **Dark & Light Themes**: Full dark mode support with automatic system preference detection and local persistence.
- 📥 **Export Ready**: Download complete CSV and JSON datasets directly from the footer.
- 🔒 **Zero External AI Dependencies**: 100% self-contained, lightweight, fast, and hosted directly on GitHub Pages.

---

## 📁 Project Structure

```text
Behatsdaa-site-ai-mesh/
├── index.html                  # Main web application shell with Tri-Tab dashboard
├── styles.css                  # Custom RTL styling, dark theme, and animations
├── app.js                      # Application bootstrap & event orchestration
├── js/                         # Modular application architecture
│   ├── data.js                 # Dynamic data loader & Static API client
│   ├── search.js               # MiniSearch indexing & instant client-side querying
│   ├── stores.js               # Tab 1: Store chains & rechargeable wallets view
│   ├── deals.js                # Tab 2: Rotating deals & consumer vouchers view
│   ├── billing.js              # Tab 3: Statement discounts (10,600+ businesses)
│   ├── state.js                # Central reactive application state
│   └── utils.js                # Normalization & UI utility helpers
├── data/                       # Master raw datasets
│   ├── stores.json             # 980+ participating store chains
│   ├── deals.json              # 1,730+ deals & rotating vouchers
│   └── billing_stores.json     # 10,600+ Be-Plus statement discounts
├── scripts/
│   └── split-data.js           # Static API generator (pre-computes links, splits JSONs & generates CSVs)
├── tests/
│   ├── test_data_integrity.js  # Automated tests for data budget (< 400KB), links & search speed
│   ├── test_ui.js              # Headless UI & DOM integration tests
│   ├── benchmark.js            # Search & rendering performance benchmarks
│   └── test_wallet_fetch_perf.js # Dynamic fetch latency tests
├── extract_behatsdaa_deals.js  # In-browser extractor for authenticated Behatsdaa deals
├── vite.config.js              # Vite bundler & development server configuration
├── package.json                # Project configuration, dependencies & scripts
├── package-lock.json           # Deterministic dependency lockfile for CI/CD
├── .github/workflows/
│   └── deploy.yml              # GitHub Actions automated test & deploy pipeline
└── README.md                   # Documentation and usage guide
```

---

## 💻 Local Development & Build

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/elonuziel/Behatsdaa-site-ai-mesh.git
cd Behatsdaa-site-ai-mesh

# Install dependencies deterministically
npm ci
```

### 3. Development Server
Start the local Vite development server with Hot Module Replacement (HMR):
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
Pre-computes the static API endpoints, splits JSON chunks into `/public/data/`, and builds the optimized bundle with Vite into `/dist/`:
```bash
npm run build
```

To preview the built production site locally:
```bash
npm run preview
```

---

## ⚡ Static API & Data Generation Pipeline

The build process is orchestrated by [`scripts/split-data.js`](scripts/split-data.js):

1. **Loads Master Datasets**: Ingests `/data/stores.json`, `/data/deals.json`, and `/data/billing_stores.json`.
2. **Normalizes Text & Generates Slugs**: Standardizes Hebrew names and ensures unique URL slugs.
3. **Pre-Computes Cross-Links**: Pre-calculates matching stores, active vouchers, and statement discounts into cross-reference IDs.
4. **Lightweight Search Index (`search-index.json`)**: Generates an index containing core metadata under a strict **400KB budget** for instant initial page load.
5. **On-Demand Billing Index (`billing-index.json`)**: Generates the dedicated index for statement discounts search.
6. **Dynamic Detail Files**: Emits individual `/public/data/stores/[slug].json` and `/public/data/deals/[id].json` files loaded dynamically only when a modal is opened.
7. **CSV Exports**: Emits download-ready CSV files for offline analysis.

You can run the data generation script standalone at any time:
```bash
npm run process-data
```

---

## 🧪 Automated Testing & Verification

The project includes an automated test suite verifying data integrity, size budgets, search latency, and UI rendering:

```bash
# Run data integrity, static API budget, and search performance tests:
npm test

# Run UI & DOM integration tests:
node tests/test_ui.js

# Run search & rendering benchmarks:
node tests/benchmark.js

# Run syntax & runtime check across all JS files:
npm run lint
```

### Data Integrity & Performance Test Breakdown:
- **Static API Layout & Budget**: Verifies `search-index.json` is under 400KB and contains all stores and deals.
- **Dynamic Detail Files**: Verifies all 987 stores and 1,737 deals have individual detail files with valid schema.
- **Pre-Computed Cross-Linking**: Validates cross-referencing between stores, deals, and billing discounts.
- **MiniSearch Query Speed**: Verifies average search query latency across 10,600+ items is under 12ms (typically `< 1ms`).
- **Memory Profile**: Ensures heap consumption remains strictly within memory budgets.

---

## 🌐 Automated Deployment (GitHub Pages)

Deployment is automated via GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)):

1. **Trigger**: Every push to the `main` branch.
2. **Environment**: Ubuntu Linux with Node.js 20 and npm cache.
3. **Dependency Installation**: `npm ci` verifies deterministic installs from `package-lock.json`.
4. **Automated Verification**: Runs `npm test` to validate data integrity and search performance benchmarks before building.
5. **Static Bundle Generation**: Executes `npm run build` to generate the Static API and Vite production assets in `dist/`.
6. **GitHub Pages Deployment**: Deploys the built `dist/` folder via `actions/deploy-pages@v4`.

---

## 🛠️ Deal Extraction (`extract_behatsdaa_deals.js`)

To refresh rotating deals from the live Behatsdaa portal:

1. Navigate to [https://www.behatsdaa.org.il/](https://www.behatsdaa.org.il/) in Chrome / Brave / Edge and log in to your account.
2. Open Developer Tools (`F12` $\rightarrow$ **Console**).
3. Paste the contents of [`extract_behatsdaa_deals.js`](extract_behatsdaa_deals.js) and press `Enter`.
4. The extractor crawls all 28+ campaign carousels and 99 sub-categories, then automatically downloads `deals_raw.json`.
5. Update `data/deals.json` with the newly extracted records and run `npm run build` to update the Static API.

---

## 📄 License & Attribution
Created for the benefit of Israeli reserve soldiers (Miluim) and Behatsdaa club beneficiaries. Brand names, logos, and terms are property of [Behatsdaa](https://www.behatsdaa.org.il).
